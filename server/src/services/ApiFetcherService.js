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

      const parser = new xml2js.Parser({ 
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      });

      const result = await parser.parseStringPromise(response.data);
      return this.normalizeJobData(result, url);
    } catch (error) {
      logger.error(`Error fetching from ${url}:`, error.message);
      throw error;
    }
  }

  normalizeJobData(xmlData, sourceUrl) {
    const jobs = [];
    
    try {
      // Handle different RSS structures
      let items = [];
      
      if (xmlData.rss && xmlData.rss.channel && xmlData.rss.channel.item) {
        items = Array.isArray(xmlData.rss.channel.item) 
          ? xmlData.rss.channel.item 
          : [xmlData.rss.channel.item];
      } else if (xmlData.feed && xmlData.feed.entry) {
        items = Array.isArray(xmlData.feed.entry) 
          ? xmlData.feed.entry 
          : [xmlData.feed.entry];
      }

      items.forEach((item, index) => {
        try {
          const job = {
            externalId: item.guid || item.id || `${sourceUrl}-${index}`,
            title: item.title || 'No Title',
            company: item['job:company'] || item.company || 'Unknown Company',
            location: item['job:location'] || item.location || '',
            description: item.description || item.summary || '',
            jobType: item['job:type'] || item.type || 'full-time',
            category: item['job:category'] || item.category || '',
            salary: item['job:salary'] || item.salary || '',
            url: item.link || item.url || sourceUrl,
            publishedDate: item.pubDate || item.published || new Date(),
            source: this.extractSourceName(sourceUrl),
            sourceUrl: sourceUrl
          };

          jobs.push(job);
        } catch (itemError) {
          logger.warn(`Error processing item ${index} from ${sourceUrl}:`, itemError.message);
        }
      });
    } catch (error) {
      logger.error(`Error normalizing data from ${sourceUrl}:`, error.message);
    }

    return jobs;
  }

  extractSourceName(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  async fetchAllJobs() {
    const allJobs = [];
    const errors = [];

    for (const url of this.apiUrls) {
      try {
        const jobs = await this.fetchJobsFromUrl(url);
        allJobs.push(...jobs);
        logger.info(`Fetched ${jobs.length} jobs from ${url}`);
      } catch (error) {
        errors.push({ url, error: error.message });
        logger.error(`Failed to fetch from ${url}:`, error.message);
      }
    }

    return { jobs: allJobs, errors };
  }
}

module.exports = new ApiFetcherService();