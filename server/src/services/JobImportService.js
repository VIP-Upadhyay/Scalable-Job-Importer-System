const Job = require('../models/Job');
const ImportLog = require('../models/ImportLog');
const logger = require('../utils/logger');

class JobImportService {
  async importJobs(jobs, sourceUrl, logId) {
    const stats = {
      totalFetched: jobs.length,
      totalImported: 0,
      newJobs: 0,
      updatedJobs: 0,
      failedJobs: 0,
      errorDetails: []
    };

    logger.info(`Starting import of ${jobs.length} jobs from ${sourceUrl}`);

    const importLog = await ImportLog.findById(logId);
    
    for (let i = 0; i < jobs.length; i++) {
      const jobData = jobs[i];
      
      try {
        // Log each job being processed
        logger.info(`Processing job ${i + 1}/${jobs.length}: "${jobData.title}" by "${jobData.company}"`);
        
        // Additional validation before database operation
        if (!this.validateJobData(jobData)) {
          throw new Error('Job data validation failed');
        }

        const existingJob = await Job.findOne({
          externalId: jobData.externalId,
          source: jobData.source
        });

        if (existingJob) {
          // Update existing job
          Object.assign(existingJob, jobData);
          await existingJob.save();
          stats.updatedJobs++;
          logger.info(`Updated existing job: "${jobData.title}"`);
        } else {
          // Create new job
          const newJob = await Job.create(jobData);
          stats.newJobs++;
          logger.info(`Created new job: "${jobData.title}" (ID: ${newJob._id})`);
        }
        
        stats.totalImported++;
        
        // Update progress in real-time every 5 jobs
        if ((i + 1) % 5 === 0 && importLog) {
          importLog.totalImported = stats.totalImported;
          importLog.newJobs = stats.newJobs;
          importLog.updatedJobs = stats.updatedJobs;
          importLog.failedJobs = stats.failedJobs;
          await importLog.save();
          logger.info(`Progress update: ${stats.totalImported}/${jobs.length} processed`);
        }
        console.log("\n\n\n[Completed]\n\n\n");
      } catch (error) {

        console.log("\n\n\n[Error]\n\n\n");
        stats.failedJobs++;
        
        const errorDetail = {
          message: error.message,
          jobData: {
            externalId: jobData.externalId || 'missing',
            title: jobData.title || 'missing',
            company: jobData.company || 'missing',
            source: jobData.source || 'missing',
            index: i + 1
          },
          timestamp: new Date()
        };
        
        stats.errorDetails.push(errorDetail);
        
        logger.error(`Failed to import job ${i + 1}:`, {
          error: error.message,
          jobTitle: jobData.title || 'No title',
          jobCompany: jobData.company || 'No company',
          externalId: jobData.externalId || 'No ID',
          validationErrors: this.getValidationErrors(jobData),
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }

    // Final update to import log
    if (importLog) {
      importLog.totalImported = stats.totalImported;
      importLog.newJobs = stats.newJobs;
      importLog.updatedJobs = stats.updatedJobs;
      importLog.failedJobs = stats.failedJobs;
      if (stats.errorDetails.length > 0) {
        importLog.errorDetails = stats.errorDetails.slice(0, 10); // Store max 10 errors
      }
      await importLog.save();
    }

    logger.info(`Import completed for ${sourceUrl}:`, {
      totalFetched: stats.totalFetched,
      totalImported: stats.totalImported,
      newJobs: stats.newJobs,
      updatedJobs: stats.updatedJobs,
      failedJobs: stats.failedJobs,
      successRate: `${((stats.totalImported / stats.totalFetched) * 100).toFixed(1)}%`
    });

    return stats;
  }

  validateJobData(jobData) {
    const errors = this.getValidationErrors(jobData);
    return errors.length === 0;
  }

  getValidationErrors(jobData) {
    const errors = [];
    
    if (!jobData.externalId || jobData.externalId.trim() === '') {
      errors.push('Missing externalId');
    }
    
    if (!jobData.title || jobData.title.trim() === '') {
      errors.push('Missing title');
    }
    
    if (!jobData.company || jobData.company.trim() === '') {
      errors.push('Missing company');
    }
    
    if (!jobData.source || jobData.source.trim() === '') {
      errors.push('Missing source');
    }
    
    // Check string lengths
    if (jobData.title && jobData.title.length > 200) {
      errors.push('Title too long (max 200 characters)');
    }
    
    if (jobData.company && jobData.company.length > 100) {
      errors.push('Company name too long (max 100 characters)');
    }
    
    return errors;
  }

  async createImportLog(sourceUrl) {
    logger.info(`Creating import log for: ${sourceUrl}`);
    return await ImportLog.create({
      fileName: sourceUrl,
      source: this.extractSourceName(sourceUrl),
      status: 'in_progress'
    });
  }

  async updateImportLog(logId, stats, status = 'completed') {
    logger.info(`Updating import log ${logId} with status: ${status}`);
    
    const updateData = {
      ...stats,
      status,
      processingTime: Date.now() - new Date().getTime()
    };
    
    return await ImportLog.findByIdAndUpdate(logId, updateData, { new: true });
  }

  extractSourceName(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
}

module.exports = new JobImportService();