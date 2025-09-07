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
        default?: any;
        validation?: any;
    }>;
}
export interface NexonTemplate {
    manifest: NexonManifest;
    template: any[];
}
export interface TemplateValidationResult {
    valid: boolean;
    errors?: string[];
}
export declare class NexonTemplateService {
    private readonly _templateCache;
    private readonly _localPath;
    private readonly _remoteUrl;
    constructor();
    /**
     * Fetch a Nexon template from local filesystem or remote source
     */
    fetchTemplate(nexonId: string, version?: string): Promise<NexonTemplate>;
    /**
     * Validate template structure and manifest
     */
    validateTemplate(template: NexonTemplate): Promise<TemplateValidationResult>;
    /**
     * List available templates (local only for now)
     */
    listTemplates(): Promise<string[]>;
    /**
     * Clear template cache
     */
    clearCache(templateKey?: string): void;
    /**
     * Fetch template from local filesystem
     */
    private _fetchFromLocal;
    /**
     * Fetch template from remote API
     */
    private _fetchFromRemote;
}
//# sourceMappingURL=nexon-template.service.d.ts.map