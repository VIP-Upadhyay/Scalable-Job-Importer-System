const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
  }

  createConnection(options = {}) {
    const defaultOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      ...options
    };

    // If REDIS_URL is provided, use it (for services like Heroku, Render)
    if (process.env.REDIS_URL) {
      return new Redis(process.env.REDIS_URL, defaultOptions);
    }

    return new Redis(defaultOptions);
  }

  async connect() {
    try {
      // Main Redis client
      this.client = this.createConnection();
      
      // Publisher and Subscriber for pub/sub operations
      this.publisher = this.createConnection();
      this.subscriber = this.createConnection();

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      // Set up event listeners
      this.setupEventListeners();

      logger.info('Connected to Redis successfully');
      return { client: this.client, publisher: this.publisher, subscriber: this.subscriber };
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  setupEventListeners() {
    const clients = [this.client, this.publisher, this.subscriber];
    
    clients.forEach((client, index) => {
      const clientName = ['main', 'publisher', 'subscriber'][index];
      
      client.on('connect', () => {
        logger.info(`Redis ${clientName} client connected`);
      });

      client.on('error', (error) => {
        logger.error(`Redis ${clientName} client error:`, error);
      });

      client.on('close', () => {
        logger.warn(`Redis ${clientName} client connection closed`);
      });

      client.on('reconnecting', () => {
        logger.info(`Redis ${clientName} client reconnecting...`);
      });
    });
  }

  async disconnect() {
    try {
      if (this.client) await this.client.disconnect();
      if (this.publisher) await this.publisher.disconnect();
      if (this.subscriber) await this.subscriber.disconnect();
      
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  async getConnectionStatus() {
    return {
      main: this.client?.status || 'disconnected',
      publisher: this.publisher?.status || 'disconnected',
      subscriber: this.subscriber?.status || 'disconnected'
    };
  }

  // Health check method
  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }
}

module.exports = new RedisConfig();