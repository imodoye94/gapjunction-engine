import { ChannelIR, BundleManifest } from '@gj/ir-schema';
import { NexonTemplateService } from '../nexon/nexon-template.service';
import { ParameterSubstitutionService } from '../nexon/parameter-substitution.service';
import { IdGeneratorService } from './id-generator.service';
export interface ArtifactGenerationOptions {
    buildId: string;
    mode: 'TEST' | 'PROD';
    target?: 'onprem' | 'cloud';
}
export interface GeneratedArtifacts {
    flowsJson: any;
    settings: any;
    manifest: BundleManifest;
    credentialsMap: any;
}
export interface NodeRedFlow {
    id: string;
    label: string;
    type: 'tab';
    disabled: boolean;
    info?: string;
    env?: any[];
}
export interface NodeRedNode {
    id: string;
    type: string;
    z: string;
    name?: string;
    x: number;
    y: number;
    wires: string[][];
    [key: string]: any;
}
export declare class ArtifactsService {
    private readonly nexonTemplateService;
    private readonly parameterSubstitutionService;
    private readonly idGenerator;
    private readonly logger;
    constructor(nexonTemplateService: NexonTemplateService, parameterSubstitutionService: ParameterSubstitutionService, idGenerator: IdGeneratorService);
    /**
     * Generate all artifacts for a compiled channel
     */
    generateArtifacts(channel: ChannelIR, options: ArtifactGenerationOptions): Promise<GeneratedArtifacts>;
    /**
     * Generate Node-RED flows.json from channel IR
     */
    generateFlowsJson(channel: ChannelIR, options: ArtifactGenerationOptions): Promise<any[]>;
    /**
     * Generate Node-RED nodes for a stage using Nexon templates
     */
    private generateStageNodes;
    /**
     * Generate fallback node when template processing fails
     */
    private generateFallbackNode;
    /**
     * Wire nodes based on channel edges
     */
    private wireNodes;
    /**
     * Generate secure Node-RED settings.js
     */
    generateSettings(channel: ChannelIR, options: ArtifactGenerationOptions): any;
    /**
     * Generate bundle manifest.json
     */
    generateManifest(channel: ChannelIR, options: ArtifactGenerationOptions): BundleManifest;
    /**
     * Generate credentials.map.json for secret reference mapping
     */
    generateCredentialsMap(channel: ChannelIR, options: ArtifactGenerationOptions): any;
    /**
     * Recursively extract secret references from parameters
     */
    private extractSecretReferences;
    /**
     * Generate environment variable name for secret reference
     */
    private generateEnvVarName;
    /**
     * Map Nexon ID to Node-RED node type
     */
    private mapNexonToNodeRedType;
    /**
     * Map stage parameters to Node-RED node properties
     */
    private mapStageParams;
}
//# sourceMappingURL=artifacts.service.d.ts.map