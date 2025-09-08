import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { platform } from 'os';
import { join } from 'path';

import { Entry } from '@napi-rs/keyring';

import { updateConfigWithSidecars } from './config.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('sidecars');

const ORTHANC_KEYSTORE_SERVICE = 'gapjunction-orthanc';

interface SidecarInstallOptions {
  runtimeId: string;
  installOrthanc?: boolean;
  installSyncthing?: boolean;
  worklistPath?: string;
}

interface InstallResult {
  success: boolean;
  service: string;
  error?: string;
  details?: string;
}

/**
 * Generate a secure admin password for Orthanc
 */
function generateSecurePassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      result += chars[byte % chars.length];
    }
  }
  
  return result;
}

/**
 * Get the path to installer scripts
 */
function getInstallerScriptPath(scriptName: string): string {
  // Assuming the agent is running from the built location, find the tools directory
  const possiblePaths = [
    join(process.cwd(), 'tools', 'installers', 'windows', scriptName),
    join(__dirname, '..', '..', '..', 'tools', 'installers', 'windows', scriptName),
    join(process.cwd(), '..', '..', 'tools', 'installers', 'windows', scriptName),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(`Installer script not found: ${scriptName}. Searched paths: ${possiblePaths.join(', ')}`);
}

/**
 * Execute PowerShell script with elevated privileges
 */
function executePowerShellScript(scriptPath: string, args: string[] = []): Promise<InstallResult> {
  logger.info(`Executing PowerShell script: ${scriptPath}`);
  logger.info(`Arguments: ${args.join(' ')}`);

  return new Promise((resolve) => {
    // Build PowerShell command
    const psArgs = [
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-File', scriptPath,
      ...args
    ];

    const process = spawn('powershell.exe', psArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      logger.info(`PowerShell stdout: ${output.trim()}`);
    });

    process.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      logger.warn(`PowerShell stderr: ${output.trim()}`);
    });

    process.on('close', (code) => {
      const success = code === 0;
      const result: InstallResult = {
        success,
        service: scriptPath.includes('orthanc') ? 'Orthanc' : 'Syncthing',
        details: stdout,
      };

      if (!success) {
        result.error = stderr || `Process exited with code ${code}`;
        logger.error(`PowerShell script failed with code ${code}`, { stderr, stdout });
      } else {
        logger.info(`PowerShell script completed successfully`);
      }

      resolve(result);
    });

    process.on('error', (error) => {
      logger.error(`Failed to execute PowerShell script`, { error: error.message });
      resolve({
        success: false,
        service: scriptPath.includes('orthanc') ? 'Orthanc' : 'Syncthing',
        error: error.message,
      });
    });
  });
}

/**
 * Install Orthanc sidecar
 */
async function installOrthanc(runtimeId: string, worklistPath?: string): Promise<InstallResult> {
  try {
    logger.info('Starting Orthanc installation...');

    // Generate secure admin password
    const adminPassword = generateSecurePassword();
    
    // Store password in OS keystore
    try {
      const entry = new Entry(ORTHANC_KEYSTORE_SERVICE, runtimeId);
      entry.setPassword(adminPassword);
      logger.info('Admin password stored in OS keystore');
    } catch (error) {
      logger.error('Failed to store admin password in keystore', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }

    // Get installer script path
    const scriptPath = getInstallerScriptPath('install-orthanc.ps1');

    // Build arguments
    const args = [
      '-RuntimeId', runtimeId,
      '-AdminPassword', adminPassword,
    ];

    if (worklistPath) {
      args.push('-WorklistPath', worklistPath);
    }

    // Execute installer
    const result = await executePowerShellScript(scriptPath, args);

    if (result.success) {
      logger.info('Orthanc installation completed successfully');
    } else {
      logger.error('Orthanc installation failed', { error: result.error });
    }

    return result;

  } catch (error) {
    logger.error('Orthanc installation error', { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      service: 'Orthanc',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Install Syncthing sidecar
 */
async function installSyncthing(): Promise<InstallResult> {
  try {
    logger.info('Starting Syncthing installation...');

    // Get installer script path
    const scriptPath = getInstallerScriptPath('install-syncthing.ps1');

    // Execute installer (no additional arguments needed)
    const result = await executePowerShellScript(scriptPath);

    if (result.success) {
      logger.info('Syncthing installation completed successfully');
    } else {
      logger.error('Syncthing installation failed', { error: result.error });
    }

    return result;

  } catch (error) {
    logger.error('Syncthing installation error', { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      service: 'Syncthing',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if current platform supports sidecar installation
 */
function isSidecarSupportedPlatform(): boolean {
  return platform() === 'win32';
}

/**
 * Install sidecars based on configuration
 */
async function installSidecars(options: SidecarInstallOptions): Promise<InstallResult[]> {
  const results: InstallResult[] = [];

  // Check platform support
  if (!isSidecarSupportedPlatform()) {
    const unsupportedResult: InstallResult = {
      success: false,
      service: 'Platform Check',
      error: `Sidecar installation is not supported on platform: ${platform()}. Only Windows (win32) is currently supported.`,
    };
    logger.warn(unsupportedResult.error);
    return [unsupportedResult];
  }

  logger.info('Starting sidecar installation process', {
    runtimeId: options.runtimeId,
    installOrthanc: options.installOrthanc,
    installSyncthing: options.installSyncthing,
  });

  // Install Orthanc if requested
  if (options.installOrthanc) {
    logger.info('Installing Orthanc sidecar...');
    const orthancResult = await installOrthanc(options.runtimeId, options.worklistPath);
    results.push(orthancResult);
  }

  // Install Syncthing if requested
  if (options.installSyncthing) {
    logger.info('Installing Syncthing sidecar...');
    const syncthingResult = await installSyncthing();
    results.push(syncthingResult);
  }

  // Update agent configuration
  try {
    updateConfigWithSidecars(options.installOrthanc, options.installSyncthing);
    logger.info('Agent configuration updated with sidecar settings');
  } catch (error) {
    logger.error('Failed to update agent configuration', { error: error instanceof Error ? error.message : String(error) });
    results.push({
      success: false,
      service: 'Configuration Update',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Log summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  logger.info(`Sidecar installation completed`, {
    total: results.length,
    successful,
    failed,
    results: results.map(r => ({ service: r.service, success: r.success, error: r.error })),
  });

  return results;
}

/**
 * Get stored Orthanc admin password
 */
function getOrthancAdminPassword(runtimeId: string): string | null {
  try {
    const entry = new Entry(ORTHANC_KEYSTORE_SERVICE, runtimeId);
    const password = entry.getPassword();
    
    if (password) {
      logger.info('Orthanc admin password retrieved from OS keystore');
      return password;
    } else {
      logger.warn('No Orthanc admin password found in OS keystore');
      return null;
    }
  } catch (error) {
    logger.error('Failed to retrieve Orthanc admin password from keystore', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export {
  installSidecars,
  getOrthancAdminPassword,
  isSidecarSupportedPlatform,
  type SidecarInstallOptions,
  type InstallResult,
};