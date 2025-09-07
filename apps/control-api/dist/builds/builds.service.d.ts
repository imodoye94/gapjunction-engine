import type * as winston from 'winston';
import type { DeployRequestBody, DeployResponseBody } from '../common/dto/index.js';
import type { SupabaseService } from '../services/supabase.service.js';
import type { WebSocketService } from '../websocket/websocket.service.js';
export declare class BuildsService {
    private readonly _supabaseService;
    private readonly _websocketService;
    private readonly _logger;
    constructor(_supabaseService: SupabaseService, _websocketService: WebSocketService, logger: winston.Logger);
    deploy(buildId: string, request: DeployRequestBody): Promise<DeployResponseBody>;
}
//# sourceMappingURL=builds.service.d.ts.map