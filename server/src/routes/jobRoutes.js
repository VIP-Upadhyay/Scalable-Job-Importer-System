const express = require('express');
const jobController = require('../controllers/jobController');
const { jobValidation } = require('../utils/validation');
const { generalLimiter } = require('../middleware/rateLimiter');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Apply rate limiting to all routes
router.use(generalLimiter);

// Get all jobs with pagination and filtering
router.get('/', 
  jobValidation.getJobs,
  catchAsync(jobController.getAllJobs)
);

// Search jobs
router.get('/search',
  jobValidation.searchJobs,
  catchAsync(jobController.searchJobs)
);

// Get job statistics
router.get('/stats',
  catchAsync(jobController.getJobStats)
);

// Get filter options
router.get('/filter-options',
  catchAsync(jobController.getFilterOptions)
);

// Get job by ID
router.get('/:id',
  jobValidation.getJobById,
  catchAsync(jobController.getJobById)
);

module.exports = router;