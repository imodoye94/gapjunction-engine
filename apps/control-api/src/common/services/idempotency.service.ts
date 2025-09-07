import type { IdempotencyRecord } from '../types/index.js';
import type * as winston from 'winston';


export class IdempotencyService {
  private readonly _logger: winston.Logger;
  private readonly _cache = new Map<string, IdempotencyRecord>();
  private readonly _ttlMs: number;
  private readonly _cleanupIntervalMs: number;

  constructor(logger: winston.Logger) {
    this._logger = logger;
    
    // Constants for time calculations
    const MINUTES_PER_HOUR = 60;
    const SECONDS_PER_MINUTE = 60;
    const MS_PER_SECOND = 1000;
    const HOURS_TO_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
    const TTL_HOURS = 12;
    const CLEANUP_HOURS = 1;
    
    this._ttlMs = TTL_HOURS * HOURS_TO_MS;
    this._cleanupIntervalMs = CLEANUP_HOURS * HOURS_TO_MS;
    
    // Clean up expired records every hour
    // eslint-disable-next-line no-undef
    setInterval(() => { this._cleanup(); }, this._cleanupIntervalMs);
  }

  async checkIdempotency(orgId: string, idempotencyKey: string): Promise<unknown | null> {
    try {
      await Promise.resolve(); // Placeholder for future async operations
      const key = this._buildKey(orgId, idempotencyKey);
      const record = this._cache.get(key);

      if (!record) {
        return null;
      }

      if (this._isExpired(record)) {
        this._cache.delete(key);
        return null;
      }

      this._logger.debug(`Idempotency hit for key ${idempotencyKey}`, { orgId });
      return record.result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Check idempotency failed', { error: errorMessage, orgId, idempotencyKey });
      return null;
    }
  }

  async storeResult(orgId: string, idempotencyKey: string, result: unknown): Promise<void> {
    try {
      await Promise.resolve(); // Placeholder for future async operations
      const key = this._buildKey(orgId, idempotencyKey);
      const now = new Date();
      
      const record: IdempotencyRecord = {
        key: idempotencyKey,
        orgId,
        result,
        createdAt: now,
        expiresAt: new Date(now.getTime() + this._ttlMs),
      };

      this._cache.set(key, record);
      this._logger.debug(`Stored idempotency result for key ${idempotencyKey}`, { orgId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Store idempotency result failed', { error: errorMessage, orgId, idempotencyKey });
      throw new Error('Failed to store idempotency result');
    }
  }

  private _buildKey(orgId: string, idempotencyKey: string): string {
    return `${orgId}:${idempotencyKey}`;
  }

  private _isExpired(record: IdempotencyRecord): boolean {
    return new Date() > record.expiresAt;
  }

  private _cleanup(): void {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [key, record] of this._cache.entries()) {
        if (now > record.expiresAt) {
          this._cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this._logger.debug(`Cleaned up ${cleanedCount} expired idempotency records`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Idempotency cleanup failed', { error: errorMessage });
    }
  }

  // For testing and monitoring
  getStats(): { totalRecords: number; oldestRecord?: Date | undefined } {
    try {
      const records = Array.from(this._cache.values());
      const oldestRecord = records.length > 0
        ? records.reduce((oldest, record) =>
            record.createdAt < oldest ? record.createdAt : oldest,
            records[0]?.createdAt ?? new Date()
          )
        : undefined;

      return {
        totalRecords: records.length,
        oldestRecord: oldestRecord,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Get idempotency stats failed', { error: errorMessage });
      return { totalRecords: 0 };
    }
  }
}