export class CapabilitiesService {
    _logger;
    constructor(logger) {
        this._logger = logger;
    }
    async issueRouteToken(request) {
        try {
            this._logger.info(`Issuing route token for ${request.fromRuntime} -> ${request.toRuntime}`, {
                channelId: request.channelId,
                maxBytes: request.maxBytes,
                ttlSec: request.ttlSec,
            });
            // TODO: Implement route token generation:
            // 1. Validate fromRuntime and toRuntime exist and are accessible
            // 2. Generate JWT with capability claims
            // 3. Set expiration based on ttlSec
            // 4. Sign with capability token secret
            const token = 'mock-route-capability-token'; // TODO: Generate real JWT
            return { token };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Route token generation failed', {
                error: errorMessage,
                fromRuntime: request.fromRuntime,
                toRuntime: request.toRuntime
            });
            throw new Error('Failed to issue route token');
        }
    }
    async issueEnrollmentCode(request) {
        try {
            this._logger.info(`Issuing enrollment code for runtime ${request.runtimeId}`, {
                organizationId: request.organizationId,
                userId: request.userId,
                agentId: request.agentId,
                useP2p: request.useP2p,
                ttlSec: request.ttlSec,
            });
            // TODO: Implement enrollment code generation:
            // 1. Validate organizationId, userId, runtimeId
            // 2. Generate JWT with enrollment claims
            // 3. Set expiration based on ttlSec
            // 4. Sign with enrollment token secret
            // 5. If useP2p is true, prepare DN integration
            const token = 'mock-enrollment-code-token'; // TODO: Generate real JWT
            return { token };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error('Enrollment code generation failed', {
                error: errorMessage,
                runtimeId: request.runtimeId
            });
            throw new Error('Failed to issue enrollment code');
        }
    }
}
//# sourceMappingURL=capabilities.service.js.map