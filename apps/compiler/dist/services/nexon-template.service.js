import { readFile } from 'fs/promises';
import { join } from 'path';
import axios from 'axios';
export class NexonTemplateService {
    _templateCache = new Map();
    _localPath;
    _remoteUrl;
    constructor() {
        this._localPath = process.env['NEXON_LOCAL_PATH'] ?? 'packages/nexon-catalog';
        this._remoteUrl = process.env['NEXON_REMOTE_URL'];
    }
    /**
     * Fetch a Nexon template from local filesystem or remote source
     */
    async fetchTemplate(nexonId, version) {
        const cacheKey = `${nexonId}@${version ?? 'latest'}`;
        // Check cache first
        if (this._templateCache.has(cacheKey)) {
            const cached = this._templateCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        console.log('Fetching template', { nexonId, version });
        try {
            // Try local filesystem first
            const template = await this._fetchFromLocal(nexonId, version);
            this._templateCache.set(cacheKey, template);
            return template;
        }
        catch (localError) {
            console.warn('Local template fetch failed, trying remote', { nexonId, error: localError });
            if (this._remoteUrl) {
                try {
                    const template = await this._fetchFromRemote(nexonId, version);
                    this._templateCache.set(cacheKey, template);
                    return template;
                }
                catch (remoteError) {
                    console.error('Remote template fetch failed', { nexonId, error: remoteError });
                    throw new Error(`Template not found: ${nexonId}@${version ?? 'latest'}`);
                }
            }
            else {
                throw new Error(`Template not found locally: ${nexonId}@${version ?? 'latest'}`);
            }
        }
    }
    /**
     * Validate template structure and manifest
     */
    async validateTemplate(template) {
        const errors = [];
        try {
            // Validate manifest structure
            if (!template.manifest) {
                errors.push('Template missing manifest');
            }
            else {
                if (!template.manifest.id)
                    errors.push('Manifest missing id');
                if (!template.manifest.version)
                    errors.push('Manifest missing version');
                if (!template.manifest.title)
                    errors.push('Manifest missing title');
                if (!template.manifest.parameters)
                    errors.push('Manifest missing parameters');
            }
            // Validate template structure
            if (!template.template) {
                errors.push('Template missing template array');
            }
            else if (!Array.isArray(template.template)) {
                errors.push('Template must be an array of Node-RED nodes');
            }
            return {
                valid: errors.length === 0,
                errors: errors,
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Template validation error: ${error.message}`]
            };
        }
    }
    /**
     * List available templates (local only for now)
     */
    async listTemplates() {
        // This would scan the local directory for available templates
        // For now, return a placeholder list
        return ['http.request', 'tcp.listener', 'function'];
    }
    /**
     * Clear template cache
     */
    clearCache(templateKey) {
        if (templateKey) {
            this._templateCache.delete(templateKey);
        }
        else {
            this._templateCache.clear();
        }
    }
    /**
     * Fetch template from local filesystem
     */
    async _fetchFromLocal(nexonId, version) {
        const templateDir = join(this._localPath, nexonId);
        try {
            // Read manifest
            const manifestPath = join(templateDir, 'manifest.json');
            const manifestContent = await readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);
            // Read template
            const templatePath = join(templateDir, 'template.json');
            const templateContent = await readFile(templatePath, 'utf8');
            const template = JSON.parse(templateContent);
            return { manifest, template };
        }
        catch (error) {
            throw new Error(`Failed to load local template ${nexonId}: ${error.message}`);
        }
    }
    /**
     * Fetch template from remote API
     */
    async _fetchFromRemote(nexonId, version) {
        if (!this._remoteUrl) {
            throw new Error('Remote URL not configured');
        }
        const url = `${this._remoteUrl}/templates/${nexonId}${version ? `/${version}` : ''}`;
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch remote template ${nexonId}: ${error.message}`);
        }
    }
}
//# sourceMappingURL=nexon-template.service.js.map