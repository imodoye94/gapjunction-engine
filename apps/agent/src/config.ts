import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';

import { cosmiconfigSync } from 'cosmiconfig';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import type { AgentConfig } from './types.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('config');

const DEFAULT_MQTT_PORT = 1883;
const DEFAULT_ADMIN_PORT = '1890';

export interface ConfigPaths {
  configDir: string;
  stateDir: string;
  channelsDir: string;
  mqttDir: string;
  binDir: string;
}

/**
 * Get platform-specific configuration paths
 */
function getConfigPaths(): ConfigPaths {
  const platformType = platform();
  let configDir: string;

  switch (platformType) {
    case 'win32': {
      configDir = process.env['PROGRAMDATA'] 
        ? join(process.env['PROGRAMDATA'], 'gapjunction')
        : join(homedir(), 'AppData', 'Local', 'gapjunction');
      break;
    }
    case 'darwin': {
      configDir = '/usr/local/var/gapjunction';
      break;
    }
    default: {
      // linux and others
      configDir = '/var/lib/gapjunction';
      break;
    }
  }

  return {
    configDir,
    stateDir: join(configDir, 'state'),
    channelsDir: join(configDir, 'channels'),
    mqttDir: join(configDir, 'mqtt'),
    binDir: join(configDir, 'bin'),
  };
}

/**
 * Validate agent configuration
 */
function validateConfig(config: unknown): AgentConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }

  const cfg = config as Record<string, unknown>;

  // Validate required fields
  if (!cfg['runtimeId'] || typeof cfg['runtimeId'] !== 'string') {
    throw new Error('runtimeId is required and must be a string');
  }

  if (!cfg['control'] || typeof cfg['control'] !== 'object') {
    throw new Error('control configuration is required');
  }

  const control = cfg['control'] as Record<string, unknown>;
  if (!control['baseUrl'] || typeof control['baseUrl'] !== 'string') {
    throw new Error('control.baseUrl is required and must be a string');
  }

  const runtimeId = cfg['runtimeId'] as string;
  const overlay = cfg['overlay'] as Record<string, unknown> | undefined;
  const mqtt = cfg['mqtt'] as Record<string, unknown> | undefined;
  const nodeRed = cfg['nodeRed'] as Record<string, unknown> | undefined;
  const security = cfg['security'] as Record<string, unknown> | undefined;
  const sidecars = cfg['sidecars'] as Record<string, unknown> | undefined;

  // Build validated config with defaults
  const validatedConfig: AgentConfig = {
    runtimeId,
    bootstrapToken: typeof cfg['bootstrapToken'] === 'string' ? cfg['bootstrapToken'] : undefined,
    control: {
      baseUrl: control['baseUrl'] as string,
      wsPath: typeof control['wsPath'] === 'string' ? control['wsPath'] as string : '/agents/ws',
    },
    overlay: {
      enabled: Boolean(overlay?.['enabled']),
      lighthouses: Array.isArray(overlay?.['lighthouses']) ? overlay['lighthouses'] as string[] : [],
    },
    mqtt: {
      enabled: mqtt ? Boolean(mqtt['enabled']) : true,
      host: mqtt && typeof mqtt['host'] === 'string' ? mqtt['host'] as string : '127.0.0.1',
      port: mqtt && typeof mqtt['port'] === 'number' ? mqtt['port'] as number : DEFAULT_MQTT_PORT,
    },
    nodeRed: {
      bin: nodeRed && typeof nodeRed['bin'] === 'string' ? nodeRed['bin'] as string : 'node-red',
    },
    security: {
      nodeRedAdminPath: security && typeof security['nodeRedAdminPath'] === 'string'
        ? security['nodeRedAdminPath'] as string
        : `/${runtimeId}__gj_admin__${Math.random().toString(36).substring(2)}`,
      apiAdminHost: security && typeof security['apiAdminHost'] === 'string'
        ? security['apiAdminHost'] as string
        : '127.0.0.1',
      apiAdminPort: security && typeof security['apiAdminPort'] === 'string'
        ? security['apiAdminPort'] as string
        : DEFAULT_ADMIN_PORT,
    },
  };

  // Add sidecars configuration if present
  if (sidecars && (typeof sidecars['installOrthanc'] === 'boolean' || typeof sidecars['installSyncthing'] === 'boolean')) {
    validatedConfig.sidecars = {};
    if (typeof sidecars['installOrthanc'] === 'boolean') {
      validatedConfig.sidecars.installOrthanc = sidecars['installOrthanc'] as boolean;
    }
    if (typeof sidecars['installSyncthing'] === 'boolean') {
      validatedConfig.sidecars.installSyncthing = sidecars['installSyncthing'] as boolean;
    }
  }

  return validatedConfig;
}

/**
 * Load configuration from agent.yaml or agent.json
 */
function loadConfig(configPath?: string): AgentConfig {
  const paths = getConfigPaths();
  
  try {
    // Try custom path first
    if (configPath && existsSync(configPath)) {
      logger.info(`Loading config from custom path: ${configPath}`);
      const content = readFileSync(configPath, 'utf8');
      const parsed = configPath.endsWith('.yaml') || configPath.endsWith('.yml')
        ? parseYaml(content)
        : JSON.parse(content);
      return validateConfig(parsed);
    }

    // Try standard locations
    const configFiles = [
      join(paths.configDir, 'agent.yaml'),
      join(paths.configDir, 'agent.yml'),
      join(paths.configDir, 'agent.json'),
    ];

    for (const file of configFiles) {
      if (existsSync(file)) {
        logger.info(`Loading config from: ${file}`);
        const content = readFileSync(file, 'utf8');
        const parsed = file.endsWith('.json') 
          ? JSON.parse(content)
          : parseYaml(content);
        return validateConfig(parsed);
      }
    }

    // Use cosmiconfig as fallback
    logger.info('Trying cosmiconfig for agent configuration');
    const explorer = cosmiconfigSync('agent');
    const result = explorer.search();
    
    if (result) {
      logger.info(`Config found via cosmiconfig: ${result.filepath}`);
      return validateConfig(result.config);
    }

    throw new Error('No configuration file found');

  } catch (error) {
    logger.error('Failed to load configuration', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Create default configuration template
 */
function createDefaultConfig(runtimeId: string, bootstrapToken: string, sidecars?: { installOrthanc?: boolean; installSyncthing?: boolean }): AgentConfig {
  const config: AgentConfig = {
    runtimeId,
    bootstrapToken,
    control: {
      baseUrl: 'https://api.gapjunction.io',
      wsPath: '/agents/ws',
    },
    overlay: {
      enabled: false,
      lighthouses: [],
    },
    mqtt: {
      enabled: true,
      host: '127.0.0.1',
      port: DEFAULT_MQTT_PORT,
    },
    nodeRed: {
      bin: 'node-red',
    },
    security: {
      nodeRedAdminPath: `/${runtimeId}__gj_admin__${Math.random().toString(36).substring(2)}`,
      apiAdminHost: '127.0.0.1',
      apiAdminPort: DEFAULT_ADMIN_PORT,
    },
  };

  if (sidecars && (sidecars.installOrthanc !== undefined || sidecars.installSyncthing !== undefined)) {
    config.sidecars = {};
    if (sidecars.installOrthanc !== undefined) {
      config.sidecars.installOrthanc = sidecars.installOrthanc;
    }
    if (sidecars.installSyncthing !== undefined) {
      config.sidecars.installSyncthing = sidecars.installSyncthing;
    }
  }

  return config;
}

/**
 * Write configuration to agent.yaml
 */
function writeConfig(config: AgentConfig, configPath?: string): void {
  const paths = getConfigPaths();
  
  try {
    const targetPath = configPath || join(paths.configDir, 'agent.yaml');
    
    // Ensure config directory exists
    mkdirSync(paths.configDir, { recursive: true });
    
    // Convert config to YAML and write
    const yamlContent = stringifyYaml(config, {
      indent: 2,
      lineWidth: 0,
      minContentWidth: 0,
    });
    
    writeFileSync(targetPath, yamlContent, 'utf8');
    logger.info(`Configuration written to: ${targetPath}`);
    
  } catch (error) {
    logger.error('Failed to write configuration', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Update existing configuration with new sidecar settings
 */
function updateConfigWithSidecars(installOrthanc?: boolean, installSyncthing?: boolean, configPath?: string): void {
  try {
    // Load existing config
    const config = loadConfig(configPath);
    
    // Update sidecars section
    if (installOrthanc !== undefined || installSyncthing !== undefined) {
      if (!config.sidecars) {
        config.sidecars = {};
      }
      
      if (installOrthanc !== undefined) {
        config.sidecars.installOrthanc = installOrthanc;
      }
      
      if (installSyncthing !== undefined) {
        config.sidecars.installSyncthing = installSyncthing;
      }
    }
    
    // Write updated config
    writeConfig(config, configPath);
    
  } catch (error) {
    logger.error('Failed to update configuration with sidecar settings', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export { getConfigPaths, loadConfig, createDefaultConfig, writeConfig, updateConfigWithSidecars };