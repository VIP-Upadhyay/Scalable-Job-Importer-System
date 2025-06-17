const { body, query, param } = require('express-validator');

const jobValidation = {
  // Validate job query parameters
  getJobs: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('category')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be between 1 and 100 characters'),
    query('jobType')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Job type must be between 1 and 50 characters'),
    query('source')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Source must be between 1 and 100 characters'),
    query('search')
      .optional()
      .isLength({ min: 2, max: 200 })
      .withMessage('Search term must be between 2 and 200 characters'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'title', 'company', 'publishedDate'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],

  // Validate job ID parameter
  getJobById: [
    param('id')
      .isMongoId()
      .withMessage('Invalid job ID format')
  ],

  // Validate search query
  searchJobs: [
    query('q')
      .notEmpty()
      .isLength({ min: 2, max: 200 })
      .withMessage('Search query must be between 2 and 200 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ]
};

const importValidation = {
  // Validate import history query parameters
  getImportHistory: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('status')
      .optional()
      .isIn(['in_progress', 'completed', 'failed'])
      .withMessage('Invalid status value'),
    query('source')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Source must be between 1 and 100 characters'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'importDateTime', 'totalImported'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],

  // Validate import trigger request
  triggerImport: [
    body('urls')
      .optional()
      .isArray({ min: 1, max: 20 })
      .withMessage('URLs must be an array with 1-20 items'),
    body('urls.*')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Each URL must be a valid HTTP/HTTPS URL')
  ],

  // Validate import log ID
  getImportLogById: [
    param('id')
      .isMongoId()
      .withMessage('Invalid import log ID format')
  ],

  // Validate delete import log
  deleteImportLog: [
    param('id')
      .isMongoId()
      .withMessage('Invalid import log ID format')
  ]
};

const queueValidation = {
  // Validate job ID parameter
  getJobDetails: [
    param('jobId')
      .notEmpty()
      .withMessage('Job ID is required')
  ]
};

module.exports = {
  jobValidation,
  importValidation,
  queueValidation
};