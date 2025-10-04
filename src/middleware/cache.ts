import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Simple in-memory cache middleware
 */
export const cacheMiddleware = (ttl: number = CACHE_TTL) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const key = req.originalUrl;
    const cached = cache.get(key);

    // Return cached response if valid
    if (cached && Date.now() - cached.timestamp < ttl) {
      logger.debug(`Cache hit: ${key}`);
      return res.json(cached.data);
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache successful responses
      if (res.statusCode === 200 && body.success !== false) {
        cache.set(key, { data: body, timestamp: Date.now() });
        logger.debug(`Cache stored: ${key}`);
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Clear all cache
 */
export const clearCache = () => {
  cache.clear();
  logger.info("Cache cleared");
};

/**
 * Clear specific cache entry
 */
export const clearCacheKey = (key: string) => {
  cache.delete(key);
  logger.debug(`Cache cleared: ${key}`);
};

// Auto cleanup old cache every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleared = 0;

  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 30 * 60 * 1000) {
      // 30 minutes
      cache.delete(key);
      cleared++;
    }
  }

  if (cleared > 0) {
    logger.info(`Auto-cleared ${cleared} stale cache entries`);
  }
}, 10 * 60 * 1000);
