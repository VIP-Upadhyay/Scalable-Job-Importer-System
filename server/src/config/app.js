const path = require('path');

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/job-importer',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },

  // Queue Configuration
  queue: {
    concurrency: parseInt(process.env.JOB_CONCURRENCY) || 5,
    attempts: parseInt(process.env.JOB_ATTEMPTS) || 3,
    backoffDelay: parseInt(process.env.BACKOFF_DELAY) || 2000,
    removeOnComplete: parseInt(process.env.REMOVE_ON_COMPLETE) || 100,
    removeOnFail: parseInt(process.env.REMOVE_ON_FAIL) || 50
  },

  // Cron Configuration
  cron: {
    importSchedule: process.env.CRON_SCHEDULE || '0 */1 * * *', // Every hour
    enabled: process.env.CRON_ENABLED !== 'false'
  },

  // API Configuration
  api: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE !== 'false',
      path: path.join(__dirname, '../../logs')
    }
  },

  // External APIs Configuration
  externalApis: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    userAgent: 'JobImporter/1.0',
    sources: [
      'https://jobicy.com/?feed=job_feed',
      'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
      'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
      'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
      'https://jobicy.com/?feed=job_feed&job_categories=data-science',
      'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
      'https://jobicy.com/?feed=job_feed&job_categories=business',
      'https://jobicy.com/?feed=job_feed&job_categories=management',
      'https://www.higheredjobs.com/rss/articleFeed.cfm'
    ]
  },

  // Security Configuration
  security: {
    helmet: {
      contentSecurityPolicy: false, // Disable for development
      crossOriginEmbedderPolicy: false
    },
    bcryptRounds: 12
  }
};

// Environment-specific overrides
if (config.server.env === 'production') {
  config.logging.level = 'warn';
  config.security.helmet.contentSecurityPolicy = true;
  config.security.helmet.crossOriginEmbedderPolicy = true;
}

if (config.server.env === 'test') {
  config.database.uri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/job-importer-test';
  config.logging.level = 'error';
  config.cron.enabled = false;
}

module.exports = config;