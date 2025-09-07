import type * as winston from 'winston';
import type { CompileRequestBody, CompileResponseBody, ChannelControlResponseBody } from '../common/dto/index.js';
import type { CompilerService } from '../services/compiler.service.js';
import type { SupabaseService } from '../services/supabase.service.js';
import type { WebSocketService } from '../websocket/websocket.service.js';
export declare class ChannelsService {
    private readonly _compilerService;
    private readonly _supabaseService;
    private readonly _websocketService;
    private readonly _logger;
    constructor(_compilerService: CompilerService, _supabaseService: SupabaseService, _websocketService: WebSocketService, logger: winston.Logger);
    compile(channelId: string, request: CompileRequestBody): Promise<CompileResponseBody>;
    stop(channelId: string, runtimeId: string): Promise<ChannelControlResponseBody>;
    start(channelId: string, runtimeId: string): Promise<ChannelControlResponseBody>;
    getStatus(channelId: string, runtimeId: string): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=channels.service.d.ts.map