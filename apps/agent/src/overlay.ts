import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { platform } from 'os';

import type { OverlayState, AgentConfig } from './types.js';
import { createModuleLogger } from './logger.js';
import { getConfigPaths } from './config.js';

const logger = createModuleLogger('overlay');

const DN_CLIENT_URLS = {
  win32: 'https://dl.defined.net/981d7bb1/v0.8.3/windows/amd64/DNClient-Server.msi',
  darwin: 'https://dl.defined.net/981d7bb1/v0.8.3/macos/dnclient',
  linux: 'https://dl.defined.net/981d7bb1/v0.8.3/linux/amd64/dnclient',
} as const;

export class OverlayManager {
  private _state: OverlayState | null = null;

  constructor(private _config: AgentConfig) {}

  /**
   * Initialize overlay manager and load state
   */
  async initialize(): Promise<void> {
    if (!this._config.overlay.enabled) {
      logger.info('Overlay networking is disabled');
      return;
    }

    try {
      this._state = this._loadState();
      logger.info('Overlay manager initialized', { state: this._state });
    } catch (error) {
      logger.error('Failed to initialize overlay manager', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Enroll in Defined Networking with enrollment code
   */
  async enroll(enrollmentCode: string): Promise<void> {
    if (!this._config.overlay.enabled) {
      throw new Error('Overlay networking is disabled');
    }

    try {
      logger.info('Starting DN enrollment process');

      // Download DN client if not present
      await this._ensureDNClient();

      // Enroll with the provided code
      await this._performEnrollment(enrollmentCode);

      // Update state
      this._state = {
        dnEnrolled: true,
        nebulaIp: await this._getNebulaIP(),
        hostId: await this._getHostID(),
      };

      this._saveState();
      logger.info('DN enrollment completed successfully', { state: this._state });

    } catch (error) {
      logger.error('DN enrollment failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Get current overlay state
   */
  getState(): OverlayState | null {
    return this._state;
  }

  /**
   * Check if enrolled in overlay network
   */
  isEnrolled(): boolean {
    return this._state?.dnEnrolled === true;
  }

  /**
   * Get Nebula IP if available
   */
  getNebulaIP(): string | undefined {
    return this._state?.nebulaIp;
  }

  /**
   * Get Host ID if available
   */
  getHostID(): string | undefined {
    return this._state?.hostId;
  }

  /**
   * Load overlay state from disk
   */
  private _loadState(): OverlayState | null {
    const paths = getConfigPaths();
    const statePath = join(paths.stateDir, 'overlay.json');

    try {
      if (!existsSync(statePath)) {
        return {
          dnEnrolled: false,
        };
      }

      const content = readFileSync(statePath, 'utf8');
      return JSON.parse(content) as OverlayState;

    } catch (error) {
      logger.warn('Failed to load overlay state, using defaults', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        dnEnrolled: false,
      };
    }
  }

  /**
   * Save overlay state to disk
   */
  private _saveState(): void {
    if (!this._state) return;

    const paths = getConfigPaths();
    const statePath = join(paths.stateDir, 'overlay.json');

    try {
      // Ensure state directory exists
      if (!existsSync(paths.stateDir)) {
        mkdirSync(paths.stateDir, { recursive: true });
      }

      writeFileSync(statePath, JSON.stringify(this._state, null, 2));
      logger.debug('Overlay state saved', { statePath });

    } catch (error) {
      logger.error('Failed to save overlay state', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Ensure DN client is downloaded and available
   */
  private async _ensureDNClient(): Promise<void> {
    const platformType = platform() as keyof typeof DN_CLIENT_URLS;
    const downloadUrl = DN_CLIENT_URLS[platformType];

    if (!downloadUrl) {
      throw new Error(`Unsupported platform for DN client: ${platformType}`);
    }

    const paths = getConfigPaths();
    const binDir = join(paths.binDir, 'dn');
    const clientPath = this._getDNClientPath(binDir);

    // Check if client already exists
    if (existsSync(clientPath)) {
      logger.info('DN client already exists', { clientPath });
      return;
    }

    try {
      logger.info('Downloading DN client', { downloadUrl, clientPath });

      // Ensure bin directory exists
      if (!existsSync(binDir)) {
        mkdirSync(binDir, { recursive: true });
      }

      // Download the client
      await this._downloadFile(downloadUrl, clientPath);

      // Make executable on Unix-like systems
      if (platformType !== 'win32') {
        await this._executeCommand('chmod', ['+x', clientPath]);
      }

      logger.info('DN client downloaded successfully', { clientPath });

    } catch (error) {
      logger.error('Failed to download DN client', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Perform DN enrollment with the provided code
   */
  private async _performEnrollment(enrollmentCode: string): Promise<void> {
    const platformType = platform();
    const paths = getConfigPaths();
    const binDir = join(paths.binDir, 'dn');
    const clientPath = this._getDNClientPath(binDir);

    try {
      if (platformType === 'win32') {
        // Windows enrollment process
        // 1. Install the MSI package
        await this._executeCommand('msiexec', [
            '/i', clientPath, '/quiet', '/norestart'
        ]);
        
        // 2. Enroll with the code using the installed executable
        const installedClientPath = 'C:\\Program Files\\Defined Networking\\DNClient\\dnclient.exe';
        await this._executeCommand('powershell', [
            '-Command',
            `& '${installedClientPath}' enroll -code ${enrollmentCode}`
        ]);
      } else {
        // Unix-like enrollment process
        await this._executeCommand('sudo', [clientPath, 'install']);
        await this._executeCommand('sudo', [clientPath, 'start']);
        await this._executeCommand('sudo', [clientPath, 'enroll', '-code', enrollmentCode]);
      }

      logger.info('DN enrollment command executed successfully');

    } catch (error) {
      logger.error('DN enrollment command failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Get DN client path for the platform
   */
  private _getDNClientPath(binDir: string): string {
    const platformType = platform();
    
    switch (platformType) {
      case 'win32':
        return join(binDir, 'DNClient-Server.msi');
      default:
        return join(binDir, 'dnclient');
    }
  }

  /**
   * Download file from URL
   */
  private async _downloadFile(url: string, filePath: string): Promise<void> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      writeFileSync(filePath, Buffer.from(buffer));

    } catch (error) {
      logger.error('File download failed', { 
        error: error instanceof Error ? error.message : String(error),
        url,
        filePath 
      });
      throw error;
    }
  }

  /**
   * Execute command and return output
   */
  private async _executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Get Nebula IP from DN client (stub implementation)
   */
  private async _getNebulaIP(): Promise<string | undefined> {
    try {
      // TODO: Implement actual DN client status query
      logger.debug('Getting Nebula IP (stub implementation)');
      return undefined;
    } catch (error) {
      logger.warn('Failed to get Nebula IP', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return undefined;
    }
  }

  /**
   * Get Host ID from DN client (stub implementation)
   */
  private async _getHostID(): Promise<string | undefined> {
    try {
      // TODO: Implement actual DN client status query
      logger.debug('Getting Host ID (stub implementation)');
      return undefined;
    } catch (error) {
      logger.warn('Failed to get Host ID', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return undefined;
    }
  }
}