import { ulid } from 'ulid';

import type { AgentEnrollRequestBody, AgentEnrollResponseBody } from '../common/dto/index.js';
import type * as winston from 'winston';


export class AgentsService {
  private readonly _logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this._logger = logger;
  }

  async enroll(request: AgentEnrollRequestBody): Promise<AgentEnrollResponseBody> {
    try {
      this._logger.info(`Agent enrollment request for runtime ${request.runtimeId}`);

      // TODO: Implement full enrollment flow:
      // 1. Validate bootstrap token (JWT)
      // 2. Extract orgId, userId, agentId, useP2p from token
      // 3. Generate long-lived Agent JWT
      // 4. If useP2p is true, fetch DN enrollment code from DN API
      // 5. Return agent credentials and overlay config

      // For now, simulate token validation
      // TODO: Verify JWT signature and expiration
      // if (!tokenValid) {
      //   throw new Error('Invalid bootstrap token');
      // }
      await Promise.resolve(); // Placeholder for future async operations

      // Generate agent ID and JWT
      const agentId = ulid();
      const agentJwt = 'mock-agent-jwt-token'; // TODO: Generate real JWT

      this._logger.info(`Generated agent ID ${agentId} for runtime ${request.runtimeId}`);

      return {
        agentId,
        agentJwt,
        overlay: {
          enabled: true, // TODO: Extract from bootstrap token
          enrollmentCode: 'mock-dn-enrollment-code', // TODO: Fetch from DN API
          lighthouses: ['1.2.3.4:4242', '5.6.7.8:4242'], // TODO: Get from config
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Agent enrollment failed', { error: errorMessage, runtimeId: request.runtimeId });
      throw new Error('Agent enrollment failed');
    }
  }
}