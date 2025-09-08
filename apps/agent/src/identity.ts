import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { platform, hostname, arch } from 'os';
import { join } from 'path';

import { Entry } from '@napi-rs/keyring';
import { box } from 'tweetnacl';

import { getConfigPaths, updateConfigWithSidecars } from './config.js';
import { createModuleLogger } from './logger.js';
import type { DeviceIdentity, TokenState, AgentConfig } from './types.js';

const logger = createModuleLogger('identity');

const KEYSTORE_SERVICE = 'gapjunction-agent';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

/**
 * Generate a machine fingerprint for device identification
 */
function generateMachineFingerprint(): string {
  const components = [
    platform(),
    hostname(),
    arch(),
    process.env['USER'] || process.env['USERNAME'] || 'unknown',
  ];
  
  // Add some entropy but keep it deterministic per machine
  const machineData = components.join('|');
  const hash = randomBytes(32);
  hash.write(machineData, 0, 'utf8');
  
  return hash.toString('hex').substring(0, 32);
}

/**
 * Generate X25519 keypair for device identity
 */
function generateDeviceKeypair(): { publicKey: string; privateKey: string } {
  const keypair = box.keyPair();
  
  return {
    publicKey: Buffer.from(keypair.publicKey).toString('base64'),
    privateKey: Buffer.from(keypair.secretKey).toString('base64'),
  };
}

/**
 * Load or create device identity
 */
function loadOrCreateIdentity(): DeviceIdentity {
  const paths = getConfigPaths();
  const identityPath = join(paths.stateDir, 'identity.json');
  
  try {
    // Ensure state directory exists
    if (!existsSync(paths.stateDir)) {
      mkdirSync(paths.stateDir, { recursive: true });
    }
    
    // Try to load existing identity
    if (existsSync(identityPath)) {
      logger.info('Loading existing device identity');
      const content = readFileSync(identityPath, 'utf8');
      const identity = JSON.parse(content) as DeviceIdentity;
      
      // Validate identity structure
      if (identity.deviceId && identity.devicePublicKey && identity.devicePrivateKey && identity.machineFingerprint) {
        return identity;
      }
      
      logger.warn('Invalid identity file, regenerating');
    }
    
    // Create new identity
    logger.info('Creating new device identity');
    const keypair = generateDeviceKeypair();
    const machineFingerprint = generateMachineFingerprint();
    const deviceId = `dev_${randomBytes(16).toString('hex')}`;
    
    const identity: DeviceIdentity = {
      deviceId,
      devicePublicKey: keypair.publicKey,
      devicePrivateKey: keypair.privateKey,
      machineFingerprint,
      issuedAt: new Date().toISOString(),
    };
    
    // Save identity to disk
    writeFileSync(identityPath, JSON.stringify(identity, null, 2));
    logger.info(`Device identity created: ${deviceId}`);
    
    return identity;
    
  } catch (error) {
    logger.error('Failed to load or create device identity', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Store tokens in OS keystore
 */
function storeTokens(runtimeId: string, tokens: TokenState): void {
  try {
    const entry = new Entry(KEYSTORE_SERVICE, runtimeId);
    const tokenData = Buffer.from(JSON.stringify(tokens)).toString('base64');
    entry.setPassword(tokenData);
    logger.info('Tokens stored in keystore');
  } catch (error) {
    logger.error('Failed to store tokens in keystore', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Retrieve tokens from OS keystore
 */
function retrieveTokens(runtimeId: string): TokenState | null {
  try {
    const entry = new Entry(KEYSTORE_SERVICE, runtimeId);
    const tokenData = entry.getPassword();
    
    if (!tokenData) {
      return null;
    }
    
    const tokens = JSON.parse(Buffer.from(tokenData, 'base64').toString('utf8')) as TokenState;
    logger.info('Tokens retrieved from keystore');
    return tokens;
    
  } catch (error) {
    logger.warn('Failed to retrieve tokens from keystore', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Clear tokens from OS keystore
 */
function clearTokens(runtimeId: string): void {
  try {
    const entry = new Entry(KEYSTORE_SERVICE, runtimeId);
    entry.deletePassword();
    logger.info('Tokens cleared from keystore');
  } catch (error) {
    logger.warn('Failed to clear tokens from keystore', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Check if JWT token needs refresh
 */
function needsRefresh(tokens: TokenState): boolean {
  try {
    const expiresAt = new Date(tokens.expiresAt).getTime();
    const now = Date.now();
    const refreshTime = expiresAt - TOKEN_REFRESH_BUFFER_MS;
    
    return now >= refreshTime;
  } catch (error) {
    logger.warn('Failed to check token expiry', { error: error instanceof Error ? error.message : String(error) });
    return true; // Assume needs refresh on error
  }
}

/**
 * Enroll device with control API using bootstrap token
 */
async function enrollDevice(config: AgentConfig, identity: DeviceIdentity): Promise<TokenState> {
  if (!config.bootstrapToken) {
    throw new Error('Bootstrap token is required for enrollment');
  }
  
  try {
    logger.info('Enrolling device with control API');
    
    const enrollmentData = {
      runtimeId: config.runtimeId,
      bootstrapToken: config.bootstrapToken,
      devicePublicKey: identity.devicePublicKey,
      machineFingerprint: identity.machineFingerprint,
    };
    
    const response = await fetch(`${config.control.baseUrl}/v1/agents/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrollmentData),
    });
    
    if (!response.ok) {
      throw new Error(`Enrollment failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json() as {
      agentJwt: string;
      refreshToken: string;
      expiresAt: string;
      installOrthanc?: boolean;
      installSyncthing?: boolean;
    };
    
    const tokens: TokenState = {
      agentJwt: result.agentJwt,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };
    
    // Store tokens and clear bootstrap token
    storeTokens(config.runtimeId, tokens);
    
    // Handle sidecar installation if requested
    if (result.installOrthanc !== undefined || result.installSyncthing !== undefined) {
      logger.info('Sidecar installation requested', {
        installOrthanc: result.installOrthanc,
        installSyncthing: result.installSyncthing,
      });
      
      try {
        // Update config with sidecar flags
        updateConfigWithSidecars(result.installOrthanc, result.installSyncthing);
        
        // Import and run sidecar installation (dynamic import to avoid circular dependencies)
        const { installSidecars, isSidecarSupportedPlatform } = await import('./sidecars.js');
        
        if (isSidecarSupportedPlatform()) {
          const installOptions = {
            runtimeId: config.runtimeId,
          } as any;
          
          if (result.installOrthanc !== undefined) {
            installOptions.installOrthanc = result.installOrthanc;
          }
          
          if (result.installSyncthing !== undefined) {
            installOptions.installSyncthing = result.installSyncthing;
          }
          
          const installResults = await installSidecars(installOptions);
          
          const successful = installResults.filter(r => r.success);
          const failed = installResults.filter(r => !r.success);
          
          if (successful.length > 0) {
            logger.info(`Successfully installed ${successful.length} sidecar(s)`, {
              services: successful.map(r => r.service),
            });
          }
          
          if (failed.length > 0) {
            logger.warn(`Failed to install ${failed.length} sidecar(s)`, {
              failures: failed.map(r => ({ service: r.service, error: r.error })),
            });
          }
        } else {
          logger.warn('Sidecar installation requested but platform not supported');
        }
      } catch (error) {
        logger.error('Sidecar installation failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't fail enrollment if sidecar installation fails
      }
    }
    
    logger.info('Device enrollment successful');
    return tokens;
    
  } catch (error) {
    logger.error('Device enrollment failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Refresh JWT token using refresh token
 */
async function refreshToken(config: AgentConfig, tokens: TokenState): Promise<TokenState> {
  try {
    logger.info('Refreshing JWT token');
    
    const response = await fetch(`${config.control.baseUrl}/v1/agents/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.refreshToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json() as {
      agentJwt: string;
      refreshToken: string;
      expiresAt: string;
    };
    
    const newTokens: TokenState = {
      agentJwt: result.agentJwt,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };
    
    // Store updated tokens
    storeTokens(config.runtimeId, newTokens);
    logger.info('JWT token refreshed successfully');
    
    return newTokens;
    
  } catch (error) {
    logger.error('Token refresh failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Decrypt sealed secret payload using device private key
 */
function decryptSecretPayload(encryptedPayload: Uint8Array, devicePrivateKey: string): Record<string, string> {
  try {
    const privateKey = Buffer.from(devicePrivateKey, 'base64');
    const decrypted = box.open(encryptedPayload, new Uint8Array(24), new Uint8Array(32), privateKey);
    
    if (!decrypted) {
      throw new Error('Failed to decrypt secret payload');
    }
    
    const secretsJson = Buffer.from(decrypted).toString('utf8');
    return JSON.parse(secretsJson) as Record<string, string>;
    
  } catch (error) {
    logger.error('Failed to decrypt secret payload', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export {
  loadOrCreateIdentity,
  storeTokens,
  retrieveTokens,
  clearTokens,
  needsRefresh,
  enrollDevice,
  refreshToken,
  decryptSecretPayload,
};