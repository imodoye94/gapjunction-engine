import { ulid } from 'ulid';


import type { DeployRequestBody, DeployResponseBody } from '../common/dto/index.js';
import type { SupabaseService } from '../services/supabase.service.js';
import type { WebSocketService } from '../websocket/websocket.service.js';
import type * as winston from 'winston';

export class BuildsService {
  private readonly _logger: winston.Logger;

  constructor(
    private readonly _supabaseService: SupabaseService,
    private readonly _websocketService: WebSocketService,
    logger: winston.Logger
  ) {
    this._logger = logger;
  }

  async deploy(buildId: string, request: DeployRequestBody): Promise<DeployResponseBody> {
    try {
      this._logger.info(`Received deploy request for build ${buildId}`, {
        runtimeId: request.runtimeId,
        channelId: request.channelId,
        mode: request.mode,
        strategy: request.strategy,
      });

      // TODO: Implement the full deploy flow:
      // 1. Validate build exists and is in COMPILED status
      // 2. Generate deployment ID
      // 3. Update bundle record with deployment info
      // 4. Download bundle from Supabase Storage
      // 5. Send deploy command to agent via WebSocket
      // 6. Wait for agent response
      // 7. Update deployment status
      // 8. Broadcast success/failure to Editor

      // For now, simulate validation
      // TODO: Check Supabase for build existence and status
      // TODO: Check build status is COMPILED
      await Promise.resolve(); // Placeholder for future async operations

      // Generate deployment ID
      const deployId = ulid();

      this._logger.info(`Generated deployment ID ${deployId} for build ${buildId}`);

      return {
        deployId,
        status: 'QUEUED',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Deploy operation failed', { error: errorMessage, buildId });
      throw new Error('Deployment failed');
    }
  }
}