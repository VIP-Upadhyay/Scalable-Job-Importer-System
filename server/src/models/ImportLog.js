const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
  fileName: { type: String, required: true }, // URL in this case
  importDateTime: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed', 'failed'], 
    default: 'in_progress' 
  },
  totalFetched: { type: Number, default: 0 },
  totalImported: { type: Number, default: 0 },
  newJobs: { type: Number, default: 0 },
  updatedJobs: { type: Number, default: 0 },
  failedJobs: { type: Number, default: 0 },
  errorDetails: [{ // Changed from 'errors' to 'errorDetails'
    message: String, 
    data: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  processingTime: { type: Number }, // in milliseconds
  source: { type: String, required: true }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true // Add this option to suppress warnings
});

// Add indexes for better query performance
importLogSchema.index({ importDateTime: -1 });
importLogSchema.index({ status: 1 });
importLogSchema.index({ source: 1 });

module.exports = mongoose.model('ImportLog', importLogSchema);