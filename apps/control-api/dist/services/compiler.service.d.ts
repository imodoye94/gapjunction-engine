import type * as winston from 'winston';
import type { CompilerRequest, CompilerResponse } from '../common/types/index.js';
interface ConfigService {
    get: <T>(key: string, defaultValue?: T) => T;
}
export declare class CompilerService {
    private readonly _configService;
    private readonly _logger;
    private readonly _httpClient;
    private readonly _compilerUrl;
    constructor(_configService: ConfigService, logger: winston.Logger);
    compile(request: CompilerRequest): Promise<CompilerResponse>;
    getStatus(buildId: string): Promise<Record<string, unknown>>;
    healthCheck(): Promise<boolean>;
}
export {};
//# sourceMappingURL=compiler.service.d.ts.map