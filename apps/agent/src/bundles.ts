import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';

import { extract } from 'tar-stream';

import type { BundleManifest, CredentialsMap, AgentConfig } from './types.js';
import { createModuleLogger } from './logger.js';
import { getConfigPaths } from './config.js';
import { decryptSecretPayload } from './identity.js';

const logger = createModuleLogger('bundles');

export interface BundleInfo {
  channelId: string;
  buildId: string;
  mode: 'TEST' | 'PROD';
  buildDir: string;
  manifest: BundleManifest;
  flowsPath: string;
  settingsPath: string;
  credentialsMapPath?: string;
}

/**
 * Extract bundle from base64 content
 */
async function extractBundle(
  channelId: string,
  buildId: string,
  bundleContent: string,
  secretPayload?: Uint8Array,
  devicePrivateKey?: string
): Promise<BundleInfo> {
  const paths = getConfigPaths();
  const buildDir = join(paths.channelsDir, channelId, 'builds', buildId);

  try {
    // Ensure build directory exists
    if (!existsSync(buildDir)) {
      mkdirSync(buildDir, { recursive: true });
    }

    logger.info(`Extracting bundle to: ${buildDir}`, { channelId, buildId });

    // Decode base64 bundle content
    const bundleBuffer = Buffer.from(bundleContent, 'base64');
    
    // Extract tar stream
    const extractStream = extract();
    const files: Record<string, Buffer> = {};

    extractStream.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = [];
      
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      stream.on('end', () => {
        files[header.name] = Buffer.concat(chunks);
        next();
      });
      
      stream.resume();
    });

    // Process the bundle
    await new Promise<void>((resolve, reject) => {
      extractStream.on('finish', () => resolve());
      extractStream.on('error', reject);
      extractStream.write(bundleBuffer);
      extractStream.end();
    });

    // Validate required files
    if (!files['manifest.json']) {
      throw new Error('Bundle missing manifest.json');
    }

    if (!files['flows.json']) {
      throw new Error('Bundle missing flows.json');
    }

    if (!files['settings.js']) {
      throw new Error('Bundle missing settings.js');
    }

    // Parse manifest
    const manifest = JSON.parse(files['manifest.json'].toString('utf8')) as BundleManifest;
    
    // Validate manifest
    if (manifest.channelId !== channelId || manifest.buildId !== buildId) {
      throw new Error('Bundle manifest does not match expected channel/build IDs');
    }

    // Write manifest
    const manifestPath = join(buildDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Write flows.json
    const flowsPath = join(buildDir, 'flows.json');
    let flowsContent = files['flows.json'].toString('utf8');

    // Process credentials if we have secrets
    if (files['credentials.map.json'] && secretPayload && devicePrivateKey) {
      logger.info('Processing encrypted secrets');
      
      const credentialsMap = JSON.parse(files['credentials.map.json'].toString('utf8')) as CredentialsMap;
      const secrets = decryptSecretPayload(secretPayload, devicePrivateKey);
      
      // Replace credential references in flows
      flowsContent = replaceCredentialReferences(flowsContent, credentialsMap, secrets);
      
      // Write credentials map for reference
      const credentialsMapPath = join(buildDir, 'credentials.map.json');
      writeFileSync(credentialsMapPath, JSON.stringify(credentialsMap, null, 2));
    }

    writeFileSync(flowsPath, flowsContent);

    // Write settings.js
    const settingsPath = join(buildDir, 'settings.js');
    writeFileSync(settingsPath, files['settings.js']);

    logger.info('Bundle extracted successfully', { channelId, buildId, buildDir });

    return {
      channelId,
      buildId,
      mode: manifest.mode,
      buildDir,
      manifest,
      flowsPath,
      settingsPath,
      credentialsMapPath: files['credentials.map.json'] ? join(buildDir, 'credentials.map.json') : undefined,
    };

  } catch (error) {
    logger.error('Failed to extract bundle', { 
      error: error instanceof Error ? error.message : String(error),
      channelId,
      buildId 
    });
    throw error;
  }
}

/**
 * Replace credential references in flows JSON with actual secrets
 */
function replaceCredentialReferences(
  flowsContent: string,
  credentialsMap: CredentialsMap,
  secrets: Record<string, string>
): string {
  let processedContent = flowsContent;

  // Replace each credential reference with the actual secret value
  for (const [credentialRef, secretKey] of Object.entries(credentialsMap)) {
    if (secrets[secretKey]) {
      // Replace all occurrences of the credential reference
      const regex = new RegExp(escapeRegExp(credentialRef), 'g');
      processedContent = processedContent.replace(regex, secrets[secretKey]);
    } else {
      logger.warn(`Secret not found for credential reference: ${credentialRef} -> ${secretKey}`);
    }
  }

  return processedContent;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get current build for a channel
 */
function getCurrentBuild(channelId: string): BundleInfo | null {
  const paths = getConfigPaths();
  const currentLink = join(paths.channelsDir, channelId, 'runtime', 'current');

  try {
    if (!existsSync(currentLink)) {
      return null;
    }

    // Read the symlink target (should point to ../builds/<buildId>)
    const target = readFileSync(currentLink, 'utf8').trim();
    const buildId = target.split('/').pop();

    if (!buildId) {
      return null;
    }

    const buildDir = join(paths.channelsDir, channelId, 'builds', buildId);
    const manifestPath = join(buildDir, 'manifest.json');

    if (!existsSync(manifestPath)) {
      return null;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BundleManifest;

    return {
      channelId,
      buildId,
      mode: manifest.mode,
      buildDir,
      manifest,
      flowsPath: join(buildDir, 'flows.json'),
      settingsPath: join(buildDir, 'settings.js'),
      credentialsMapPath: existsSync(join(buildDir, 'credentials.map.json')) 
        ? join(buildDir, 'credentials.map.json') 
        : undefined,
    };

  } catch (error) {
    logger.error('Failed to get current build', { 
      error: error instanceof Error ? error.message : String(error),
      channelId 
    });
    return null;
  }
}

/**
 * Set current build for a channel (create/update symlink)
 */
function setCurrentBuild(channelId: string, buildId: string): void {
  const paths = getConfigPaths();
  const runtimeDir = join(paths.channelsDir, channelId, 'runtime');
  const currentLink = join(runtimeDir, 'current');
  const target = `../builds/${buildId}`;

  try {
    // Ensure runtime directory exists
    if (!existsSync(runtimeDir)) {
      mkdirSync(runtimeDir, { recursive: true });
    }

    // Remove existing symlink if it exists
    if (existsSync(currentLink)) {
      // On Windows, we need to handle this differently
      if (process.platform === 'win32') {
        writeFileSync(currentLink, target);
      } else {
        // Unix-like systems can use actual symlinks
        const fs = require('fs');
        if (fs.lstatSync(currentLink).isSymbolicLink()) {
          fs.unlinkSync(currentLink);
        }
        fs.symlinkSync(target, currentLink);
      }
    } else {
      if (process.platform === 'win32') {
        writeFileSync(currentLink, target);
      } else {
        const fs = require('fs');
        fs.symlinkSync(target, currentLink);
      }
    }

    logger.info('Current build updated', { channelId, buildId });

  } catch (error) {
    logger.error('Failed to set current build', { 
      error: error instanceof Error ? error.message : String(error),
      channelId,
      buildId 
    });
    throw error;
  }
}

export {
  extractBundle,
  getCurrentBuild,
  setCurrentBuild,
};