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

      // Try to clean/fix common XML issues before parsing
      let cleanedXML = this.cleanXMLData(response.data);
      
      const parser = new xml2js.Parser({ 
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
        explicitCharkey: false,
        trim: true,
        normalize: true,
        // More lenient parsing options
        strict: false,           // Allow malformed XML
        sanitize: true,          // Sanitize input
        normalize: true,         // Normalize whitespace
        normalizeTags: false,    // Don't change tag case
        attrkey: '$',           // Attribute key
        charkey: '_'            // Character key
      });

      const result = await parser.parseStringPromise(cleanedXML);
      const jobs = this.normalizeJobData(result, url);
      
      logger.info(`Successfully parsed and normalized ${jobs.length} jobs from ${url}`);
      return jobs;
      
    } catch (error) {
      logger.error(`Error fetching from ${url}:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        lineNumber: error.line,
        columnNumber: error.column,
        character: error.char
      });
      
      // If it's an XML parsing error, try alternative parsing
      if (error.message.includes('Attribute without value') || error.message.includes('XML')) {
        logger.info(`Attempting alternative XML parsing for ${url}...`);
        return this.attemptAlternativeXMLParsing(url);
      }
      
      throw error;
    }
  }

  // Clean XML data to fix common issues
  cleanXMLData(xmlData) {
    return xmlData
      // Fix attributes without values (common issue)
      .replace(/(\w+)=>\s*/g, '$1=""')
      .replace(/(\w+)=\s*>/g, '$1="">')
      // Fix unclosed tags
      .replace(/<(\w+)([^>]*?)(?<!\/|\s)>/g, '<$1$2/>')
      // Remove invalid characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Fix common encoding issues
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
      .trim();
  }

  // Alternative parsing method for problematic feeds
  async attemptAlternativeXMLParsing(url) {
    try {
      // Try fetching again with different approach
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobImporter/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      // More aggressive XML cleaning
      let cleanedXML = response.data
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;')          // Fix unescaped ampersands
        .replace(/attribute\s*=\s*>/gi, 'attribute="">')    // Fix empty attributes
        .replace(/<([^>]+)(?<!\/)\s*>/g, '<$1/>');         // Self-close empty tags

      // Try with even more lenient parser
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: true,        // Ignore problematic attributes
        strict: false,
        sanitize: true,
        normalize: true,
        trim: true
      });

      const result = await parser.parseStringPromise(cleanedXML);
      const jobs = this.normalizeJobData(result, url);
      
      logger.info(`✅ Alternative parsing successful: ${jobs.length} jobs extracted`);
      return jobs;
      
    } catch (alternativeError) {
      logger.error(`❌ Alternative parsing also failed for ${url}:`, alternativeError.message);
      
      // Return empty array instead of throwing error
      return [];
    }
  }

  // Rest of your existing methods...
  normalizeJobData(xmlData, sourceUrl) {
    // Your existing implementation
    const jobs = [];
    
    try {
      let items = [];
      
      if (xmlData.rss && xmlData.rss.channel && xmlData.rss.channel.item) {
        items = Array.isArray(xmlData.rss.channel.item) 
          ? xmlData.rss.channel.item 
          : [xmlData.rss.channel.item];
      }

      logger.info(`Found ${items.length} items in XML feed`);

      items.forEach((item, index) => {
        try {
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

          if (this.validateJob(job)) {
            jobs.push(job);
          }
        } catch (itemError) {
          logger.warn(`Error processing item ${index + 1}:`, itemError.message);
        }
      });
    } catch (error) {
      logger.error(`Error normalizing data:`, error.message);
    }

    return jobs;
  }

  // Your existing extraction methods...
  extractExternalId(item, sourceUrl, index) {
    const id = item.id || 
               item.guid || 
               this.extractIdFromUrl(item.link) ||
               `${this.extractSourceName(sourceUrl)}-${Date.now()}-${index}`;
    return String(id).trim();
  }

  extractTitle(item) {
    let title = item.title || 'Untitled Position';
    if (typeof title === 'string') {
      title = title
        .replace(/&#8211;/g, '–')
        .replace(/&#038;/g, '&')
        .replace(/&#8217;/g, "'")
        .trim();
    }
    return title;
  }

  extractCompany(item) {
    const company = item['job_listing:company'] || 
                   item.company || 
                   item['dc:creator'] || 
                   item.author ||
                   'Unknown Company';
    return String(company).trim();
  }

  extractLocation(item) {
    const location = item['job_listing:location'] || 
                    item.location || 
                    item['job:location'] ||
                    '';
    return String(location).trim();
  }

  extractDescription(item) {
    let description = item.description || 
                     item.summary || 
                     item['content:encoded'] ||
                     '';
    
    if (typeof description === 'string') {
      description = description
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
        .replace(/<[^>]*>/g, '')
        .replace(/&[#\w]+;/g, ' ')
        .trim();
      
      if (description.length > 1000) {
        description = description.substring(0, 1000) + '...';
      }
    }
    
    return description;
  }

  extractJobType(item) {
    let jobType = item['job_listing:job_type'] || 
                 item['job:type'] || 
                 item.type ||
                 'Full Time';
    
    if (typeof jobType === 'string') {
      jobType = jobType.toLowerCase().trim();
      const jobTypeMap = {
        'full time': 'full-time',
        'fulltime': 'full-time',
        'part time': 'part-time',
        'parttime': 'part-time'
      };
      jobType = jobTypeMap[jobType] || jobType;
    }
    
    return jobType;
  }

  extractCategory(sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const categories = url.searchParams.get('job_categories');
      return categories || 'general';
    } catch {
      return 'general';
    }
  }

  extractSalary(item) {
    return item['job:salary'] || item.salary || '';
  }

  extractUrl(item, sourceUrl) {
    return item.link || item.url || item.guid || sourceUrl;
  }

  extractPublishedDate(item) {
    const dateStr = item.pubDate || item.published || item['dc:date'];
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

  validateJob(job) {
    const required = ['externalId', 'title', 'company', 'source'];
    const missing = required.filter(field => !job[field] || job[field].trim() === '');
    return missing.length === 0;
  }
}

module.exports = new ApiFetcherService();