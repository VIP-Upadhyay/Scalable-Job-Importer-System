const express = require('express');
const importController = require('../controllers/importController');
const { importValidation } = require('../utils/validation');
const { generalLimiter, importLimiter } = require('../middleware/rateLimiter');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Apply rate limiting
router.use(generalLimiter);

// Get import history
router.get('/history',
  importValidation.getImportHistory,
  catchAsync(importController.getImportHistory)
);

// Get import statistics
router.get('/stats',
  catchAsync(importController.getImportStats)
);

// Get import log by ID
router.get('/:id',
  importValidation.getImportLogById,
  catchAsync(importController.getImportLogById)
);

// Trigger manual import (with stricter rate limiting)
router.post('/trigger',
  importLimiter,
  importValidation.triggerImport,
  catchAsync(importController.triggerImport)
);

// Delete import log
router.delete('/:id',
  importValidation.deleteImportLog,
  catchAsync(importController.deleteImportLog)
);

module.exports = router;