const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  externalId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  description: { type: String },
  jobType: { type: String },
  category: { type: String },
  salary: { type: String },
  url: { type: String },
  publishedDate: { type: Date },
  source: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

jobSchema.index({ externalId: 1, source: 1 }, { unique: true });
jobSchema.index({ category: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);