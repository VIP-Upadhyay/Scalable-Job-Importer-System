const Job = require('../models/Job');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class JobController {
  // Get all jobs with pagination and filtering
  async getAllJobs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        page = 1,
        limit = 20,
        category,
        jobType,
        source,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = { isActive: true };
      
      if (category) filter.category = category;
      if (jobType) filter.jobType = jobType;
      if (source) filter.source = source;
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const jobs = await Job.find(filter)
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Job.countDocuments(filter);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error in getAllJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get job by ID
  async getJobById(req, res) {
    try {
      const { id } = req.params;
      
      const job = await Job.findById(id);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: job
      });

    } catch (error) {
      logger.error('Error in getJobById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get job statistics
  async getJobStats(req, res) {
    try {
      // Get total job count
      const totalJobs = await Job.countDocuments({ isActive: true });

      // Get jobs by source
      const sourceStats = await Job.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            categories: { $addToSet: '$category' },
            jobTypes: { $addToSet: '$jobType' },
            latestJob: { $max: '$createdAt' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get jobs by category
      const categoryStats = await Job.aggregate([
        { $match: { isActive: true, category: { $ne: null, $ne: '' } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get jobs by type
      const jobTypeStats = await Job.aggregate([
        { $match: { isActive: true, jobType: { $ne: null, $ne: '' } } },
        {
          $group: {
            _id: '$jobType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get recent activity (jobs added in last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const recentJobs = await Job.countDocuments({
        isActive: true,
        createdAt: { $gte: yesterday }
      });

      res.json({
        success: true,
        data: {
          totalJobs,
          recentJobs,
          sourceStats,
          categoryStats,
          jobTypeStats
        }
      });

    } catch (error) {
      logger.error('Error in getJobStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Search jobs
  async searchJobs(req, res) {
    try {
      const { q, limit = 10 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long'
        });
      }

      const searchQuery = {
        isActive: true,
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { company: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { location: { $regex: q, $options: 'i' } }
        ]
      };

      const jobs = await Job.find(searchQuery)
        .select('title company location jobType category createdAt')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: {
          query: q,
          results: jobs,
          count: jobs.length
        }
      });

    } catch (error) {
      logger.error('Error in searchJobs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get unique filter values
  async getFilterOptions(req, res) {
    try {
      const [categories, jobTypes, sources] = await Promise.all([
        Job.distinct('category', { isActive: true, category: { $ne: null, $ne: '' } }),
        Job.distinct('jobType', { isActive: true, jobType: { $ne: null, $ne: '' } }),
        Job.distinct('source', { isActive: true })
      ]);

      res.json({
        success: true,
        data: {
          categories: categories.sort(),
          jobTypes: jobTypes.sort(),
          sources: sources.sort()
        }
      });

    } catch (error) {
      logger.error('Error in getFilterOptions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new JobController();