import type * as winston from 'winston';
import type { Build } from '../common/types/index.js';
interface ConfigService {
    get: <T>(key: string, defaultValue?: T) => T;
}
export declare class SupabaseService {
    private readonly _configService;
    private readonly _logger;
    private readonly _supabase;
    private readonly _config;
    constructor(_configService: ConfigService, logger: winston.Logger);
    createBuild(build: Partial<Build>): Promise<Build>;
    updateBuild(buildId: string, updates: Partial<Build>): Promise<Build>;
    getBuild(buildId: string): Promise<Build | null>;
    uploadBundle(buildId: string, bundle: Buffer): Promise<string>;
    downloadBundle(bundlePath: string): Promise<Buffer>;
    broadcastToEditor(channelId: string, event: string, payload: Record<string, unknown>): Promise<void>;
    healthCheck(): Promise<boolean>;
    private _mapBuildFromDb;
}
export {};
//# sourceMappingURL=supabase.service.d.ts.map