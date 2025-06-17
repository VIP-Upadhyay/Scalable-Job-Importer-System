const express = require('express');
const queueController = require('../controllers/queueController');
const { queueValidation } = require('../utils/validation');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimiter');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Apply rate limiting
router.use(generalLimiter);

// Get queue statistics
router.get('/stats',
  catchAsync(queueController.getQueueStats)
);

// Get detailed queue information
router.get('/info',
  catchAsync(queueController.getQueueInfo)
);

// Get job details by ID
router.get('/jobs/:jobId',
  queueValidation.getJobDetails,
  catchAsync(queueController.getJobDetails)
);

// Clear queue (with strict rate limiting)
router.post('/clear',
  strictLimiter,
  catchAsync(queueController.clearQueue)
);

// Retry failed jobs
router.post('/retry-failed',
  strictLimiter,
  catchAsync(queueController.retryFailedJobs)
);

// Pause queue
router.post('/pause',
  strictLimiter,
  catchAsync(queueController.pauseQueue)
);

// Resume queue
router.post('/resume',
  strictLimiter,
  catchAsync(queueController.resumeQueue)
);

module.exports = router;