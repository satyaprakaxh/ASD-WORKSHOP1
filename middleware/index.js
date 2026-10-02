const {
  cache,
  TTL_MS,
  normalizeKey,
  invalidateCache,
  cacheMiddleware,
  invalidateCacheMiddleware
} = require('./cache');
const errorHandler = require('./errorHandler');

module.exports = {
  cache,
  TTL_MS,
  normalizeKey,
  invalidateCache,
  cacheMiddleware,
  invalidateCacheMiddleware,
  errorHandler
};
