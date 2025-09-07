import type * as winston from 'winston';
export declare class IdempotencyService {
    private readonly _logger;
    private readonly _cache;
    private readonly _ttlMs;
    constructor(logger: winston.Logger);
    checkIdempotency(orgId: string, idempotencyKey: string): Promise<unknown | null>;
    storeResult(orgId: string, idempotencyKey: string, result: unknown): Promise<void>;
    private _buildKey;
    private _isExpired;
    private _cleanup;
    getStats(): {
        totalRecords: number;
        oldestRecord?: Date | undefined;
    };
}
//# sourceMappingURL=idempotency.service.d.ts.map