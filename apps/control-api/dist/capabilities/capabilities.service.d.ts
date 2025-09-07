import type * as winston from 'winston';
import type { RouteTokenRequestBody, RouteTokenResponseBody, EnrollmentCodeRequestBody, EnrollmentCodeResponseBody } from '../common/dto/index.js';
export declare class CapabilitiesService {
    private readonly _logger;
    constructor(logger: winston.Logger);
    issueRouteToken(request: RouteTokenRequestBody): Promise<RouteTokenResponseBody>;
    issueEnrollmentCode(request: EnrollmentCodeRequestBody): Promise<EnrollmentCodeResponseBody>;
}
//# sourceMappingURL=capabilities.service.d.ts.map