import type { ChannelIR, BundleManifest } from '@gapjunction/ir-schema';
import type { IdGeneratorService } from './id-generator.service.js';
import type { NexonTemplateService } from './nexon-template.service.js';
import type { ParameterSubstitutionService } from './parameter-substitution.service.js';
export interface ArtifactGenerationOptions {
    buildId: string;
    mode: 'TEST' | 'PROD';
    target?: 'onprem' | 'cloud';
}
export interface GeneratedArtifacts {
    flowsJson: unknown;
    settings: unknown;
    manifest: BundleManifest;
    credentialsMap: unknown;
}
export interface NodeRedFlow {
    id: string;
    label: string;
    type: 'tab';
    disabled: boolean;
    info?: string;
    env?: unknown[];
}
export interface NodeRedNode {
    id: string;
    type: string;
    z: string;
    name?: string;
    x: number;
    y: number;
    wires: string[][];
    [key: string]: unknown;
}
export declare class ArtifactsService {
    private readonly _nexonTemplateService;
    private readonly _parameterSubstitutionService;
    private readonly _idGenerator;
    constructor(_nexonTemplateService: NexonTemplateService, _parameterSubstitutionService: ParameterSubstitutionService, _idGenerator: IdGeneratorService);
    /**
     * Generate all artifacts for a compiled channel
     */
    generateArtifacts(channel: ChannelIR, options: ArtifactGenerationOptions): Promise<GeneratedArtifacts>;
    /**
     * Generate Node-RED flows.json from channel IR
     */
    private _generateFlowsJson;
    /**
     * Generate Node-RED nodes for a stage using Nexon templates
     */
    private _generateStageNodes;
    /**
     * Generate fallback node when template processing fails
     */
    private _generateFallbackNode;
    /**
     * Wire nodes based on channel edges
     */
    private _wireNodes;
    /**
     * Generate secure Node-RED settings.js
     */
    private _generateSettings;
    /**
     * Generate bundle manifest.json
     */
    private _generateManifest;
    /**
     * Generate credentials.map.json for secret reference mapping
     */
    private _generateCredentialsMap;
    /**
     * Recursively extract secret references from parameters
     */
    private _extractSecretReferences;
    /**
     * Generate environment variable name for secret reference
     */
    private _generateEnvVarName;
    /**
     * Map Nexon ID to Node-RED node type
     */
    private _mapNexonToNodeRedType;
    /**
     * Map stage parameters to Node-RED node properties
     */
    private _mapStageParams;
}
//# sourceMappingURL=artifacts.service.d.ts.map