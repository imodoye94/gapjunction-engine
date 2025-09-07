import type * as winston from 'winston';
import type { AgentEnrollRequestBody, AgentEnrollResponseBody } from '../common/dto/index.js';
export declare class AgentsService {
    private readonly _logger;
    constructor(logger: winston.Logger);
    enroll(request: AgentEnrollRequestBody): Promise<AgentEnrollResponseBody>;
}
//# sourceMappingURL=agents.service.d.ts.map