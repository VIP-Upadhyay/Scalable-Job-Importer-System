const rateLimit = require('express-rate-limit');
const { API_RATE_LIMITS } = require('../utils/constants');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || API_RATE_LIMITS.WINDOW_MS,
    max: options.max || API_RATE_LIMITS.MAX_REQUESTS,
    message: {
      success: false,
      message: options.message || API_RATE_LIMITS.MESSAGE,
      retryAfter: options.windowMs || API_RATE_LIMITS.WINDOW_MS
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different rate limiters for different endpoints
const generalLimiter = createRateLimiter();

const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests for this action, please try again later.'
});

const importLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit import triggers
  message: 'Too many import requests, please try again later.'
});

module.exports = {
  generalLimiter,
  strictLimiter,
  importLimiter
};