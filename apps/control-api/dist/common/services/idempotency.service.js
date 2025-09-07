export class IdempotencyService {
    _logger;
    _cache = new Map();
    _ttlMs = 12 * 60 * 60 * 1000; // 12 hours
    constructor(logger) {
        this._logger = logger;
        // Clean up expired records every hour
        setInterval(() => this._cleanup(), 60 * 60 * 1000);
    }
    async checkIdempotency(orgId, idempotencyKey) {
        try {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Check idempotency failed', { error: errorMessage, orgId, idempotencyKey });
            return null;
        }
    }
    async storeResult(orgId, idempotencyKey, result) {
        try {
            const key = this._buildKey(orgId, idempotencyKey);
            const now = new Date();
            const record = {
                key: idempotencyKey,
                orgId,
                result,
                createdAt: now,
                expiresAt: new Date(now.getTime() + this._ttlMs),
            };
            this._cache.set(key, record);
            this._logger.debug(`Stored idempotency result for key ${idempotencyKey}`, { orgId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Store idempotency result failed', { error: errorMessage, orgId, idempotencyKey });
            throw new Error('Failed to store idempotency result');
        }
    }
    _buildKey(orgId, idempotencyKey) {
        return `${orgId}:${idempotencyKey}`;
    }
    _isExpired(record) {
        return new Date() > record.expiresAt;
    }
    _cleanup() {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Idempotency cleanup failed', { error: errorMessage });
        }
    }
    // For testing and monitoring
    getStats() {
        try {
            const records = Array.from(this._cache.values());
            const oldestRecord = records.length > 0
                ? records.reduce((oldest, record) => record.createdAt < oldest ? record.createdAt : oldest, records[0].createdAt)
                : undefined;
            return {
                totalRecords: records.length,
                oldestRecord: oldestRecord,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Get idempotency stats failed', { error: errorMessage });
            return { totalRecords: 0 };
        }
    }
}
//# sourceMappingURL=idempotency.service.js.map