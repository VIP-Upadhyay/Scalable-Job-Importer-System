const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

class ApiFetcherService {
  constructor() {
    this.apiUrls = [
      'https://jobicy.com/?feed=job_feed',
      'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
      'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
      'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
      'https://jobicy.com/?feed=job_feed&job_categories=data-science',
      'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
      'https://jobicy.com/?feed=job_feed&job_categories=business',
      'https://jobicy.com/?feed=job_feed&job_categories=management',
      'https://www.higheredjobs.com/rss/articleFeed.cfm'
    ];
  }

  async fetchJobsFromUrl(url) {
    try {
      logger.info(`Fetching jobs from: ${url}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobImporter/1.0)'
        }
      });

      logger.info(`Received ${response.data.length} characters of XML data`);

      const parser = new xml2js.Parser({ 
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
        explicitCharkey: false,
        trim: true,
        normalize: true
      });

      const result = await parser.parseStringPromise(response.data);
      const jobs = this.normalizeJobData(result, url);
      
      logger.info(`Successfully parsed and normalized ${jobs.length} jobs from ${url}`);
      return jobs;
      
    } catch (error) {
      logger.error(`Error fetching from ${url}:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status
      });
      throw error;
    }
  }

  normalizeJobData(xmlData, sourceUrl) {
    const jobs = [];
    
    try {
      // Extract items from RSS structure
      let items = [];
      
      if (xmlData.rss && xmlData.rss.channel && xmlData.rss.channel.item) {
        items = Array.isArray(xmlData.rss.channel.item) 
          ? xmlData.rss.channel.item 
          : [xmlData.rss.channel.item];
      }

      logger.info(`Found ${items.length} items in XML feed`);

      items.forEach((item, index) => {
        try {
          // Extract and clean data
          const job = {
            externalId: this.extractExternalId(item, sourceUrl, index),
            title: this.extractTitle(item),
            company: this.extractCompany(item),
            location: this.extractLocation(item),
            description: this.extractDescription(item),
            jobType: this.extractJobType(item),
            category: this.extractCategory(sourceUrl),
            salary: this.extractSalary(item),
            url: this.extractUrl(item, sourceUrl),
            publishedDate: this.extractPublishedDate(item),
            source: this.extractSourceName(sourceUrl),
            sourceUrl: sourceUrl
          };

          // Validate required fields before adding
          if (this.validateJob(job)) {
            jobs.push(job);
            
            if (index < 2) { // Log first 2 jobs for debugging
              logger.info(`Sample job ${index + 1}:`, {
                externalId: job.externalId,
                title: job.title,
                company: job.company,
                source: job.source,
                location: job.location,
                jobType: job.jobType
              });
            }
          } else {
            logger.warn(`Skipping invalid job ${index + 1}: Missing required fields`, {
              externalId: job.externalId || 'MISSING',
              title: job.title || 'MISSING',
              company: job.company || 'MISSING',
              source: job.source || 'MISSING'
            });
          }
        } catch (itemError) {
          logger.warn(`Error processing item ${index + 1} from ${sourceUrl}:`, itemError.message);
        }
      });
    } catch (error) {
      logger.error(`Error normalizing data from ${sourceUrl}:`, error.message);
    }

    logger.info(`Successfully normalized ${jobs.length} valid jobs from ${sourceUrl}`);
    return jobs;
  }

  // Enhanced data extraction methods
  extractExternalId(item, sourceUrl, index) {
    // Try multiple sources for external ID
    const id = item.id || 
               item.guid || 
               this.extractIdFromUrl(item.link) ||
               `${this.extractSourceName(sourceUrl)}-${Date.now()}-${index}`;
    
    return String(id).trim();
  }

  extractIdFromUrl(url) {
    if (!url) return null;
    // Extract ID from URL like: https://jobicy.com/jobs/120487-senior-community-manager
    const match = url.match(/\/(\d+)-/);
    return match ? match[1] : null;
  }

  extractTitle(item) {
    let title = item.title || 'Untitled Position';
    
    // Clean up HTML entities and extra characters
    if (typeof title === 'string') {
      title = title
        .replace(/&#8211;/g, '–')  // Replace HTML entity for en dash
        .replace(/&#038;/g, '&')   // Replace HTML entity for ampersand
        .replace(/&#8217;/g, "'")  // Replace HTML entity for apostrophe
        .replace(/&#124;/g, '|')   // Replace HTML entity for pipe
        .trim();
    }
    
    return title;
  }

  extractCompany(item) {
    // Handle the job_listing:company field properly
    const company = item['job_listing:company'] || 
                   item.company || 
                   item['dc:creator'] || 
                   item.author ||
                   'Unknown Company';
    
    return String(company).trim();
  }

  extractLocation(item) {
    // Handle the job_listing:location field properly
    const location = item['job_listing:location'] || 
                    item.location || 
                    item['job:location'] ||
                    item.region ||
                    '';
    
    return String(location).trim();
  }

  extractDescription(item) {
    let description = item.description || 
                     item.summary || 
                     item['content:encoded'] ||
                     item.content ||
                     '';
    
    // Clean HTML tags and CDATA if present
    if (typeof description === 'string') {
      description = description
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')  // Remove CDATA wrapper
        .replace(/<[^>]*>/g, '')                   // Remove HTML tags
        .replace(/&[#\w]+;/g, ' ')                // Remove HTML entities
        .trim();
      
      // Limit description length
      if (description.length > 1000) {
        description = description.substring(0, 1000) + '...';
      }
    }
    
    return description;
  }

  extractJobType(item) {
    // Handle the job_listing:job_type field properly
    let jobType = item['job_listing:job_type'] || 
                 item['job:type'] || 
                 item.type || 
                 item['job:employment_type'] ||
                 'Full Time';
    
    // Normalize job type values
    if (typeof jobType === 'string') {
      jobType = jobType.toLowerCase().trim();
      
      // Map common variations
      const jobTypeMap = {
        'full time': 'full-time',
        'fulltime': 'full-time',
        'part time': 'part-time',
        'parttime': 'part-time',
        'contract': 'contract',
        'freelance': 'freelance',
        'internship': 'internship',
        'temporary': 'temporary'
      };
      
      jobType = jobTypeMap[jobType] || jobType;
    }
    
    return jobType;
  }

  extractCategory(sourceUrl) {
    // Extract category from URL parameters
    try {
      const url = new URL(sourceUrl);
      const categories = url.searchParams.get('job_categories');
      return categories || 'general';
    } catch {
      return 'general';
    }
  }

  extractSalary(item) {
    return item['job:salary'] || 
           item.salary || 
           item['job:compensation'] ||
           '';
  }

  extractUrl(item, sourceUrl) {
    return item.link || 
           item.url || 
           item.guid ||
           sourceUrl;
  }

  extractPublishedDate(item) {
    const dateStr = item.pubDate || 
                   item.published || 
                   item['dc:date'] ||
                   item.date;
    
    if (dateStr) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    return new Date();
  }

  extractSourceName(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  // Validate job data before saving
  validateJob(job) {
    const required = ['externalId', 'title', 'company', 'source'];
    const missing = required.filter(field => !job[field] || job[field].trim() === '');
    
    if (missing.length > 0) {
      logger.warn(`Job validation failed. Missing fields: ${missing.join(', ')}`);
      return false;
    }
    
    // Additional validation
    if (job.title.length < 3) {
      logger.warn('Job validation failed: Title too short');
      return false;
    }
    
    if (job.company.length < 2) {
      logger.warn('Job validation failed: Company name too short');
      return false;
    }
    
    return true;
  }

  async fetchAllJobs() {
    const allJobs = [];
    const errors = [];

    for (const url of this.apiUrls) {
      try {
        const jobs = await this.fetchJobsFromUrl(url);
        allJobs.push(...jobs);
        logger.info(`Successfully fetched ${jobs.length} jobs from ${url}`);
      } catch (error) {
        errors.push({ url, error: error.message });
        logger.error(`Failed to fetch from ${url}:`, error.message);
      }
    }

    logger.info(`Total jobs fetched: ${allJobs.length}, Errors: ${errors.length}`);
    return { jobs: allJobs, errors };
  }
}

module.exports = new ApiFetcherService();