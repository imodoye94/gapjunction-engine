import type { ControlToAgent, AgentToControl, ChannelStatus } from './types.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('commands');

export interface CommandHandlers {
  onDeploy: (buildId: string, bundleContent: string, channelId: string, mode: 'TEST' | 'PROD', secretPayload?: Uint8Array) => Promise<void>;
  onStart: (channelId: string) => Promise<void>;
  onStop: (channelId: string, drainMs?: number) => Promise<void>;
  onRestart: (channelId: string) => Promise<void>;
  onStatus: (correlationId: string) => Promise<void>;
  onUpdateAgent: (url: string, signature: Uint8Array) => Promise<void>;
  onOverlayEnroll: (enrollmentCode: string) => Promise<void>;
}

export class CommandDispatcher {
  constructor(
    private _handlers: CommandHandlers,
    private _sendMessage: (message: AgentToControl) => void
  ) {}

  /**
   * Dispatch incoming command from control API
   */
  async dispatch(command: ControlToAgent): Promise<void> {
    try {
      logger.info(`Dispatching command: ${command.op}`);

      switch (command.op) {
        case 'deploy': {
          await this._handlers.onDeploy(
            command.buildId,
            command.bundleContent,
            command.channelId,
            command.mode,
            command.secretPayload
          );
          break;
        }

        case 'start': {
          await this._handlers.onStart(command.channelId);
          break;
        }

        case 'stop': {
          await this._handlers.onStop(command.channelId, command.drainMs);
          break;
        }

        case 'restart': {
          await this._handlers.onRestart(command.channelId);
          break;
        }

        case 'status': {
          await this._handlers.onStatus(command.correlationId);
          break;
        }

        case 'update-agent': {
          await this._handlers.onUpdateAgent(command.url, command.signature);
          break;
        }

        case 'overlay-enroll': {
          await this._handlers.onOverlayEnroll(command.enrollmentCode);
          break;
        }

        default: {
          logger.warn(`Unknown command: ${(command as any).op}`);
          this._sendAck(`Unknown command: ${(command as any).op}`);
          break;
        }
      }

      // Send acknowledgment for successful command processing
      this._sendAck();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Command dispatch failed: ${command.op}`, { error: errorMessage });
      
      // Send error acknowledgment
      this._sendAck(`Error: ${errorMessage}`);
    }
  }

  /**
   * Send acknowledgment message
   */
  private _sendAck(ref?: string): void {
    const ack: AgentToControl = {
      op: 'ack',
      ...(ref && { ref }),
    };

    this._sendMessage(ack);
  }
}

/**
 * Create default command handlers (stubs for now)
 */
export function createDefaultHandlers(): CommandHandlers {
  return {
    async onDeploy(buildId: string, bundleContent: string, channelId: string, mode: 'TEST' | 'PROD', secretPayload?: Uint8Array): Promise<void> {
      logger.info(`Deploy command received`, { buildId, channelId, mode, hasSecrets: !!secretPayload });
      // TODO: Implement deployment logic
      throw new Error('Deploy handler not implemented');
    },

    async onStart(channelId: string): Promise<void> {
      logger.info(`Start command received`, { channelId });
      // TODO: Implement start logic
      throw new Error('Start handler not implemented');
    },

    async onStop(channelId: string, drainMs?: number): Promise<void> {
      logger.info(`Stop command received`, { channelId, drainMs });
      // TODO: Implement stop logic
      throw new Error('Stop handler not implemented');
    },

    async onRestart(channelId: string): Promise<void> {
      logger.info(`Restart command received`, { channelId });
      // TODO: Implement restart logic
      throw new Error('Restart handler not implemented');
    },

    async onStatus(correlationId: string): Promise<void> {
      logger.info(`Status command received`, { correlationId });
      // TODO: Implement status logic
      throw new Error('Status handler not implemented');
    },

    async onUpdateAgent(url: string, signature: Uint8Array): Promise<void> {
      logger.info(`Update agent command received`, { url, signatureLength: signature.length });
      // TODO: Implement agent update logic
      throw new Error('Update agent handler not implemented');
    },

    async onOverlayEnroll(enrollmentCode: string): Promise<void> {
      logger.info(`Overlay enroll command received`, { enrollmentCode: enrollmentCode.substring(0, 8) + '...' });
      // TODO: Implement overlay enrollment logic
      throw new Error('Overlay enroll handler not implemented');
    },
  };
}