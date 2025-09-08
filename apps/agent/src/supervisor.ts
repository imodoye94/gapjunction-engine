import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

import { Entry } from '@napi-rs/keyring';
import getPort from 'get-port';

import type { NodeRedProcess, ChannelStatus, BundleInfo, AgentConfig } from './types.js';
import { createModuleLogger } from './logger.js';
import { getConfigPaths } from './config.js';

const logger = createModuleLogger('supervisor');

const DRAIN_TIMEOUT_MS = 8000;
const HEALTH_CHECK_TIMEOUT_MS = 5000;
const ADMIN_PASSWORD_LENGTH = 32;
const CRED_SECRET_LENGTH = 32;

export class NodeRedSupervisor {
  private _processes = new Map<string, NodeRedProcess>();

  constructor(private _config: AgentConfig) {}

  /**
   * Deploy and start a Node-RED process for a channel
   */
  async deploy(bundleInfo: BundleInfo, devicePrivateKey: string): Promise<void> {
    const { channelId, buildId } = bundleInfo;
    
    try {
      logger.info(`Deploying Node-RED for channel: ${channelId}`, { buildId });

      // Stop existing process if running
      if (this._processes.has(channelId)) {
        await this.stop(channelId);
      }

      // Generate admin credentials
      const adminPassword = this._generatePassword(ADMIN_PASSWORD_LENGTH);
      const credSecret = this._generatePassword(CRED_SECRET_LENGTH);

      // Store admin password in keystore
      await this._storeAdminPassword(channelId, adminPassword);

      // Get available port
      const port = await getPort({ port: getPort.makeRange(3000, 4000) });

      // Prepare Node-RED settings
      await this._prepareSettings(bundleInfo, adminPassword, credSecret, port);

      // Start Node-RED process
      const nodeRedProcess = await this._startNodeRed(bundleInfo, port, adminPassword, credSecret);

      // Wait for Node-RED to be ready
      await this._waitForReady(port);

      // Deploy flows
      await this._deployFlows(bundleInfo, port, adminPassword);

      logger.info(`Node-RED deployed successfully`, { channelId, buildId, port, pid: nodeRedProcess.pid });

    } catch (error) {
      logger.error(`Failed to deploy Node-RED`, { 
        error: error instanceof Error ? error.message : String(error),
        channelId,
        buildId 
      });
      throw error;
    }
  }

  /**
   * Start a channel (if not already running)
   */
  async start(channelId: string): Promise<void> {
    const process = this._processes.get(channelId);
    
    if (!process) {
      throw new Error(`No process found for channel: ${channelId}`);
    }

    if (process.process.killed) {
      throw new Error(`Process for channel ${channelId} is not running`);
    }

    logger.info(`Channel already running`, { channelId, pid: process.pid });
  }

  /**
   * Stop a channel with optional drain time
   */
  async stop(channelId: string, drainMs?: number): Promise<void> {
    const process = this._processes.get(channelId);
    
    if (!process) {
      logger.warn(`No process found for channel: ${channelId}`);
      return;
    }

    try {
      logger.info(`Stopping Node-RED for channel: ${channelId}`, { pid: process.pid, drainMs });

      // Set flows to stopped state if drain time is specified
      if (drainMs && drainMs > 0) {
        await this._setFlowsState(process, 'stop');
        await this._sleep(Math.min(drainMs, DRAIN_TIMEOUT_MS));
      }

      // Graceful shutdown
      process.process.kill('SIGTERM');

      // Wait for graceful shutdown
      await this._waitForExit(process.process, 5000);

      // Force kill if still running
      if (!process.process.killed) {
        logger.warn(`Force killing Node-RED process`, { channelId, pid: process.pid });
        process.process.kill('SIGKILL');
      }

      // Clean up
      this._processes.delete(channelId);
      await this._clearAdminPassword(channelId);

      logger.info(`Node-RED stopped`, { channelId });

    } catch (error) {
      logger.error(`Failed to stop Node-RED`, { 
        error: error instanceof Error ? error.message : String(error),
        channelId 
      });
      throw error;
    }
  }

  /**
   * Restart a channel
   */
  async restart(channelId: string): Promise<void> {
    logger.info(`Restarting channel: ${channelId}`);
    
    // Get current bundle info before stopping
    const process = this._processes.get(channelId);
    if (!process) {
      throw new Error(`No process found for channel: ${channelId}`);
    }

    // Stop current process
    await this.stop(channelId);

    // TODO: Restart with same bundle - need to store bundle info
    throw new Error('Restart not fully implemented - need bundle info persistence');
  }

  /**
   * Get status of all channels
   */
  getStatus(): ChannelStatus[] {
    const statuses: ChannelStatus[] = [];

    for (const [channelId, process] of this._processes) {
      const status: ChannelStatus = {
        channelId,
        state: process.process.killed ? 'error' : 'running',
        pid: process.pid,
        port: process.port,
        buildId: process.buildId,
        startedAt: process.startedAt.toISOString(),
        // TODO: Add CPU and memory usage
      };

      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get status of a specific channel
   */
  getChannelStatus(channelId: string): ChannelStatus | null {
    const process = this._processes.get(channelId);
    
    if (!process) {
      return {
        channelId,
        state: 'stopped',
      };
    }

    return {
      channelId,
      state: process.process.killed ? 'error' : 'running',
      pid: process.pid,
      port: process.port,
      buildId: process.buildId,
      startedAt: process.startedAt.toISOString(),
    };
  }

  /**
   * Generate a secure password
   */
  private _generatePassword(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }

  /**
   * Store admin password in keystore
   */
  private async _storeAdminPassword(channelId: string, password: string): Promise<void> {
    try {
      const entry = new Entry('gapjunction-agent-admin', channelId);
      entry.setPassword(password);
    } catch (error) {
      logger.error('Failed to store admin password', { 
        error: error instanceof Error ? error.message : String(error),
        channelId 
      });
      throw error;
    }
  }

  /**
   * Clear admin password from keystore
   */
  private async _clearAdminPassword(channelId: string): Promise<void> {
    try {
      const entry = new Entry('gapjunction-agent-admin', channelId);
      entry.deletePassword();
    } catch (error) {
      logger.warn('Failed to clear admin password', { 
        error: error instanceof Error ? error.message : String(error),
        channelId 
      });
    }
  }

  /**
   * Prepare Node-RED settings file
   */
  private async _prepareSettings(
    bundleInfo: BundleInfo,
    adminPassword: string,
    credSecret: string,
    port: number
  ): Promise<void> {
    try {
      // Read original settings
      let settings = readFileSync(bundleInfo.settingsPath, 'utf8');

      // Hash admin password (simplified - in real implementation use bcrypt)
      const hashedPassword = Buffer.from(adminPassword).toString('base64');

      // Replace placeholders
      settings = settings
        .replace(/credentialSecret:\s*['"][^'"]*['"]/, `credentialSecret: '${credSecret}'`)
        .replace(/adminAuth:\s*{[^}]*}/, `adminAuth: {
          type: "credentials",
          users: [{
            username: "gapjunction-agent",
            password: "${hashedPassword}",
            permissions: "*"
          }]
        }`)
        .replace(/disableEditor:\s*\w+/, 'disableEditor: true')
        .replace(/httpAdminRoot:\s*['"][^'"]*['"]/, `httpAdminRoot: '${this._config.security.nodeRedAdminPath}'`)
        .replace(/uiPort:\s*\d+/, `uiPort: ${port}`)
        .replace(/uiHost:\s*['"][^'"]*['"]/, `uiHost: '${this._config.security.apiAdminHost}'`)
        .replace(/runtimeState:\s*{[^}]*}/, `runtimeState: {
          enabled: true,
          ui: false
        }`)
        .replace(/diagnostics:\s*{[^}]*}/, `diagnostics: {
          enabled: true,
          ui: false
        }`);

      // Write updated settings
      writeFileSync(bundleInfo.settingsPath, settings);

    } catch (error) {
      logger.error('Failed to prepare settings', { 
        error: error instanceof Error ? error.message : String(error),
        channelId: bundleInfo.channelId 
      });
      throw error;
    }
  }

  /**
   * Start Node-RED process
   */
  private async _startNodeRed(
    bundleInfo: BundleInfo,
    port: number,
    adminPassword: string,
    credSecret: string
  ): Promise<NodeRedProcess> {
    const paths = getConfigPaths();
    const runtimeDir = join(paths.channelsDir, bundleInfo.channelId, 'runtime');
    const logsDir = join(runtimeDir, 'logs');

    // Ensure directories exist
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // Start Node-RED process
    const child = spawn(this._config.nodeRed.bin, [
      '-s', bundleInfo.settingsPath,
      '--userDir', bundleInfo.buildDir
    ], {
      cwd: bundleInfo.buildDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_RED_CREDENTIAL_SECRET: credSecret,
      },
    });

    // Setup logging
    const outLogPath = join(logsDir, 'node-red.out.log');
    const errLogPath = join(logsDir, 'node-red.err.log');

    child.stdout?.on('data', (data: Buffer) => {
      writeFileSync(outLogPath, data, { flag: 'a' });
    });

    child.stderr?.on('data', (data: Buffer) => {
      writeFileSync(errLogPath, data, { flag: 'a' });
    });

    // Write PID file
    const pidPath = join(runtimeDir, 'pid');
    writeFileSync(pidPath, child.pid?.toString() || '');

    const nodeRedProcess: NodeRedProcess = {
      channelId: bundleInfo.channelId,
      buildId: bundleInfo.buildId,
      pid: child.pid || 0,
      port,
      process: child,
      startedAt: new Date(),
      adminPassword,
      credSecret,
    };

    this._processes.set(bundleInfo.channelId, nodeRedProcess);

    return nodeRedProcess;
  }

  /**
   * Wait for Node-RED to be ready
   */
  private async _waitForReady(port: number): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/diagnostics`, {
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });

        if (response.ok) {
          logger.info('Node-RED is ready', { port });
          return;
        }
      } catch (error) {
        // Expected during startup
      }

      if (attempt < maxAttempts) {
        await this._sleep(delayMs);
      }
    }

    throw new Error(`Node-RED failed to start within ${maxAttempts * delayMs}ms`);
  }

  /**
   * Deploy flows to Node-RED
   */
  private async _deployFlows(bundleInfo: BundleInfo, port: number, adminPassword: string): Promise<void> {
    try {
      const flows = JSON.parse(readFileSync(bundleInfo.flowsPath, 'utf8'));
      const auth = Buffer.from(`gapjunction-agent:${adminPassword}`).toString('base64');

      const response = await fetch(`http://127.0.0.1:${port}/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(flows),
      });

      if (!response.ok) {
        throw new Error(`Failed to deploy flows: ${response.status} ${response.statusText}`);
      }

      logger.info('Flows deployed successfully', { channelId: bundleInfo.channelId });

    } catch (error) {
      logger.error('Failed to deploy flows', { 
        error: error instanceof Error ? error.message : String(error),
        channelId: bundleInfo.channelId 
      });
      throw error;
    }
  }

  /**
   * Set flows state (start/stop)
   */
  private async _setFlowsState(process: NodeRedProcess, state: 'start' | 'stop'): Promise<void> {
    try {
      const auth = Buffer.from(`gapjunction-agent:${process.adminPassword}`).toString('base64');

      const response = await fetch(`http://127.0.0.1:${process.port}/flows/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set flows state: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      logger.warn('Failed to set flows state', { 
        error: error instanceof Error ? error.message : String(error),
        channelId: process.channelId,
        state 
      });
    }
  }

  /**
   * Wait for process to exit
   */
  private async _waitForExit(process: any, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, timeoutMs);

      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private async _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}