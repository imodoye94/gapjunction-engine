import { EventEmitter } from 'events';

import WebSocket from 'ws';
import { pack, unpack } from 'msgpackr';

import type { ControlToAgent, AgentToControl, AgentConfig, TokenState, DeviceIdentity, RuntimeSummary } from './types.js';
import { createModuleLogger } from './logger.js';
import { needsRefresh, refreshToken } from './identity.js';

const logger = createModuleLogger('wsClient');

const HEARTBEAT_INTERVAL_MS = 20000; // 20 seconds
const RECONNECT_DELAY_MS = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

export interface WSClientEvents {
  connected: () => void;
  disconnected: () => void;
  message: (message: ControlToAgent) => void;
  error: (error: Error) => void;
}

export class WSClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(
    private config: AgentConfig,
    private identity: DeviceIdentity,
    private tokens: TokenState
  ) {
    super();
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      // Check if token needs refresh before connecting
      if (needsRefresh(this.tokens)) {
        logger.info('Token needs refresh before connecting');
        this.tokens = await refreshToken(this.config, this.tokens);
      }

      const wsUrl = `${this.config.control.baseUrl.replace(/^http/, 'ws')}${this.config.control.wsPath}`;
      logger.info(`Connecting to WebSocket: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.tokens.agentJwt}`,
        },
      });

      this.setupEventHandlers();
      
    } catch (error) {
      this.isConnecting = false;
      logger.error('Failed to connect to WebSocket', { error: error instanceof Error ? error.message : String(error) });
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
    logger.info('WebSocket disconnected');
  }

  /**
   * Send message to the control API
   */
  send(message: AgentToControl): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send message: WebSocket not connected', { message });
      return;
    }

    try {
      const packed = pack(message);
      this.ws.send(packed);
      logger.debug('Message sent', { op: message.op });
    } catch (error) {
      logger.error('Failed to send message', { error: error instanceof Error ? error.message : String(error), message });
    }
  }

  /**
   * Send hello message to establish connection
   */
  sendHello(): void {
    const hello: AgentToControl = {
      op: 'hello',
      payload: {
        op: 'hello',
        runtimeId: this.config.runtimeId,
        agentVersion: '0.1.0', // TODO: Get from package.json
        deviceId: this.identity.deviceId,
        nebula: undefined, // TODO: Get from overlay manager
        capabilities: {
          mqtt: this.config.mqtt.enabled,
          httpProxy: false, // TODO: Implement HTTP proxy capability
          platform: this.getPlatform(),
        },
      },
    };

    this.send(hello);
  }

  /**
   * Send heartbeat message
   */
  sendHeartbeat(): void {
    const heartbeat: AgentToControl = {
      op: 'heartbeat',
      ts: Date.now(),
    };

    this.send(heartbeat);
  }

  /**
   * Send status update
   */
  sendStatus(summary: RuntimeSummary, correlationId?: string): void {
    const status: AgentToControl = {
      op: 'status',
      correlationId,
      summary,
    };

    this.send(status);
  }

  /**
   * Send deployment result
   */
  sendDeployResult(channelId: string, buildId: string, ok: boolean, details?: string): void {
    const result: AgentToControl = {
      op: 'deploy-result',
      channelId,
      buildId,
      ok,
      details,
    };

    this.send(result);
  }

  /**
   * Send log message
   */
  sendLog(level: 'info' | 'warn' | 'error', msg: string, channelId?: string): void {
    const log: AgentToControl = {
      op: 'log',
      channelId,
      level,
      msg,
    };

    this.send(log);
  }

  /**
   * Send acknowledgment
   */
  sendAck(ref?: string): void {
    const ack: AgentToControl = {
      op: 'ack',
      ref,
    };

    this.send(ack);
  }

  /**
   * Update tokens (called when tokens are refreshed)
   */
  updateTokens(tokens: TokenState): void {
    this.tokens = tokens;
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      logger.info('WebSocket connected');
      
      // Send hello message
      this.sendHello();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.emit('connected');
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = unpack(data) as ControlToAgent;
        logger.debug('Message received', { op: message.op });
        this.emit('message', message);
      } catch (error) {
        logger.error('Failed to parse message', { error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.isConnecting = false;
      this.clearTimers();
      logger.info('WebSocket closed', { code, reason: reason.toString() });
      
      this.emit('disconnected');
      
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (error: Error) => {
      this.isConnecting = false;
      logger.error('WebSocket error', { error: error.message });
      this.emit('error', error);
    });

    this.ws.on('pong', () => {
      logger.debug('Pong received');
    });
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendHeartbeat();
        
        // Send WebSocket ping
        if (this.ws) {
          this.ws.ping();
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5)); // Exponential backoff, max 32x
    
    logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        logger.error('Reconnection attempt failed', { error: error instanceof Error ? error.message : String(error) });
      });
    }, delay);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get platform string for capabilities
   */
  private getPlatform(): 'win' | 'mac' | 'linux' {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return 'win';
      case 'darwin':
        return 'mac';
      default:
        return 'linux';
    }
  }
}