import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import axios from 'axios';
/**
 * Service for fetching and managing Nexon templates
 * Supports both local filesystem and remote API sources
 */
let NexonTemplateService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var NexonTemplateService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            NexonTemplateService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        configService;
        logger = new Logger(NexonTemplateService.name);
        templateCache = new Map();
        defaultCacheTtl = 3600; // 1 hour in seconds
        constructor(configService) {
            this.configService = configService;
        }
        /**
         * Fetch a Nexon template by ID and version
         */
        async fetchTemplate(nexonId, version, options) {
            const templateKey = `${nexonId}@${version || 'latest'}`;
            this.logger.debug('Fetching Nexon template', { nexonId, version, templateKey });
            // Check cache first (unless force refresh is requested)
            if (!options?.forceRefresh) {
                const cached = this.getCachedTemplate(templateKey);
                if (cached) {
                    this.logger.debug('Returning cached template', { templateKey });
                    return cached;
                }
            }
            try {
                // Try local source first
                const localTemplate = await this.fetchFromLocal(nexonId, version, options);
                if (localTemplate) {
                    this.cacheTemplate(templateKey, localTemplate);
                    return localTemplate;
                }
                // Fall back to remote source
                const remoteTemplate = await this.fetchFromRemote(nexonId, version, options);
                if (remoteTemplate) {
                    this.cacheTemplate(templateKey, remoteTemplate);
                    return remoteTemplate;
                }
                throw new Error(`Template not found: ${templateKey}`);
            }
            catch (error) {
                this.logger.error('Failed to fetch template', error, { nexonId, version });
                throw new Error(`Failed to fetch template ${templateKey}: ${error.message}`);
            }
        }
        /**
         * Validate a Nexon template
         */
        async validateTemplate(template) {
            this.logger.debug('Validating Nexon template', {
                templateId: template.manifest.id,
                version: template.manifest.version
            });
            const errors = [];
            const warnings = [];
            try {
                // Validate manifest structure
                const manifestValidation = this.validateManifest(template.manifest);
                errors.push(...manifestValidation.errors);
                warnings.push(...manifestValidation.warnings);
                // Validate template structure
                const templateValidation = this.validateTemplateStructure(template.template);
                errors.push(...templateValidation.errors);
                warnings.push(...templateValidation.warnings);
                // Check compatibility
                const compatibility = await this.checkCompatibility(template.manifest);
                if (!compatibility.compatible) {
                    warnings.push(...(compatibility.issues || []));
                }
                const result = {
                    valid: errors.length === 0,
                    errors: errors.length > 0 ? errors : undefined,
                    warnings: warnings.length > 0 ? warnings : undefined,
                    compatibility
                };
                this.logger.debug('Template validation completed', {
                    templateId: template.manifest.id,
                    valid: result.valid,
                    errorCount: errors.length,
                    warningCount: warnings.length
                });
                return result;
            }
            catch (error) {
                this.logger.error('Template validation failed', error, {
                    templateId: template.manifest.id
                });
                return {
                    valid: false,
                    errors: [`Validation error: ${error.message}`]
                };
            }
        }
        /**
         * List available templates from all sources
         */
        async listTemplates() {
            const templates = [];
            try {
                // List local templates
                const localTemplates = await this.listLocalTemplates();
                templates.push(...localTemplates.map(t => ({ ...t, source: 'local' })));
                // List remote templates
                const remoteTemplates = await this.listRemoteTemplates();
                templates.push(...remoteTemplates.map(t => ({ ...t, source: 'remote' })));
                this.logger.debug('Listed templates', { count: templates.length });
                return templates;
            }
            catch (error) {
                this.logger.error('Failed to list templates', error);
                throw new Error(`Failed to list templates: ${error.message}`);
            }
        }
        /**
         * Clear template cache
         */
        clearCache(templateKey) {
            if (templateKey) {
                this.templateCache.delete(templateKey);
                this.logger.debug('Cleared cache for template', { templateKey });
            }
            else {
                this.templateCache.clear();
                this.logger.debug('Cleared entire template cache');
            }
        }
        /**
         * Fetch template from local filesystem
         */
        async fetchFromLocal(nexonId, version, options) {
            try {
                const basePath = this.getLocalBasePath();
                const templateDir = path.resolve(basePath, nexonId);
                this.logger.debug('Attempting to fetch template from local filesystem', {
                    nexonId,
                    version,
                    basePath,
                    templateDir
                });
                // Check if template directory exists
                try {
                    await fs.access(templateDir);
                    this.logger.debug('Template directory exists', { templateDir });
                }
                catch (error) {
                    this.logger.debug('Template directory not found', { templateDir, error: error.message });
                    return null; // Template not found locally
                }
                // Load manifest
                const manifestPath = path.join(templateDir, 'manifest.json');
                const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                const manifest = JSON.parse(manifestContent);
                // Check version compatibility
                if (version && version !== 'latest' && manifest.version !== version) {
                    return null; // Version mismatch
                }
                // Load template
                const templatePath = path.join(templateDir, 'template.json');
                const templateContent = await fs.readFile(templatePath, 'utf-8');
                const template = JSON.parse(templateContent);
                // Calculate checksum
                const checksum = this.calculateChecksum(manifestContent + templateContent);
                const nexonTemplate = {
                    manifest,
                    template,
                    source: {
                        type: 'local',
                        path: templateDir,
                        checksum
                    }
                };
                this.logger.debug('Fetched template from local filesystem', {
                    nexonId,
                    version: manifest.version,
                    path: templateDir
                });
                return nexonTemplate;
            }
            catch (error) {
                this.logger.debug('Failed to fetch from local filesystem', error, { nexonId, version });
                return null;
            }
        }
        /**
         * Fetch template from remote API
         */
        async fetchFromRemote(nexonId, version, options) {
            try {
                const baseUrl = this.getRemoteBaseUrl();
                if (!baseUrl) {
                    return null; // No remote source configured
                }
                const url = `${baseUrl}/templates/${nexonId}${version ? `/${version}` : ''}`;
                const timeout = options?.timeout || 10000;
                // Prepare request headers
                const headers = {
                    'Accept': 'application/json',
                    'User-Agent': 'GapJunction-Compiler/1.0'
                };
                // Add authentication if provided
                if (options?.auth) {
                    this.addAuthHeaders(headers, options.auth);
                }
                this.logger.debug('Fetching template from remote API', { url, nexonId, version });
                const response = await axios.get(url, {
                    headers,
                    timeout,
                    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
                });
                if (response.status === 404) {
                    return null; // Template not found
                }
                if (response.status !== 200) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = response.data;
                // Validate response structure
                if (!data.manifest || !data.template) {
                    throw new Error('Invalid template response structure');
                }
                const nexonTemplate = {
                    manifest: data.manifest,
                    template: data.template,
                    source: {
                        type: 'remote',
                        url,
                        checksum: data.checksum || this.calculateChecksum(JSON.stringify(data))
                    }
                };
                this.logger.debug('Fetched template from remote API', {
                    nexonId,
                    version: data.manifest.version,
                    url
                });
                return nexonTemplate;
            }
            catch (error) {
                this.logger.debug('Failed to fetch from remote API', error, { nexonId, version });
                return null;
            }
        }
        /**
         * List templates from local filesystem
         */
        async listLocalTemplates() {
            try {
                const basePath = this.getLocalBasePath();
                const templates = [];
                try {
                    const entries = await fs.readdir(basePath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            try {
                                const manifestPath = path.join(basePath, entry.name, 'manifest.json');
                                const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                                const manifest = JSON.parse(manifestContent);
                                templates.push({
                                    id: manifest.id,
                                    version: manifest.version
                                });
                            }
                            catch {
                                // Skip invalid templates
                                continue;
                            }
                        }
                    }
                }
                catch {
                    // Base path doesn't exist or is not accessible
                    return [];
                }
                return templates;
            }
            catch (error) {
                this.logger.error('Failed to list local templates', error);
                return [];
            }
        }
        /**
         * List templates from remote API
         */
        async listRemoteTemplates() {
            try {
                const baseUrl = this.getRemoteBaseUrl();
                if (!baseUrl) {
                    return [];
                }
                const url = `${baseUrl}/templates`;
                const response = await axios.get(url, {
                    timeout: 10000,
                    validateStatus: (status) => status < 500
                });
                if (response.status !== 200) {
                    return [];
                }
                const data = response.data;
                if (!Array.isArray(data.templates)) {
                    return [];
                }
                return data.templates.map((t) => ({
                    id: t.id,
                    version: t.version
                }));
            }
            catch (error) {
                this.logger.debug('Failed to list remote templates', error);
                return [];
            }
        }
        /**
         * Get cached template if valid
         */
        getCachedTemplate(templateKey) {
            const cached = this.templateCache.get(templateKey);
            if (!cached) {
                return null;
            }
            // Check if cache entry is still valid
            const now = Date.now();
            const cacheTime = new Date(cached.timestamp).getTime();
            const ttlMs = cached.ttl * 1000;
            if (now - cacheTime > ttlMs) {
                this.templateCache.delete(templateKey);
                return null;
            }
            return cached.template;
        }
        /**
         * Cache a template
         */
        cacheTemplate(templateKey, template) {
            const cacheEntry = {
                template,
                timestamp: new Date().toISOString(),
                ttl: this.defaultCacheTtl,
                checksum: template.source.checksum || ''
            };
            this.templateCache.set(templateKey, cacheEntry);
        }
        /**
         * Validate manifest structure
         */
        validateManifest(manifest) {
            const errors = [];
            const warnings = [];
            // Required fields
            if (!manifest.id)
                errors.push('Manifest missing required field: id');
            if (!manifest.version)
                errors.push('Manifest missing required field: version');
            if (!manifest.title)
                errors.push('Manifest missing required field: title');
            if (!manifest.capabilities)
                errors.push('Manifest missing required field: capabilities');
            if (!manifest.parameters)
                errors.push('Manifest missing required field: parameters');
            // Version format validation
            if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
                warnings.push('Version should follow semantic versioning format');
            }
            return { errors, warnings };
        }
        /**
         * Validate template structure
         */
        validateTemplateStructure(template) {
            const errors = [];
            const warnings = [];
            if (!Array.isArray(template)) {
                errors.push('Template must be an array of nodes');
            }
            else if (template.length === 0) {
                warnings.push('Template has no nodes');
            }
            // Validate nodes
            template?.forEach((node, index) => {
                if (!node.id)
                    errors.push(`Node ${index} missing required field: id`);
                if (!node.type)
                    errors.push(`Node ${index} missing required field: type`);
            });
            return { errors, warnings };
        }
        /**
         * Check template compatibility
         */
        async checkCompatibility(manifest) {
            const issues = [];
            // Check compiler version compatibility
            if (manifest.compatibility?.minCompilerVersion) {
                // In a real implementation, you would compare with the actual compiler version
                // For now, we'll assume compatibility
            }
            // Check Node-RED version compatibility
            if (manifest.compatibility?.nodeRedVersion) {
                // Check if the required Node-RED version is available
            }
            return {
                compatible: issues.length === 0,
                issues: issues.length > 0 ? issues : undefined
            };
        }
        /**
         * Get local base path for templates
         */
        getLocalBasePath() {
            let configPath;
            // Safely get config path, handle case where configService might not be available
            try {
                configPath = this.configService?.get('NEXON_LOCAL_PATH');
            }
            catch (error) {
                this.logger.debug('ConfigService not available, using default path');
            }
            if (configPath) {
                return configPath;
            }
            // Default path - handle both monorepo root and app-specific contexts
            const cwd = process.cwd();
            let basePath;
            if (cwd.includes('apps' + path.sep + 'compiler')) {
                // Running from apps/compiler, go up to monorepo root
                // Find the monorepo root by going up until we find the packages directory
                let currentPath = cwd;
                while (currentPath !== path.dirname(currentPath)) {
                    const packagesPath = path.join(currentPath, 'packages');
                    try {
                        const fs = require('fs');
                        if (fs.existsSync(packagesPath)) {
                            basePath = path.join(packagesPath, 'nexon-catalog');
                            break;
                        }
                    }
                    catch {
                        // Continue searching
                    }
                    currentPath = path.dirname(currentPath);
                }
                // Fallback if not found
                if (!basePath) {
                    basePath = path.resolve(cwd, '../../packages/nexon-catalog');
                }
            }
            else {
                // Running from monorepo root
                basePath = path.resolve(cwd, 'packages/nexon-catalog');
            }
            this.logger.debug('Using local base path', { basePath, cwd });
            return basePath;
        }
        /**
         * Get remote base URL for templates
         */
        getRemoteBaseUrl() {
            return this.configService.get('NEXON_REMOTE_URL') || null;
        }
        /**
         * Add authentication headers to request
         */
        addAuthHeaders(headers, auth) {
            switch (auth.type) {
                case 'bearer':
                    if (auth.token) {
                        headers['Authorization'] = `Bearer ${auth.token}`;
                    }
                    break;
                case 'basic':
                    if (auth.username && auth.password) {
                        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                        headers['Authorization'] = `Basic ${credentials}`;
                    }
                    break;
                case 'apikey':
                    if (auth.apikey) {
                        headers['X-API-Key'] = auth.apikey;
                    }
                    break;
            }
        }
        /**
         * Calculate checksum for content
         */
        calculateChecksum(content) {
            return createHash('sha256').update(content).digest('hex');
        }
    };
    return NexonTemplateService = _classThis;
})();
export { NexonTemplateService };
//# sourceMappingURL=nexon-template.service.js.map