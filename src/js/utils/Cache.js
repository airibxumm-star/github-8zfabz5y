/**
 * Simple caching utility with TTL support
 */

export class Cache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
    
    // Clean up expired entries periodically
    this.scheduleCleanup();
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    this.cleanup();
    return this.cache.size;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  scheduleCleanup() {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setTimeout(() => {
      this.cleanup();
      this.cleanupTimer = null;
    }, this.defaultTTL);
  }

  // Async cache with function execution
  async getOrSet(key, asyncFunction, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    try {
      const value = await asyncFunction();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error(`Cache miss and function execution failed for key ${key}:`, error);
      throw error;
    }
  }
}