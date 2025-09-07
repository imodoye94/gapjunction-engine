import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createMockLogger } from '../../../test/utils/test-helpers.js';

import { IdempotencyService } from './idempotency.service.js';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockLogger = createMockLogger();
    service = new IdempotencyService(mockLogger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      expect(service).toBeDefined();
    });

    it('should setup cleanup interval', () => {
      // Verify that setInterval was called for cleanup
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('checkIdempotency', () => {
    it('should return null when no cached result exists', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';

      const result = await service.checkIdempotency(orgId, idempotencyKey);

      expect(result).toBeNull();
    });

    it('should return cached result when it exists and is not expired', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';
      const cachedResult = { buildId: 'test-build-123', status: 'QUEUED' };

      // Store a result first
      await service.storeResult(orgId, idempotencyKey, cachedResult);

      const result = await service.checkIdempotency(orgId, idempotencyKey);

      expect(result).toEqual(cachedResult);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Idempotency hit for key ${idempotencyKey}`,
        { orgId }
      );
    });

    it('should return null and remove expired cached result', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';
      const cachedResult = { buildId: 'test-build-123', status: 'QUEUED' };

      // Store a result first
      await service.storeResult(orgId, idempotencyKey, cachedResult);

      // Fast forward time to expire the result (12 hours + 1 minute)
      vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 60 * 1000);

      const result = await service.checkIdempotency(orgId, idempotencyKey);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully and return null', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';

      // Mock an error by making the internal cache throw
      const originalGet = Map.prototype.get;
      Map.prototype.get = vi.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await service.checkIdempotency(orgId, idempotencyKey);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Check idempotency failed',
        expect.objectContaining({
          error: 'Cache error',
          orgId,
          idempotencyKey,
        })
      );

      // Restore original method
      Map.prototype.get = originalGet;
    });

    it('should handle non-Error exceptions', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';

      // Mock an error by making the internal cache throw
      const originalGet = Map.prototype.get;
      Map.prototype.get = vi.fn().mockImplementation(() => {
        throw 'String error';
      });

      const result = await service.checkIdempotency(orgId, idempotencyKey);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Check idempotency failed',
        expect.objectContaining({
          error: 'Unknown error',
          orgId,
          idempotencyKey,
        })
      );

      // Restore original method
      Map.prototype.get = originalGet;
    });
  });

  describe('storeResult', () => {
    it('should store result successfully', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';
      const result = { buildId: 'test-build-123', status: 'QUEUED' };

      await service.storeResult(orgId, idempotencyKey, result);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Stored idempotency result for key ${idempotencyKey}`,
        { orgId }
      );

      // Verify it can be retrieved
      const retrieved = await service.checkIdempotency(orgId, idempotencyKey);
      expect(retrieved).toEqual(result);
    });

    it('should set correct expiration time', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';
      const result = { buildId: 'test-build-123', status: 'QUEUED' };

      const beforeStore = new Date();
      await service.storeResult(orgId, idempotencyKey, result);
      const afterStore = new Date();

      // Get the stored record to check expiration
      const stats = service.getStats();
      expect(stats.totalRecords).toBe(1);
      expect(stats.oldestRecord).toBeDefined();
      expect(stats.oldestRecord?.getTime()).toBeGreaterThanOrEqual(beforeStore.getTime());
      expect(stats.oldestRecord?.getTime()).toBeLessThanOrEqual(afterStore.getTime());
    });

    it('should handle storage errors gracefully', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';
      const result = { buildId: 'test-build-123', status: 'QUEUED' };

      // Mock an error by making the internal cache throw
      const originalSet = Map.prototype.set;
      Map.prototype.set = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(service.storeResult(orgId, idempotencyKey, result)).rejects.toThrow(
        'Failed to store idempotency result'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Store idempotency result failed',
        expect.objectContaining({
          error: 'Storage error',
          orgId,
          idempotencyKey,
        })
      );

      // Restore original method
      Map.prototype.set = originalSet;
    });

    it('should handle non-Error exceptions during storage', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';
      const result = { buildId: 'test-build-123', status: 'QUEUED' };

      // Mock an error by making the internal cache throw
      const originalSet = Map.prototype.set;
      Map.prototype.set = vi.fn().mockImplementation(() => {
        throw 'String error';
      });

      await expect(service.storeResult(orgId, idempotencyKey, result)).rejects.toThrow(
        'Failed to store idempotency result'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Store idempotency result failed',
        expect.objectContaining({
          error: 'Unknown error',
          orgId,
          idempotencyKey,
        })
      );

      // Restore original method
      Map.prototype.set = originalSet;
    });
  });

  describe('cleanup', () => {
    it('should clean up expired records', async () => {
      const orgId = 'test-org-123';
      const result = { buildId: 'test-build-123', status: 'QUEUED' };

      // Store multiple results
      await service.storeResult(orgId, 'key-1', result);
      await service.storeResult(orgId, 'key-2', result);
      await service.storeResult(orgId, 'key-3', result);

      // Verify all are stored
      let stats = service.getStats();
      expect(stats.totalRecords).toBe(3);

      // Fast forward time to expire some records
      vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 60 * 1000);

      // Trigger cleanup by advancing the cleanup interval
      vi.advanceTimersByTime(60 * 60 * 1000); // 1 hour cleanup interval

      // Check that records were cleaned up
      stats = service.getStats();
      expect(stats.totalRecords).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up'),
        expect.any(String)
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      // Store a result first
      await service.storeResult('test-org', 'test-key', { test: 'data' });

      // Mock an error during cleanup
      const originalEntries = Map.prototype.entries;
      Map.prototype.entries = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      // Trigger cleanup
      vi.advanceTimersByTime(60 * 60 * 1000);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Idempotency cleanup failed',
        expect.objectContaining({
          error: 'Cleanup error',
        })
      );

      // Restore original method
      Map.prototype.entries = originalEntries;
    });

    it('should handle non-Error exceptions during cleanup', async () => {
      // Store a result first
      await service.storeResult('test-org', 'test-key', { test: 'data' });

      // Mock an error during cleanup
      const originalEntries = Map.prototype.entries;
      Map.prototype.entries = vi.fn().mockImplementation(() => {
        throw 'String error';
      });

      // Trigger cleanup
      vi.advanceTimersByTime(60 * 60 * 1000);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Idempotency cleanup failed',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );

      // Restore original method
      Map.prototype.entries = originalEntries;
    });
  });

  describe('getStats', () => {
    it('should return correct stats when cache is empty', () => {
      const stats = service.getStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.oldestRecord).toBeUndefined();
    });

    it('should return correct stats when cache has records', async () => {
      const orgId = 'test-org-123';
      const result = { buildId: 'test-build-123', status: 'QUEUED' };

      // Store multiple results with different timestamps
      await service.storeResult(orgId, 'key-1', result);
      
      // Advance time slightly
      vi.advanceTimersByTime(1000);
      await service.storeResult(orgId, 'key-2', result);
      
      vi.advanceTimersByTime(1000);
      await service.storeResult(orgId, 'key-3', result);

      const stats = service.getStats();

      expect(stats.totalRecords).toBe(3);
      expect(stats.oldestRecord).toBeDefined();
    });

    it('should handle errors gracefully when getting stats', () => {
      // Mock an error
      const originalValues = Map.prototype.values;
      Map.prototype.values = vi.fn().mockImplementation(() => {
        throw new Error('Stats error');
      });

      const stats = service.getStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.oldestRecord).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Get idempotency stats failed',
        expect.objectContaining({
          error: 'Stats error',
        })
      );

      // Restore original method
      Map.prototype.values = originalValues;
    });

    it('should handle non-Error exceptions when getting stats', () => {
      // Mock an error
      const originalValues = Map.prototype.values;
      Map.prototype.values = vi.fn().mockImplementation(() => {
        throw 'String error';
      });

      const stats = service.getStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.oldestRecord).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Get idempotency stats failed',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );

      // Restore original method
      Map.prototype.values = originalValues;
    });
  });

  describe('_buildKey', () => {
    it('should build correct cache key', async () => {
      const orgId = 'test-org-123';
      const idempotencyKey = 'test-key-123';
      const result = { test: 'data' };

      await service.storeResult(orgId, idempotencyKey, result);
      
      // The key should be orgId:idempotencyKey format
      // We can verify this by storing with different orgIds and ensuring they don't conflict
      await service.storeResult('different-org', idempotencyKey, { different: 'data' });

      const result1 = await service.checkIdempotency(orgId, idempotencyKey);
      const result2 = await service.checkIdempotency('different-org', idempotencyKey);

      expect(result1).toEqual(result);
      expect(result2).toEqual({ different: 'data' });
    });
  });
});