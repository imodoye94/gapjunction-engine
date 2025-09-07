const POSITION_OFFSET = 100;
const DEFAULT_POSITION = { x: POSITION_OFFSET, y: POSITION_OFFSET };
export class ArtifactsService {
    _nexonTemplateService;
    _parameterSubstitutionService;
    _idGenerator;
    constructor(_nexonTemplateService, _parameterSubstitutionService, _idGenerator) {
        this._nexonTemplateService = _nexonTemplateService;
        this._parameterSubstitutionService = _parameterSubstitutionService;
        this._idGenerator = _idGenerator;
    }
    /**
     * Generate all artifacts for a compiled channel
     */
    async generateArtifacts(channel, options) {
        try {
            const flowsJson = await this._generateFlowsJson(channel, options);
            const settings = this._generateSettings(channel, options);
            const manifest = this._generateManifest(channel, options);
            const credentialsMap = this._generateCredentialsMap(channel, options);
            return {
                flowsJson,
                settings,
                manifest,
                credentialsMap,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to generate artifacts: ${errorMessage}`);
        }
    }
    /**
     * Generate Node-RED flows.json from channel IR
     */
    async _generateFlowsJson(channel, options) {
        const flows = [];
        // Create main flow tab
        const flowTab = {
            id: this._idGenerator.generateFlowId(channel.channelId),
            label: channel.title,
            type: 'tab',
            disabled: false,
            info: channel.documentation ?? '',
        };
        flows.push(flowTab);
        // Generate nodes for each stage
        const nodeIdMap = new Map(); // stageId -> nodeIds[]
        for (const stage of channel.stages) {
            try {
                const stageNodes = await this._generateStageNodes(stage, channel, flowTab.id, options);
                flows.push(...stageNodes);
                // Track node IDs for wiring
                nodeIdMap.set(stage.id, stageNodes.map((node) => node.id));
            }
            catch (error) {
                // Generate fallback node
                const fallbackNode = this._generateFallbackNode(stage, flowTab.id, options);
                flows.push(fallbackNode);
                nodeIdMap.set(stage.id, [fallbackNode.id]);
            }
        }
        // Wire nodes based on channel edges
        this._wireNodes(flows, channel.edges, nodeIdMap);
        return flows;
    }
    /**
     * Generate Node-RED nodes for a stage using Nexon templates
     */
    async _generateStageNodes(stage, channel, flowTabId, options) {
        // Fetch and validate Nexon template
        const nexonTemplate = await this._nexonTemplateService.fetchTemplate(stage.nexonId, stage.nexonVersion);
        const validation = await this._nexonTemplateService.validateTemplate(nexonTemplate);
        if (!validation.valid) {
            throw new Error(`Invalid template: ${validation.errors?.join(', ')}`);
        }
        // Create substitution context
        const substitutionContext = {
            parameters: {
                ...(stage.params ?? {}),
                // Add flow context for template substitution
                flow: {
                    id: flowTabId,
                },
            },
            stage: {
                id: stage.id,
                ...(stage.title ? { title: stage.title } : {}),
            },
            channel: {
                channelId: channel.channelId,
                title: channel.title,
            },
            runtime: {
                buildId: options.buildId,
                target: options.target ?? channel.runtime.target,
            },
        };
        // Substitute parameters in template
        const substitutionResult = await this._parameterSubstitutionService.substituteParameters(nexonTemplate.template, substitutionContext, nexonTemplate.manifest.parameters);
        if (!substitutionResult.success) {
            throw new Error(`Parameter substitution failed: ${substitutionResult.errors?.join(', ')}`);
        }
        // Process template nodes (template is now a flat array of nodes)
        const templateNodes = Array.isArray(substitutionResult.value) ? substitutionResult.value : [];
        const processedNodes = templateNodes.map((templateNode) => {
            const node = templateNode;
            const nodeId = this._idGenerator.generateNodeId(stage.id, String(node['id']));
            return {
                ...node,
                id: nodeId,
                z: flowTabId,
                x: (stage.position?.x ?? DEFAULT_POSITION.x) + (Number(node['x']) || 0),
                y: (stage.position?.y ?? DEFAULT_POSITION.y) + (Number(node['y']) || 0),
                wires: node['wires'] ?? [[]],
            };
        });
        return processedNodes;
    }
    /**
     * Generate fallback node when template processing fails
     */
    _generateFallbackNode(stage, flowTabId, _options) {
        const nodeId = this._idGenerator.generateFallbackNodeId(stage.id);
        return {
            id: nodeId,
            type: this._mapNexonToNodeRedType(stage.nexonId),
            z: flowTabId,
            name: stage.title ?? stage.id,
            x: stage.position?.x ?? DEFAULT_POSITION.x,
            y: stage.position?.y ?? DEFAULT_POSITION.y,
            wires: [[]],
            ...this._mapStageParams(stage),
        };
    }
    /**
     * Wire nodes based on channel edges
     */
    _wireNodes(flows, edges, nodeIdMap) {
        const nodeMap = new Map();
        flows.forEach((flow) => {
            const flowObj = flow;
            if (flowObj['type'] !== 'tab') {
                nodeMap.set(String(flowObj['id']), flowObj);
            }
        });
        // Process each edge
        edges.forEach((edge) => {
            const fromNodeIds = nodeIdMap.get(edge.from.stageId) ?? [];
            const toNodeIds = nodeIdMap.get(edge.to.stageId) ?? [];
            // Wire from last node of source stage to first node of target stage
            if (fromNodeIds.length > 0 && toNodeIds.length > 0) {
                const fromNodeId = fromNodeIds[fromNodeIds.length - 1];
                const toNodeId = toNodeIds[0];
                const fromNode = fromNodeId ? nodeMap.get(fromNodeId) : undefined;
                if (fromNode) {
                    // Ensure wires array exists
                    fromNode['wires'] ??= [[]];
                    const wires = fromNode['wires'];
                    if (!Array.isArray(wires[0])) {
                        wires[0] = [];
                    }
                    // Add connection
                    if (toNodeId && !wires[0].includes(toNodeId)) {
                        wires[0].push(toNodeId);
                    }
                }
            }
        });
    }
    /**
     * Generate secure Node-RED settings.js
     */
    _generateSettings(channel, options) {
        const isProduction = options.mode === 'PROD';
        const isCloud = (options.target ?? channel.runtime.target) === 'cloud';
        return {
            // Flow File and User Directory Settings
            flowFile: 'flows.json',
            flowFilePretty: true,
            // Security settings - disable UI for headless operation
            httpAdminRoot: false,
            httpNodeRoot: "/gj/api",
            requireHttps: isProduction,
            // CORS settings
            httpNodeCors: {
                origin: isProduction ? false : '*',
                credentials: false,
                methods: "GET,PUT,POST,DELETE"
            },
            // Runtime Settings
            runtimeState: {
                enabled: false,
                ui: false,
            },
            // Diagnostics configuration
            diagnostics: {
                enabled: isProduction,
                ui: false,
            },
            // Logging configuration
            logging: {
                console: {
                    level: isProduction ? 'warn' : 'info',
                    metrics: false,
                    audit: isProduction,
                },
                file: isProduction
                    ? {
                        level: 'info',
                        filename: '/var/log/nodered/nodered.log',
                        maxFiles: 5,
                        maxSize: '10m',
                    }
                    : undefined,
            },
            // Context Storage - disabled for security
            exportGlobalContextKeys: false,
            contextStorage: false,
            // External Modules configuration
            externalModules: {
                autoInstall: false,
                palette: {
                    allowInstall: false,
                    allowUpdate: false,
                    allowUpload: false,
                },
                modules: {
                    allowInstall: false,
                },
            },
            // Function node settings
            functionExternalModules: false,
            functionTimeout: 0,
            functionGlobalContext: {
                // Channel metadata
                channelId: channel.channelId,
                buildId: options.buildId,
                mode: options.mode,
                target: options.target ?? channel.runtime.target,
                // Security context
                security: {
                    allowInternetHttpOut: channel.security?.allowInternetHttpOut ?? false,
                    allowInternetTcpOut: channel.security?.allowInternetTcpOut ?? false,
                    allowInternetUdpOut: channel.security?.allowInternetUdpOut ?? false,
                    allowHttpInPublic: channel.security?.allowHttpInPublic ?? false,
                },
            },
            // Cloud-specific settings
            ...(isCloud && {
                credentialSecret: false,
                userDir: '/app/data',
            }),
            // On-premises specific settings
            ...(!isCloud && {
                userDir: './data',
            }),
        };
    }
    /**
     * Generate bundle manifest.json
     */
    _generateManifest(channel, options) {
        return {
            version: 1,
            channelId: channel.channelId,
            buildId: options.buildId,
            mode: options.mode,
            artifacts: {
                flowsJsonPath: './flows.json',
                settingsPath: './settings.js',
                credentialsMapPath: './credentials.map.json',
            },
        };
    }
    /**
     * Generate credentials.map.json for secret reference mapping
     */
    _generateCredentialsMap(channel, options) {
        const credentialsMap = {};
        // Extract secret references from stage parameters
        channel.stages.forEach((stage) => {
            if (stage.params) {
                this._extractSecretReferences(stage.params, stage.id, credentialsMap);
            }
        });
        return {
            version: 1,
            channelId: channel.channelId,
            buildId: options.buildId,
            credentials: credentialsMap,
        };
    }
    /**
     * Recursively extract secret references from parameters
     */
    _extractSecretReferences(params, prefix, credentialsMap) {
        if (!params || typeof params !== 'object') {
            return;
        }
        Object.entries(params).forEach(([key, value]) => {
            const fullKey = `${prefix}.${key}`;
            if (value && typeof value === 'object') {
                if ('secret' in value) {
                    // This is a secret reference
                    const secretRef = value['secret'];
                    credentialsMap[fullKey] = {
                        type: 'secretRef',
                        ref: secretRef['ref'],
                        envVar: this._generateEnvVarName(fullKey),
                    };
                }
                else {
                    // Recurse into nested objects
                    this._extractSecretReferences(value, fullKey, credentialsMap);
                }
            }
        });
    }
    /**
     * Generate environment variable name for secret reference
     */
    _generateEnvVarName(key) {
        return `GJ_SECRET_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    }
    /**
     * Map Nexon ID to Node-RED node type
     */
    _mapNexonToNodeRedType(nexonId) {
        const mapping = {
            'http.request': 'http request',
            'http.listener': 'http in',
            'tcp.listener': 'tcp in',
            'tcp.client': 'tcp out',
            'file.read': 'file in',
            'file.write': 'file',
            'database.query': 'function',
            'email.send': 'e-mail',
            'transform.json': 'json',
            'transform.xml': 'xml',
            'function': 'function',
        };
        return mapping[nexonId] ?? 'function';
    }
    /**
     * Map stage parameters to Node-RED node properties
     */
    _mapStageParams(stage) {
        // Basic parameter mapping - this would be expanded based on nexon types
        const params = stage.params ?? {};
        const mapped = {};
        // Common parameter mappings
        Object.entries(params).forEach(([key, value]) => {
            if (value && typeof value === 'object' && 'secret' in value) {
                // Handle secret references - map to environment variable
                mapped[key] = `\${${this._generateEnvVarName(`${stage.id}.${key}`)}}`;
            }
            else {
                mapped[key] = value;
            }
        });
        return mapped;
    }
}
//# sourceMappingURL=artifacts.service.js.map