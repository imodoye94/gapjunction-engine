import { CompilerService, CompileRequest, SecurityAckRequest } from './compiler.service';
export declare class CompileRequestDto implements CompileRequest {
    channel: unknown;
    orgId?: string;
    userId?: string;
    acknowledgedViolations?: string[];
}
export declare class SecurityAckRequestDto implements SecurityAckRequest {
    channelId: string;
    userId: string;
    violationIds: string[];
    reason: string;
}
export declare class CompilerController {
    private readonly compilerService;
    private readonly logger;
    constructor(compilerService: CompilerService);
    compile(request: CompileRequestDto): Promise<any>;
    verifySecurityAck(request: SecurityAckRequestDto): Promise<any>;
    getStatus(buildId: string): Promise<any>;
    getHealth(): {
        status: string;
        timestamp: string;
        version: string;
    };
}
//# sourceMappingURL=compiler.controller.d.ts.map