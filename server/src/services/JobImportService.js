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
      errors: []
    };

    const importLog = await ImportLog.findById(logId);
    
    for (const jobData of jobs) {
      try {
        const existingJob = await Job.findOne({
          externalId: jobData.externalId,
          source: jobData.source
        });

        if (existingJob) {
          // Update existing job
          Object.assign(existingJob, jobData);
          await existingJob.save();
          stats.updatedJobs++;
        } else {
          // Create new job
          await Job.create(jobData);
          stats.newJobs++;
        }
        
        stats.totalImported++;
        
        // Update progress in real-time
        if (importLog) {
          importLog.totalImported = stats.totalImported;
          importLog.newJobs = stats.newJobs;
          importLog.updatedJobs = stats.updatedJobs;
          await importLog.save();
        }

      } catch (error) {
        stats.failedJobs++;
        stats.errors.push({
          message: error.message,
          data: jobData,
          timestamp: new Date()
        });
        logger.error(`Failed to import job ${jobData.externalId}:`, error.message);
      }
    }

    return stats;
  }

  async createImportLog(sourceUrl) {
    return await ImportLog.create({
      fileName: sourceUrl,
      source: this.extractSourceName(sourceUrl),
      status: 'in_progress'
    });
  }

  async updateImportLog(logId, stats, status = 'completed') {
    return await ImportLog.findByIdAndUpdate(logId, {
      ...stats,
      status,
      processingTime: Date.now() - new Date().getTime()
    }, { new: true });
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