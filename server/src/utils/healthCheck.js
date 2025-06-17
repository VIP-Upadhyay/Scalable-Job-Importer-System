const mongoose = require('mongoose');
const redisConfig = require('../config/redis');
const logger = require('./logger');

class HealthCheck {
  static async checkDatabase() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      if (state === 1) {
        // Test with a simple ping
        await mongoose.connection.db.admin().ping();
        return {
          status: 'healthy',
          state: states[state],
          latency: null // Could implement ping measurement
        };
      }

      return {
        status: 'unhealthy',
        state: states[state],
        latency: null
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        state: 'error'
      };
    }
  }

  static async checkRedis() {
    try {
      const start = Date.now();
      const ping = await redisConfig.ping();
      const latency = Date.now() - start;

      if (ping) {
        return {
          status: 'healthy',
          latency: `${latency}ms`
        };
      }

      return {
        status: 'unhealthy',
        latency: null
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        latency: null
      };
    }
  }

  static async checkExternalAPIs() {
    const axios = require('axios');
    const config = require('../config/app');
    const results = {};

    const testUrls = config.externalApis.sources.slice(0, 3); // Test first 3 APIs

    for (const url of testUrls) {
      try {
        const start = Date.now();
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': config.externalApis.userAgent
          }
        });
        const latency = Date.now() - start;

        results[url] = {
          status: 'healthy',
          statusCode: response.status,
          latency: `${latency}ms`
        };
      } catch (error) {
        results[url] = {
          status: 'unhealthy',
          error: error.message,
          statusCode: error.response?.status || null
        };
      }
    }

    return results;
  }

  static getSystemInfo() {
    const os = require('os');
    const process = require('process');

    return {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
        free: `${Math.round(os.freemem() / 1024 / 1024)}MB`
      },
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      }
    };
  }

  static async getFullHealthStatus() {
    const [database, redis, externalAPIs] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs()
    ]);

    const systemInfo = this.getSystemInfo();
    const timestamp = new Date().toISOString();

    // Determine overall health
    const isHealthy = database.status === 'healthy' && 
                     redis.status === 'healthy';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      services: {
        database,
        redis,
        externalAPIs
      },
      system: systemInfo
    };
  }
}

module.exports = HealthCheck;