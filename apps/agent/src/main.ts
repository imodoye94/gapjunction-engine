import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import type { AgentConfig, DeviceIdentity, TokenState, CommandHandlers } from './types.js';
import { createLogger, createModuleLogger } from './logger.js';
import { loadConfig, getConfigPaths } from './config.js';
import { 
  loadOrCreateIdentity, 
  retrieveTokens, 
  enrollDevice, 
  refreshToken, 
  needsRefresh,
  decryptSecretPayload 
} from './identity.js';
import { WSClient } from './wsClient.js';
import { CommandDispatcher } from './commands.js';
import { extractBundle, setCurrentBuild } from './bundles.js';
import { NodeRedSupervisor } from './supervisor.js';
import { MQTTBroker } from './mqtt.js';
import { OverlayManager } from './overlay.js';
import { HealthProbe } from './health.js';
import { AgentUpdater } from './updater.js';

const logger = createModuleLogger('main');

class GapJunctionAgent {
  private _config: AgentConfig | null = null;
  private _identity: DeviceIdentity | null = null;
  private _tokens: TokenState | null = null;
  private _wsClient: WSClient | null = null;
  private _commandDispatcher: CommandDispatcher | null = null;
  private _supervisor: NodeRedSupervisor | null = null;
  private _mqttBroker: MQTTBroker | null = null;
  private _overlayManager: OverlayManager | null = null;
  private _healthProbe: HealthProbe | null = null;
  private _updater: AgentUpdater | null = null;
  private _isShuttingDown = false;
  private _refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Start the GapJunction Agent
   */
  async start(configPath?: string): Promise<void> {
    try {
      logger.info('Starting GapJunction Agent');

      // Load configuration
      this._config = loadConfig(configPath);
      logger.info('Configuration loaded', { runtimeId: this._config.runtimeId });

      // Initialize identity
      this._identity = loadOrCreateIdentity();
      logger.info('Device identity loaded', { deviceId: this._identity.deviceId });

      // Initialize modules
      await this._initializeModules();

      // Handle enrollment or token refresh
      await this._handleAuthentication();

      // Start services
      await this._startServices();

      // Setup graceful shutdown
      this._setupGracefulShutdown();

      logger.info('GapJunction Agent started successfully', {
        runtimeId: this._config.runtimeId,
        deviceId: this._identity.deviceId,
      });

    } catch (error) {
      logger.error('Failed to start agent', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Shutdown the agent gracefully
   */
  async shutdown(): Promise<void> {
    if (this._isShuttingDown) {
      return;
    }

    this._isShuttingDown = true;
    logger.info('Shutting down GapJunction Agent');

    try {
      // Clear refresh timer
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = null;
      }

      // Disconnect WebSocket
      if (this._wsClient) {
        this._wsClient.disconnect();
      }

      // Stop all Node-RED processes
      if (this._supervisor) {
        const channels = this._supervisor.getStatus();
        for (const channel of channels) {
          if (channel.state === 'running') {
            await this._supervisor.stop(channel.channelId);
          }
        }
      }

      // Stop MQTT broker
      if (this._mqttBroker) {
        await this._mqttBroker.stop();
      }

      logger.info('GapJunction Agent shutdown complete');

    } catch (error) {
      logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Initialize all modules
   */
  private async _initializeModules(): Promise<void> {
    if (!this._config || !this._identity) {
      throw new Error('Configuration and identity must be loaded first');
    }

    // Initialize modules
    this._supervisor = new NodeRedSupervisor(this._config);
    this._mqttBroker = new MQTTBroker(this._config);
    this._overlayManager = new OverlayManager(this._config);
    this._healthProbe = new HealthProbe(this._config);
    this._updater = new AgentUpdater();

    // Initialize overlay manager
    await this._overlayManager.initialize();

    logger.info('Modules initialized');
  }

  /**
   * Handle authentication (enrollment or token refresh)
   */
  private async _handleAuthentication(): Promise<void> {
    if (!this._config || !this._identity) {
      throw new Error('Configuration and identity must be loaded first');
    }

    // Try to retrieve existing tokens
    this._tokens = retrieveTokens(this._config.runtimeId);

    if (!this._tokens) {
      // No tokens found, need to enroll
      if (!this._config.bootstrapToken) {
        throw new Error('No tokens found and no bootstrap token provided');
      }

      logger.info('Enrolling device with control API');
      this._tokens = await enrollDevice(this._config, this._identity);
      
      // Clear bootstrap token from config after successful enrollment
      this._config.bootstrapToken = undefined;
    } else {
      // Check if tokens need refresh
      if (needsRefresh(this._tokens)) {
        logger.info('Refreshing tokens');
        this._tokens = await refreshToken(this._config, this._tokens);
      }
    }

    // Schedule token refresh
    this._scheduleTokenRefresh();

    logger.info('Authentication completed');
  }

  /**
   * Start all services
   */
  private async _startServices(): Promise<void> {
    if (!this._config || !this._identity || !this._tokens) {
      throw new Error('Configuration, identity, and tokens must be ready first');
    }

    // Start MQTT broker
    await this._mqttBroker!.start();

    // Create command handlers
    const commandHandlers = this._createCommandHandlers();

    // Initialize WebSocket client
    this._wsClient = new WSClient(this._config, this._identity, this._tokens);
    
    // Initialize command dispatcher
    this._commandDispatcher = new CommandDispatcher(
      commandHandlers,
      (message) => this._wsClient!.send(message)
    );

    // Setup WebSocket event handlers
    this._wsClient.on('connected', () => {
      logger.info('Connected to control API');
    });

    this._wsClient.on('disconnected', () => {
      logger.warn('Disconnected from control API');
    });

    this._wsClient.on('message', async (message) => {
      await this._commandDispatcher!.dispatch(message);
    });

    this._wsClient.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message });
    });

    // Connect to control API
    await this._wsClient.connect();

    logger.info('Services started');
  }

  /**
   * Create command handlers
   */
  private _createCommandHandlers(): CommandHandlers {
    return {
      onDeploy: async (buildId, bundleContent, channelId, mode, secretPayload) => {
        logger.info('Handling deploy command', { buildId, channelId, mode });

        try {
          // Extract bundle
          const bundleInfo = await extractBundle(
            channelId,
            buildId,
            bundleContent,
            secretPayload,
            this._identity!.devicePrivateKey
          );

          // Set as current build
          setCurrentBuild(channelId, buildId);

          // Deploy to supervisor
          await this._supervisor!.deploy(bundleInfo, this._identity!.devicePrivateKey);

          // Send success result
          this._wsClient!.sendDeployResult(channelId, buildId, true);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Deploy failed', { error: errorMsg, channelId, buildId });
          this._wsClient!.sendDeployResult(channelId, buildId, false, errorMsg);
        }
      },

      onStart: async (channelId) => {
        logger.info('Handling start command', { channelId });
        await this._supervisor!.start(channelId);
      },

      onStop: async (channelId, drainMs) => {
        logger.info('Handling stop command', { channelId, drainMs });
        await this._supervisor!.stop(channelId, drainMs);
      },

      onRestart: async (channelId) => {
        logger.info('Handling restart command', { channelId });
        await this._supervisor!.restart(channelId);
      },

      onStatus: async (correlationId) => {
        logger.info('Handling status command', { correlationId });
        
        const channels = this._supervisor!.getStatus();
        const overlayState = this._overlayManager!.getState();
        
        const summary = this._healthProbe!.generateRuntimeSummary(
          channels,
          overlayState ? { ip: overlayState.nebulaIp, hostId: overlayState.hostId } : undefined
        );

        this._wsClient!.sendStatus(summary, correlationId);
      },

      onUpdateAgent: async (url, signature) => {
        logger.info('Handling update agent command', { url });
        await this._updater!.updateAgent(url, signature);
      },

      onOverlayEnroll: async (enrollmentCode) => {
        logger.info('Handling overlay enroll command');
        await this._overlayManager!.enroll(enrollmentCode);
      },
    };
  }

  /**
   * Schedule token refresh
   */
  private _scheduleTokenRefresh(): void {
    if (!this._tokens) return;

    const expiresAt = new Date(this._tokens.expiresAt).getTime();
    const now = Date.now();
    const refreshTime = expiresAt - (5 * 60 * 1000); // 5 minutes before expiry
    const delay = Math.max(refreshTime - now, 60000); // At least 1 minute

    this._refreshTimer = setTimeout(async () => {
      try {
        if (this._tokens && this._config) {
          logger.info('Refreshing tokens automatically');
          this._tokens = await refreshToken(this._config, this._tokens);
          this._wsClient?.updateTokens(this._tokens);
          this._scheduleTokenRefresh(); // Schedule next refresh
        }
      } catch (error) {
        logger.error('Automatic token refresh failed', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }, delay);
  }

  /**
   * Setup graceful shutdown handlers
   */
  private _setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.shutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason: String(reason) });
      this.shutdown().then(() => process.exit(1));
    });
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
  const isService = args.includes('--service');

  // Initialize logger
  const logger = createLogger({
    service: 'gapjunction-agent',
    pretty: !isService, // Use JSON logging for service mode
  });

  try {
    const agent = new GapJunctionAgent();
    await agent.start(configPath);
  } catch (error) {
    logger.error('Agent startup failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    process.exit(1);
  }
}

// Start the agent if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { GapJunctionAgent };