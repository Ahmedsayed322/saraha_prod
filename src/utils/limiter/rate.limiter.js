import rateLimit from 'express-rate-limit';
import ApiError from '../error/api.error.js';

export const GlobalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  limit: 100,
  handler: (req, res) => {
    throw new ApiError('too many requests', 429);
  },
  legacyHeaders: false,
});
export const MediumLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError('too many requests', 429);
  },
});
export const ShortLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError('too many requests', 429);
  },
});
