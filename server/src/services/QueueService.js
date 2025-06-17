const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');

class QueueService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.jobQueue = new Queue('job-import', { 
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        }
      }
    });
  }

  async addJobImportTask(jobData) {
    return await this.jobQueue.add('import-jobs', jobData, {
      priority: jobData.priority || 0
    });
  }

  async getQueueStats() {
    const waiting = await this.jobQueue.getWaiting();
    const active = await this.jobQueue.getActive();
    const completed = await this.jobQueue.getCompleted();
    const failed = await this.jobQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  async clearQueue() {
    await this.jobQueue.obliterate({ force: true });
  }
}

module.exports = new QueueService();