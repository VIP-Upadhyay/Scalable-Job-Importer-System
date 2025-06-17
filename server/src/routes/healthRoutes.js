const express = require('express');
const HealthCheck = require('../utils/healthCheck');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'job-importer-api'
  });
});

// Detailed health check
router.get('/detailed',
  catchAsync(async (req, res) => {
    const healthStatus = await HealthCheck.getFullHealthStatus();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  })
);

// Individual service checks
router.get('/database',
  catchAsync(async (req, res) => {
    const dbHealth = await HealthCheck.checkDatabase();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  })
);

router.get('/redis',
  catchAsync(async (req, res) => {
    const redisHealth = await HealthCheck.checkRedis();
    const statusCode = redisHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(redisHealth);
  })
);

module.exports = router;