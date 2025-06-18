const ImportLog = require('../models/ImportLog');
const QueueService = require('../services/QueueService');
const JobImportService = require('../services/JobImportService');
const config = require('../config/app');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class ImportController {
  // Get import history with pagination
  async getImportHistory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        page = 1,
        limit = 10,
        status,
        source,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter
      const filter = {};
      if (status) filter.status = status;
      if (source) filter.source = source;

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const logs = await ImportLog.find(filter)
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await ImportLog.countDocuments(filter);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error in getImportHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get import log by ID
  async getImportLogById(req, res) {
    try {
      const { id } = req.params;
      
      const log = await ImportLog.findById(id);
      
      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Import log not found'
        });
      }

      res.json({
        success: true,
        data: log
      });

    } catch (error) {
      logger.error('Error in getImportLogById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Trigger manual import
  async triggerImport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let { urls } = req.body;
      console.log("url",urls);
      // If no URLs provided, use default ones
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        urls = config.externalApis.sources;
      }

      // Validate URLs
      const validUrls = urls.filter(url => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

      if (validUrls.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid URLs provided'
        });
      }

      const jobIds = [];
      const importLogs = [];

      // Create import logs and queue jobs
      for (const url of validUrls) {
        try {
          const importLog = await JobImportService.createImportLog(url);
          importLogs.push(importLog);
          console.log("imported logs", importLog);
          const job = await QueueService.addJobImportTask({
            sourceUrl: url,
            logId: importLog._id,
            priority: 1 // Higher priority for manual imports
          });

          jobIds.push(job.id);
        } catch (error) {
          logger.error(`Failed to queue import for ${url}:`, error);
        }
      }

      res.json({
        success: true,
        data: {
          message: `Queued ${jobIds.length} import jobs`,
          jobIds,
          importLogIds: importLogs.map(log => log._id),
          urls: validUrls
        }
      });

    } catch (error) {
      logger.error('Error in triggerImport:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get import statistics
  async getImportStats(req, res) {
    try {
      const stats = await ImportLog.aggregate([
        {
          $group: {
            _id: null,
            totalImports: { $sum: 1 },
            successfulImports: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failedImports: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            totalJobsImported: { $sum: '$totalImported' },
            totalNewJobs: { $sum: '$newJobs' },
            totalUpdatedJobs: { $sum: '$updatedJobs' },
            totalFailedJobs: { $sum: '$failedJobs' },
            avgProcessingTime: { $avg: '$processingTime' }
          }
        }
      ]);

      // Get recent import activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivity = await ImportLog.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 },
            totalJobs: { $sum: '$totalImported' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get stats by source
      const sourceStats = await ImportLog.aggregate([
        {
          $group: {
            _id: '$source',
            importCount: { $sum: 1 },
            totalJobs: { $sum: '$totalImported' },
            successRate: {
              $avg: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            },
            avgProcessingTime: { $avg: '$processingTime' }
          }
        },
        { $sort: { totalJobs: -1 } }
      ]);

      const result = stats[0] || {
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        totalJobsImported: 0,
        totalNewJobs: 0,
        totalUpdatedJobs: 0,
        totalFailedJobs: 0,
        avgProcessingTime: 0
      };

      res.json({
        success: true,
        data: {
          overall: result,
          recentActivity,
          sourceStats
        }
      });

    } catch (error) {
      logger.error('Error in getImportStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Delete import log
  async deleteImportLog(req, res) {
    try {
      const { id } = req.params;
      
      const log = await ImportLog.findByIdAndDelete(id);
      
      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Import log not found'
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Import log deleted successfully',
          deletedLog: log
        }
      });

    } catch (error) {
      logger.error('Error in deleteImportLog:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new ImportController();