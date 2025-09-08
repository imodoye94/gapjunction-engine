import { createServer } from 'net';

import Aedes from 'aedes';

import type { AgentConfig, MQTTTopicConventions } from './types.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('mqtt');

export class MQTTBroker {
  private _aedes: Aedes | null = null;
  private _server: any = null;
  private _isRunning = false;

  constructor(private _config: AgentConfig) {}

  /**
   * Start the MQTT broker
   */
  async start(): Promise<void> {
    if (this._isRunning) {
      logger.warn('MQTT broker is already running');
      return;
    }

    if (!this._config.mqtt.enabled) {
      logger.info('MQTT broker is disabled in configuration');
      return;
    }

    try {
      logger.info('Starting MQTT broker', { 
        host: this._config.mqtt.host, 
        port: this._config.mqtt.port 
      });

      // Create Aedes instance
      this._aedes = new Aedes({
        id: `gapjunction-agent-${this._config.runtimeId}`,
        persistence: undefined, // In-memory persistence for now
        mq: undefined, // Use default message queue
        concurrency: 100,
        heartbeatInterval: 60000, // 60 seconds
        connectTimeout: 30000, // 30 seconds
      });

      // Setup event handlers
      this._setupEventHandlers();

      // Create TCP server
      this._server = createServer(this._aedes.handle);

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this._server.listen(this._config.mqtt.port, this._config.mqtt.host, (error: Error | null) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this._isRunning = true;
      logger.info('MQTT broker started successfully', { 
        host: this._config.mqtt.host, 
        port: this._config.mqtt.port 
      });

    } catch (error) {
      logger.error('Failed to start MQTT broker', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Stop the MQTT broker
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      logger.warn('MQTT broker is not running');
      return;
    }

    try {
      logger.info('Stopping MQTT broker');

      // Close server
      if (this._server) {
        await new Promise<void>((resolve) => {
          this._server.close(() => {
            resolve();
          });
        });
        this._server = null;
      }

      // Close Aedes
      if (this._aedes) {
        await new Promise<void>((resolve) => {
          this._aedes!.close(() => {
            resolve();
          });
        });
        this._aedes = null;
      }

      this._isRunning = false;
      logger.info('MQTT broker stopped');

    } catch (error) {
      logger.error('Failed to stop MQTT broker', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Check if broker is running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get broker statistics
   */
  getStats(): any {
    if (!this._aedes) {
      return null;
    }

    return {
      connectedClients: this._aedes.connectedClients,
      closed: this._aedes.closed,
    };
  }

  /**
   * Setup Aedes event handlers
   */
  private _setupEventHandlers(): void {
    if (!this._aedes) return;

    this._aedes.on('client', (client: any) => {
      logger.debug('MQTT client connected', { clientId: client.id });
    });

    this._aedes.on('clientDisconnect', (client: any) => {
      logger.debug('MQTT client disconnected', { clientId: client.id });
    });

    this._aedes.on('subscribe', (subscriptions: any[], client: any) => {
      logger.debug('MQTT client subscribed', { 
        clientId: client.id, 
        topics: subscriptions.map(s => s.topic) 
      });
    });

    this._aedes.on('unsubscribe', (unsubscriptions: string[], client: any) => {
      logger.debug('MQTT client unsubscribed', { 
        clientId: client.id, 
        topics: unsubscriptions 
      });
    });

    this._aedes.on('publish', (packet: any, client: any) => {
      if (client) {
        logger.debug('MQTT message published', { 
          clientId: client.id, 
          topic: packet.topic,
          payloadLength: packet.payload.length 
        });
      }
    });

    this._aedes.on('clientError', (client: any, error: Error) => {
      logger.warn('MQTT client error', { 
        clientId: client.id, 
        error: error.message 
      });
    });

    this._aedes.on('connectionError', (client: any, error: Error) => {
      logger.warn('MQTT connection error', { 
        clientId: client?.id, 
        error: error.message 
      });
    });
  }
}

/**
 * Topic conventions for GapJunction MQTT communication
 */
export const MQTT_TOPICS: MQTTTopicConventions = {
  channelIn: (channelId: string) => `gj/${channelId}/in`,
  channelOut: (channelId: string) => `gj/${channelId}/out`,
};

/**
 * Validate topic against GapJunction conventions
 */
export function isValidGJTopic(topic: string): boolean {
  return topic.startsWith('gj/') && (topic.includes('/in') || topic.includes('/out'));
}

/**
 * Extract channel ID from GapJunction topic
 */
export function extractChannelId(topic: string): string | null {
  const match = topic.match(/^gj\/([^/]+)\/(in|out)$/);
  return match ? match[1] : null;
}