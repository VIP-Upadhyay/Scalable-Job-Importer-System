const { Worker } = require('bullmq');
const Redis = require('ioredis');
const ApiFetcherService = require('../services/ApiFetcherService');
const JobImportService = require('../services/JobImportService');
const logger = require('../utils/logger');

class JobWorker {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.worker = new Worker('job-import', this.processJob.bind(this), {
      connection: this.redis,
      concurrency: parseInt(process.env.JOB_CONCURRENCY) || 5
    });

    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
    });
  }

  async processJob(job) {
    const { sourceUrl, logId } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing job import for: ${sourceUrl}`);

      // Fetch jobs from API
      const jobs = await ApiFetcherService.fetchJobsFromUrl(sourceUrl);

      if (jobs.length === 0) {
        logger.warn(`No jobs found from ${sourceUrl}`);
        
        // Update import log with warning but don't fail
        const exp = await JobImportService.updateImportLog(logId, {
          totalFetched: 0,
          totalImported: 0,
          newJobs: 0,
          updatedJobs: 0,
          failedJobs: 0,
          errorDetails: [{
            message: 'No jobs found in feed',
            timestamp: new Date()
          }],
          processingTime: Date.now() - startTime
        }, 'completed');

        console.log(" \n\n\n\nerror  ",exp);
        return { success: true, stats: { message: 'No jobs found' } };
      }
      
      // Import jobs into database
      const stats = await JobImportService.importJobs(jobs, sourceUrl, logId);
      
      // Update import log
      const processingTime = Date.now() - startTime;
      await JobImportService.updateImportLog(logId, {
        ...stats,
        processingTime
      }, 'completed');

      return { success: true, stats };

    } catch (error) {
      logger.error(`Job processing failed for ${sourceUrl}:`, error);
      
      // Update import log with error
      const exp = await JobImportService.updateImportLog(logId, {
        errorDetails: [{ message: error.message, timestamp: new Date() }],  
        processingTime: Date.now() - startTime
      }, 'failed');

      // console.log(" \n\n\n\nerror  ",exp);

      return { success: false, error: error.message };
    }
  }

  async stop() {
    await this.worker.close();
  }
}

module.exports = JobWorker;