import { ConfigService } from '@nestjs/config';
import { NexonTemplate, TemplateFetchOptions, TemplateValidationResult } from './types';
/**
 * Service for fetching and managing Nexon templates
 * Supports both local filesystem and remote API sources
 */
export declare class NexonTemplateService {
    private readonly configService;
    private readonly logger;
    private readonly templateCache;
    private readonly defaultCacheTtl;
    constructor(configService: ConfigService);
    /**
     * Fetch a Nexon template by ID and version
     */
    fetchTemplate(nexonId: string, version?: string, options?: TemplateFetchOptions): Promise<NexonTemplate>;
    /**
     * Validate a Nexon template
     */
    validateTemplate(template: NexonTemplate): Promise<TemplateValidationResult>;
    /**
     * List available templates from all sources
     */
    listTemplates(): Promise<Array<{
        id: string;
        version: string;
        source: 'local' | 'remote';
    }>>;
    /**
     * Clear template cache
     */
    clearCache(templateKey?: string): void;
    /**
     * Fetch template from local filesystem
     */
    private fetchFromLocal;
    /**
     * Fetch template from remote API
     */
    private fetchFromRemote;
    /**
     * List templates from local filesystem
     */
    private listLocalTemplates;
    /**
     * List templates from remote API
     */
    private listRemoteTemplates;
    /**
     * Get cached template if valid
     */
    private getCachedTemplate;
    /**
     * Cache a template
     */
    private cacheTemplate;
    /**
     * Validate manifest structure
     */
    private validateManifest;
    /**
     * Validate template structure
     */
    private validateTemplateStructure;
    /**
     * Check template compatibility
     */
    private checkCompatibility;
    /**
     * Get local base path for templates
     */
    private getLocalBasePath;
    /**
     * Get remote base URL for templates
     */
    private getRemoteBaseUrl;
    /**
     * Add authentication headers to request
     */
    private addAuthHeaders;
    /**
     * Calculate checksum for content
     */
    private calculateChecksum;
}
//# sourceMappingURL=nexon-template.service.d.ts.map