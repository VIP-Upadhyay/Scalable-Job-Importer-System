const QueueService = require('../services/QueueService');
const logger = require('../utils/logger');

class QueueController {
  // Get queue statistics
  async getQueueStats(req, res) {
    try {
      const stats = await QueueService.getQueueStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getQueueStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get detailed queue information
  async getQueueInfo(req, res) {
    try {
      const stats = await QueueService.getQueueStats();
      const health = await QueueService.getQueueHealth();
      
      res.json({
        success: true,
        data: {
          stats,
          health,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in getQueueInfo:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Clear the queue
  async clearQueue(req, res) {
    try {
      await QueueService.clearQueue();
      
      logger.info('Queue cleared manually via API');
      
      res.json({
        success: true,
        data: {
          message: 'Queue cleared successfully'
        }
      });

    } catch (error) {
      logger.error('Error in clearQueue:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get job details by ID
  async getJobDetails(req, res) {
    try {
      const { jobId } = req.params;
      
      const job = await QueueService.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: job.id,
          name: job.name,
          data: job.data,
          opts: job.opts,
          progress: job.progress,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade
        }
      });

    } catch (error) {
      logger.error('Error in getJobDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Retry failed jobs
  async retryFailedJobs(req, res) {
    try {
      const count = await QueueService.retryFailedJobs();
      
      logger.info(`Retried ${count} failed jobs`);
      
      res.json({
        success: true,
        data: {
          message: `Retried ${count} failed jobs`,
          count
        }
      });

    } catch (error) {
      logger.error('Error in retryFailedJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Pause the queue
  async pauseQueue(req, res) {
    try {
      await QueueService.pauseQueue();
      
      logger.info('Queue paused manually via API');
      
      res.json({
        success: true,
        data: {
          message: 'Queue paused successfully'
        }
      });

    } catch (error) {
      logger.error('Error in pauseQueue:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Resume the queue
  async resumeQueue(req, res) {
    try {
      await QueueService.resumeQueue();
      
      logger.info('Queue resumed manually via API');
      
      res.json({
        success: true,
        data: {
          message: 'Queue resumed successfully'
        }
      });

    } catch (error) {
      logger.error('Error in resumeQueue:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new QueueController();