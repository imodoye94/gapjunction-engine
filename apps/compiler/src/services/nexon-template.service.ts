import { readFile } from 'fs/promises';
import { join } from 'path';

import axios from 'axios';

export interface NexonManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  capabilities: {
    network?: {
      httpOut?: boolean;
      tcpOut?: boolean;
      udpOut?: boolean;
    };
    filesystem?: {
      read?: boolean;
      write?: boolean;
    };
  };
  parameters: Record<string, {
    type: string;
    title: string;
    description: string;
    required: boolean;
    default?: unknown;
    validation?: unknown;
  }>;
}

export interface NexonTemplate {
  manifest: NexonManifest;
  template: unknown[];
}

export interface TemplateValidationResult {
  valid: boolean;
  errors?: string[];
}

export class NexonTemplateService {
  private readonly _templateCache = new Map<string, NexonTemplate>();
  private readonly _localPath: string;
  private readonly _remoteUrl: string | undefined;

  constructor() {
    this._localPath = process.env['NEXON_LOCAL_PATH'] ?? '../../packages/nexon-catalog';
    this._remoteUrl = process.env['NEXON_REMOTE_URL'];
  }

  /**
   * Fetch a Nexon template from local filesystem or remote source
   */
  async fetchTemplate(nexonId: string, version?: string): Promise<NexonTemplate> {
    const cacheKey = `${nexonId}@${version ?? 'latest'}`;
    
    // Check cache first
    if (this._templateCache.has(cacheKey)) {
      const cached = this._templateCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

   // logger.info('Fetching template', { nexonId, version });

    try {
      // Try local filesystem first
      const template = await this._fetchFromLocal(nexonId, version);
      this._templateCache.set(cacheKey, template);
      return template;
    } catch (_localError) {
     // logger.warn('Local template fetch failed, trying remote', { nexonId, error: _localError });
      
      if (this._remoteUrl) {
        try {
          const template = await this._fetchFromRemote(nexonId, version);
          this._templateCache.set(cacheKey, template);
          return template;
        } catch (_remoteError) {
         // logger.error('Remote template fetch failed', { nexonId, error: _remoteError });
         throw new Error(`Template not found: ${nexonId}@${version ?? 'latest'}`);
        }
      } else {
        throw new Error(`Template not found locally: ${nexonId}@${version ?? 'latest'}`);
      }
    }
  }

  /**
   * Validate template structure and manifest
   */
  validateTemplate(template: NexonTemplate): TemplateValidationResult {
    const errors: string[] = [];

    // Validate manifest structure
    if (!('manifest' in template)) {
      errors.push('Template missing manifest');
    }
    if (!template.manifest.id) errors.push('Manifest missing id');
    if (!template.manifest.version) errors.push('Manifest missing version');
    if (!template.manifest.title) errors.push('Manifest missing title');
    // if (!template.manifest.parameters) errors.push('Manifest missing parameters');

    // Validate template structure
    if (!('template' in template)) {
      errors.push('Template missing template array');
    }
    if (!Array.isArray(template.template)) {
      errors.push('Template must be an array of Node-RED nodes');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * List available templates (local only for now)
   */
  listTemplates(): string[] {
    // This would scan the local directory for available templates
    // For now, return a placeholder list
    return ['http.request', 'tcp.listener', 'function'];
  }

  /**
   * Clear template cache
   */
  clearCache(templateKey?: string): void {
    if (templateKey) {
      this._templateCache.delete(templateKey);
    } else {
      this._templateCache.clear();
    }
  }

  /**
   * Fetch template from local filesystem
   */
  private async _fetchFromLocal(nexonId: string, _version?: string): Promise<NexonTemplate> {
    const templateDir = join(this._localPath, nexonId);
    
    try {
      // Read manifest
      const manifestPath = join(templateDir, 'manifest.json');
      const manifestContent = await readFile(manifestPath, 'utf8');
      const manifest: NexonManifest = JSON.parse(manifestContent);
  
      // Read template
      const templatePath = join(templateDir, 'template.json');
      const templateContent = await readFile(templatePath, 'utf8');
      const template = JSON.parse(templateContent);
  
      return { manifest, template };
    } catch (error) {
     throw new Error(`Failed to load local template ${nexonId}: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch template from remote API
   */
  private async _fetchFromRemote(nexonId: string, version?: string): Promise<NexonTemplate> {
    if (!this._remoteUrl) {
      throw new Error('Remote URL not configured');
    }

    const url = `${this._remoteUrl}/templates/${nexonId}${version ? `/${version}` : ''}`;
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
     throw new Error(`Failed to fetch remote template ${nexonId}: ${(error as Error).message}`);
    }
  }
}