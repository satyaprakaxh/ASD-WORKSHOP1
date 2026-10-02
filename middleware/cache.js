/**
 * In-memory Cache Store
 * Each entry stores:
 * {
 *   data: <response body>,
 *   createdAt: <timestamp in ms>
 * }
 */
const cache = new Map();

// TTL: 1 minute (60,000 milliseconds)
const TTL_MS = 60 * 1000;

/**
 * Normalizes URL keys by removing trailing slashes for consistent lookup
 */
function normalizeKey(url) {
  if (!url) return '/';
  if (url.length > 1 && url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
}

/**
 * Invalidates all cache entries that may contain stale data
 */
function invalidateCache() {
  cache.clear();
}

/**
 * Cache middleware for GET endpoints:
 * 1. Checks if cached data exists for the request URL.
 * 2. Checks if the cached entry has expired (older than 1 minute TTL).
 * 3. Sets 'X-Cache' header to 'HIT' or 'MISS'.
 * 4. On MISS / Expiry: forwards to Controller -> Service -> Database, then caches fresh response.
 */
function cacheMiddleware(req, res, next) {
  // Caching is only applied to GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const key = normalizeKey(req.originalUrl || req.url);
  const cachedEntry = cache.get(key);

  if (cachedEntry) {
    const age = Date.now() - cachedEntry.createdAt;

    // Check whether the cached value is older than 1 minute (TTL)
    if (age <= TTL_MS) {
      // CACHE HIT: Fresh and not expired
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedEntry.data);
    }

    // CACHE EXPIRED: Do not use the cached value
    cache.delete(key);
  }

  // CACHE MISS: Either not cached or expired
  res.setHeader('X-Cache', 'MISS');

  // Intercept response to store fresh data in cache
  let responseCached = false;
  const storeFreshInCache = (body) => {
    // Only cache successful responses (2xx)
    if (!responseCached && res.statusCode >= 200 && res.statusCode < 300) {
      responseCached = true;
      let dataToCache = body;
      if (typeof body === 'string') {
        try {
          dataToCache = JSON.parse(body);
        } catch {
          dataToCache = body;
        }
      }

      // Store the fresh value along with the creation timestamp
      cache.set(key, {
        data: dataToCache,
        createdAt: Date.now()
      });
    }
  };

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    storeFreshInCache(body);
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = function (body) {
    storeFreshInCache(body);
    return originalSend(body);
  };

  next();
}

/**
 * Invalidation middleware for POST, PUT, PATCH, and DELETE requests:
 * Whenever stored data is successfully modified (2xx status),
 * invalidates all cache entries to prevent serving stale data.
 */
function invalidateCacheMiddleware(req, res, next) {
  const checkAndInvalidate = () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache();
    }
  };

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    checkAndInvalidate();
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = function (body) {
    checkAndInvalidate();
    return originalSend(body);
  };

  next();
}

module.exports = {
  cache,
  TTL_MS,
  normalizeKey,
  invalidateCache,
  cacheMiddleware,
  invalidateCacheMiddleware
};
