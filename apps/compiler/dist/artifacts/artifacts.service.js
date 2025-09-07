import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
let ArtifactsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ArtifactsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ArtifactsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        nexonTemplateService;
        parameterSubstitutionService;
        idGenerator;
        logger = new Logger(ArtifactsService.name);
        constructor(nexonTemplateService, parameterSubstitutionService, idGenerator) {
            this.nexonTemplateService = nexonTemplateService;
            this.parameterSubstitutionService = parameterSubstitutionService;
            this.idGenerator = idGenerator;
        }
        /**
         * Generate all artifacts for a compiled channel
         */
        async generateArtifacts(channel, options) {
            this.logger.log('Generating artifacts', {
                channelId: channel.channelId,
                buildId: options.buildId,
                mode: options.mode,
            });
            try {
                // Generate Node-RED flows.json
                const flowsJson = await this.generateFlowsJson(channel, options);
                // Generate Node-RED settings.js
                const settings = this.generateSettings(channel, options);
                // Generate bundle manifest.json
                const manifest = this.generateManifest(channel, options);
                // Generate credentials mapping
                const credentialsMap = this.generateCredentialsMap(channel, options);
                this.logger.log('Successfully generated all artifacts', {
                    channelId: channel.channelId,
                    buildId: options.buildId,
                    flowCount: Array.isArray(flowsJson) ? flowsJson.length : 0,
                });
                return {
                    flowsJson,
                    settings,
                    manifest,
                    credentialsMap,
                };
            }
            catch (error) {
                this.logger.error('Failed to generate artifacts', error, {
                    channelId: channel.channelId,
                    buildId: options.buildId,
                });
                throw error;
            }
        }
        /**
         * Generate Node-RED flows.json from channel IR
         */
        async generateFlowsJson(channel, options) {
            this.logger.debug('Generating flows.json', {
                channelId: channel.channelId,
                stageCount: channel.stages.length,
            });
            const flows = [];
            // Create main flow tab
            const flowTab = {
                id: this.idGenerator.generateFlowId(channel.channelId),
                label: channel.title,
                type: 'tab',
                disabled: false,
                info: channel.documentation || '',
            };
            flows.push(flowTab);
            // Generate nodes for each stage
            const nodeIdMap = new Map(); // stageId -> nodeIds[]
            for (const stage of channel.stages) {
                try {
                    const stageNodes = await this.generateStageNodes(stage, channel, flowTab.id, options);
                    flows.push(...stageNodes);
                    // Track node IDs for wiring
                    nodeIdMap.set(stage.id, stageNodes.map((node) => node.id));
                }
                catch (error) {
                    this.logger.error('Failed to generate nodes for stage', error, {
                        stageId: stage.id,
                        nexonId: stage.nexonId,
                    });
                    // Generate fallback node
                    const fallbackNode = this.generateFallbackNode(stage, flowTab.id, options);
                    flows.push(fallbackNode);
                    nodeIdMap.set(stage.id, [fallbackNode.id]);
                }
            }
            // Wire nodes based on channel edges
            this.wireNodes(flows, channel.edges, nodeIdMap);
            return flows;
        }
        /**
         * Generate Node-RED nodes for a stage using Nexon templates
         */
        async generateStageNodes(stage, channel, flowTabId, options) {
            this.logger.debug('Generating stage nodes', {
                stageId: stage.id,
                nexonId: stage.nexonId,
            });
            // Fetch and validate Nexon template
            const nexonTemplate = await this.nexonTemplateService.fetchTemplate(stage.nexonId, stage.nexonVersion);
            const validation = await this.nexonTemplateService.validateTemplate(nexonTemplate);
            if (!validation.valid) {
                throw new Error(`Invalid template: ${validation.errors?.join(', ')}`);
            }
            // Create substitution context
            const substitutionContext = {
                parameters: {
                    ...stage.params || {},
                    // Add flow context for template substitution
                    flow: {
                        id: flowTabId,
                    },
                },
                stage: {
                    id: stage.id,
                    title: stage.title,
                },
                channel: {
                    channelId: channel.channelId,
                    title: channel.title,
                },
                runtime: {
                    buildId: options.buildId,
                    target: options.target || channel.runtime.target,
                },
            };
            // Substitute parameters in template
            const substitutionResult = await this.parameterSubstitutionService.substituteParameters(nexonTemplate.template, substitutionContext, nexonTemplate.manifest.parameters);
            if (!substitutionResult.success) {
                throw new Error(`Parameter substitution failed: ${substitutionResult.errors?.join(', ')}`);
            }
            // Process template nodes (template is now a flat array of nodes)
            const templateNodes = Array.isArray(substitutionResult.value) ? substitutionResult.value : [];
            const processedNodes = templateNodes.map((templateNode) => {
                const nodeId = this.idGenerator.generateNodeId(stage.id, templateNode.id);
                return {
                    ...templateNode,
                    id: nodeId,
                    z: flowTabId,
                    x: (stage.position?.x || 100) + (templateNode.x || 0),
                    y: (stage.position?.y || 100) + (templateNode.y || 0),
                    wires: templateNode.wires || [[]],
                };
            });
            return processedNodes;
        }
        /**
         * Generate fallback node when template processing fails
         */
        generateFallbackNode(stage, flowTabId, options) {
            const nodeId = this.idGenerator.generateFallbackNodeId(stage.id);
            return {
                id: nodeId,
                type: this.mapNexonToNodeRedType(stage.nexonId),
                z: flowTabId,
                name: stage.title || stage.id,
                x: stage.position?.x || 100,
                y: stage.position?.y || 100,
                wires: [[]],
                ...this.mapStageParams(stage),
            };
        }
        /**
         * Wire nodes based on channel edges
         */
        wireNodes(flows, edges, nodeIdMap) {
            const nodeMap = new Map();
            flows.forEach((flow) => {
                if (flow.type !== 'tab') {
                    nodeMap.set(flow.id, flow);
                }
            });
            // Process each edge
            edges.forEach((edge) => {
                const fromNodeIds = nodeIdMap.get(edge.from.stageId) || [];
                const toNodeIds = nodeIdMap.get(edge.to.stageId) || [];
                // Wire from last node of source stage to first node of target stage
                if (fromNodeIds.length > 0 && toNodeIds.length > 0) {
                    const fromNodeId = fromNodeIds[fromNodeIds.length - 1];
                    const toNodeId = toNodeIds[0];
                    const fromNode = nodeMap.get(fromNodeId);
                    if (fromNode) {
                        // Ensure wires array exists
                        if (!fromNode.wires) {
                            fromNode.wires = [[]];
                        }
                        if (!Array.isArray(fromNode.wires[0])) {
                            fromNode.wires[0] = [];
                        }
                        // Add connection
                        if (!fromNode.wires[0].includes(toNodeId)) {
                            fromNode.wires[0].push(toNodeId);
                        }
                    }
                }
            });
        }
        /**
         * Generate secure Node-RED settings.js
         */
        generateSettings(channel, options) {
            this.logger.debug('Generating settings.js', {
                channelId: channel.channelId,
                target: options.target || channel.runtime.target,
            });
            const isProduction = options.mode === 'PROD';
            const isCloud = (options.target || channel.runtime.target) === 'cloud';
            return {
                // Flow File and User Directory Settings
                flowFile: 'flows.json',
                flowFilePretty: true, // For version control compatibility
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
                    enabled: false, // Disable state persistence for security
                    ui: false,
                },
                // Diagnostics configuration
                diagnostics: {
                    enabled: isProduction, // Enable in production for monitoring
                    ui: false, // Disable UI access
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
                // Editor settings (disabled for headless)
                editorTheme: {
                    projects: {
                        enabled: false,
                    },
                    codeEditor: {
                        lib: 'monaco',
                        options: {},
                    },
                    multiplayer: {
                        enabled: false,
                    },
                },
                // Function node settings
                functionExternalModules: false, // Disable for security
                functionTimeout: 0,
                functionGlobalContext: {
                    // Channel metadata
                    channelId: channel.channelId,
                    buildId: options.buildId,
                    mode: options.mode,
                    target: options.target || channel.runtime.target,
                    // Security context
                    security: {
                        allowInternetHttpOut: channel.security?.allowInternetHttpOut || false,
                        allowInternetTcpOut: channel.security?.allowInternetTcpOut || false,
                        allowInternetUdpOut: channel.security?.allowInternetUdpOut || false,
                        allowHttpInPublic: channel.security?.allowHttpInPublic || false,
                    },
                    // Added our Node.js modules for compatibility (read-only)
                    os: 'require("os")', // String reference for security
                    simpleHL7: 'require("simple-hl7")'
                },
                // Node Settings - Network timeouts and buffer sizes
                nodeMessageBufferMaxLength: 0, // Disable message buffering
                debugMaxLength: 1000,
                socketTimeout: 120000,
                tcpMsgQueueSize: 2000,
                mqttReconnectTime: 15000,
                serialReconnectTime: 15000,
                inboundWebSocketTimeout: 5000,
                // Cloud-specific settings
                ...(isCloud && {
                    credentialSecret: false, // Use environment-based secrets
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
        generateManifest(channel, options) {
            this.logger.debug('Generating manifest.json', {
                channelId: channel.channelId,
                buildId: options.buildId,
            });
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
        generateCredentialsMap(channel, options) {
            this.logger.debug('Generating credentials.map.json', {
                channelId: channel.channelId,
            });
            const credentialsMap = {};
            // Extract secret references from stage parameters
            channel.stages.forEach((stage) => {
                if (stage.params) {
                    this.extractSecretReferences(stage.params, `${stage.id}`, credentialsMap);
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
        extractSecretReferences(params, prefix, credentialsMap) {
            if (!params || typeof params !== 'object') {
                return;
            }
            Object.entries(params).forEach(([key, value]) => {
                const fullKey = `${prefix}.${key}`;
                if (value && typeof value === 'object') {
                    if ('secret' in value) {
                        // This is a secret reference
                        const secretRef = value.secret;
                        credentialsMap[fullKey] = {
                            type: 'secretRef',
                            ref: secretRef.ref,
                            envVar: this.generateEnvVarName(fullKey),
                        };
                    }
                    else {
                        // Recurse into nested objects
                        this.extractSecretReferences(value, fullKey, credentialsMap);
                    }
                }
            });
        }
        /**
         * Generate environment variable name for secret reference
         */
        generateEnvVarName(key) {
            return `GJ_SECRET_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        }
        /**
         * Map Nexon ID to Node-RED node type
         */
        mapNexonToNodeRedType(nexonId) {
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
            return mapping[nexonId] || 'function';
        }
        /**
         * Map stage parameters to Node-RED node properties
         */
        mapStageParams(stage) {
            // Basic parameter mapping - this would be expanded based on nexon types
            const params = stage.params || {};
            const mapped = {};
            // Common parameter mappings
            Object.entries(params).forEach(([key, value]) => {
                if (value && typeof value === 'object' && 'secret' in value) {
                    // Handle secret references - map to environment variable
                    mapped[key] = `\${${this.generateEnvVarName(`${stage.id}.${key}`)}}`;
                }
                else {
                    mapped[key] = value;
                }
            });
            return mapped;
        }
    };
    return ArtifactsService = _classThis;
})();
export { ArtifactsService };
//# sourceMappingURL=artifacts.service.js.map