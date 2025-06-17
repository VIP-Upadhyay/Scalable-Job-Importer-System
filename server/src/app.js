require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');

// Import utilities and middleware
const config = require('./config/app');
const Database = require('./config/database');
const redisConfig = require('./config/redis');
const logger = require('./utils/logger');
const { globalErrorHandler, handleUnhandledRejections, handleUncaughtExceptions } = require('./utils/errorHandler');

// Import workers and services
const JobWorker = require('./workers/JobWorker');
const QueueService = require('./services/QueueService');
const JobImportService = require('./services/JobImportService');

// // Import routes
const jobRoutes = require('./routes/jobRoutes');
const importRoutes = require('./routes/importRoutes');
const queueRoutes = require('./routes/queueRoutes');
const healthRoutes = require('./routes/healthRoutes');
console.log("here o ");
class App {
  
  constructor() {
    try {
      this.app = express();
      this.port = config.server.port;
      this.worker = null;
      this.cronJobs = [];

      handleUnhandledRejections();
      handleUncaughtExceptions();

      this.initializeMiddlewares();
      this.initializeRoutes();
      this.connectDatabases();
      this.setupCronJobs();
      this.setupErrorHandling();
    } catch (err) {
      console.error('Constructor crashed:', err);
      process.exit(1);
    }
  }

  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet(config.security.helmet));
    
    // CORS
    this.app.use(cors({ 
      origin: config.api.corsOrigin,
      credentials: true
    }));
    
    // Logging middleware
    if (config.server.env !== 'test') {
      this.app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) }
      }));
    }
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Custom request logging
    this.app.use(logger.logRequest);
  }

  initializeRoutes() {
    // API routes
    this.app.use('/api/v1/jobs', jobRoutes);
    this.app.use('/api/v1/imports', importRoutes);
    this.app.use('/api/v1/queue', queueRoutes);
    this.app.use('/health', healthRoutes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Job Importer API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        // documentation: '/api/v1/docs'
      });
    });

    // 404 handler
    this.app.all('*', (req, res) => {
      console.log("here i am...........");
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  async connectDatabases() {
    try {
      // Connect to MongoDB
      await Database.connect();
      
      // Connect to Redis
      await redisConfig.connect();
      
      logger.info('All database connections established');
    } catch (error) {
      logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  setupCronJobs() {
    if (!config.cron.enabled) {
      logger.info('Cron jobs disabled');
      return;
    }

    // Main import job
    const importJob = cron.schedule(config.cron.importSchedule, async () => {
      logger.info('Starting scheduled job import...');
      await this.triggerScheduledImport();
    }, { scheduled: false });

    // Cleanup job (runs daily at midnight)
    const cleanupJob = cron.schedule('0 0 * * *', async () => {
      logger.info('Starting scheduled cleanup...');
      await this.performCleanup();
    }, { scheduled: false });

    // Start cron jobs
    importJob.start();
    cleanupJob.start();

    this.cronJobs.push(importJob, cleanupJob);
    logger.info('Cron jobs scheduled and started');
  }

  async triggerScheduledImport() {
    try {
      const urls = config.externalApis.sources;
      
      for (const url of urls) {
        try {
          const importLog = await JobImportService.createImportLog(url);
          await QueueService.addJobImportTask({
            sourceUrl: url,
            logId: importLog._id,
            priority: 0 // Normal priority for scheduled imports
          });
        } catch (error) {
          logger.error(`Failed to queue scheduled import for ${url}:`, error);
        }
      }

      logger.info(`📝 Queued ${urls.length} scheduled import jobs`);
    } catch (error) {
      logger.error('Scheduled import failed:', error);
    }
  }

  async performCleanup() {
    try {
      // Clean up old import logs (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const ImportLog = require('./models/ImportLog');
      const deleteResult = await ImportLog.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        status: { $ne: 'in_progress' }
      });

      logger.info(`Cleanup completed: removed ${deleteResult.deletedCount} old import logs`);
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use(globalErrorHandler);
  }

  async start() {
    try {
      // Start worker
      this.worker = new JobWorker();
      logger.info('Worker process started');
      
      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Server running on port ${this.port} in ${config.server.env} mode`);
        // logger.info(`API Documentation available at http://localhost:${this.port}/api/v1/docs`);
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new requests
        this.server.close(async () => {
          logger.info('HTTP server closed');
          
          // Stop cron jobs
          this.cronJobs.forEach(job => job.stop());
          logger.info('Cron jobs stopped');
          
          // Stop worker
          if (this.worker) {
            await this.worker.stop();
            logger.info('Worker stopped');
          }
          
          // Close database connections
          await Database.disconnect();
          await redisConfig.disconnect();
          logger.info('🔌 Database connections closed');
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
        
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// // Start the application only if this file is run directly
if (require.main === module) {
  // console.log("main");
  const app = new App();
  app.start();
}else{
  // console.log("not main")
}
// console.log("hello world");
// module.exports = App;