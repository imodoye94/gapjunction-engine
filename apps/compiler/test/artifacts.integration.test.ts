import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactsService } from '../src/artifacts/artifacts.service';
import { ArtifactsModule } from '../src/artifacts/artifacts.module';
import { NexonTemplateService } from '../src/nexon/nexon-template.service';
import { ParameterSubstitutionService } from '../src/nexon/parameter-substitution.service';
import { ChannelIR } from '@gj/ir-schema';

describe('Artifacts Integration Tests', () => {
  let artifactsService: ArtifactsService;
  let nexonTemplateService: NexonTemplateService;
  let parameterSubstitutionService: ParameterSubstitutionService;

  const testChannel: ChannelIR = {
    version: 1,
    channelId: 'integration-test-channel',
    title: 'Integration Test Channel',
    runtime: { target: 'onprem' },
    security: {
      allowInternetHttpOut: true,
      allowInternetTcpOut: false,
      allowInternetUdpOut: false,
      allowHttpInPublic: false,
    },
    stages: [
      {
        id: 'http-request-stage',
        title: 'HTTP API Call',
        nexonId: 'http.request',
        nexonVersion: '1.0.0',
        params: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET',
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GapJunction-Test/1.0',
          },
        },
        position: { x: 200, y: 100 },
      },
      {
        id: 'tcp-listener-stage',
        title: 'TCP Data Listener',
        nexonId: 'tcp.listener',
        nexonVersion: '1.0.0',
        params: {
          port: 8080,
          host: '0.0.0.0',
          datamode: 'stream',
          base64: false,
        },
        position: { x: 400, y: 100 },
      },
    ],
    edges: [
      {
        id: 'tcp-to-http',
        from: { stageId: 'tcp-listener-stage' },
        to: { stageId: 'http-request-stage' },
      },
    ],
    documentation: 'Integration test channel with HTTP and TCP stages',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ArtifactsModule],
    })
      .overrideProvider(NexonTemplateService)
      .useValue({
            fetchTemplate: async (nexonId: string, version?: string) => {
              // Mock template fetching with realistic templates
              if (nexonId === 'http.request') {
                return {
                  manifest: {
                    id: 'http.request',
                    version: '1.0.0',
                    title: 'HTTP Request',
                    parameters: {
                      url: { type: 'string', required: true },
                      method: { type: 'string', default: 'GET' },
                      timeout: { type: 'number', default: 30000 },
                      headers: { type: 'object', required: false },
                    },
                  },
                  template: [
                    {
                      id: 'http-request-node',
                      type: 'http request',
                      name: '{{stage.title || "HTTP Request"}}',
                      method: '{{params.method || "GET"}}',
                      url: '{{params.url}}',
                      timeout: '{{params.timeout || 30000}}',
                      headers: '{{params.headers || {}}}',
                      x: 200,
                      y: 200,
                      wires: [[]],
                    },
                  ],
                  source: { type: 'local' },
                };
              } else if (nexonId === 'tcp.listener') {
                return {
                  manifest: {
                    id: 'tcp.listener',
                    version: '1.0.0',
                    title: 'TCP Listener',
                    parameters: {
                      port: { type: 'number', required: true },
                      host: { type: 'string', default: 'localhost' },
                      datamode: { type: 'string', default: 'stream' },
                      base64: { type: 'boolean', default: false },
                    },
                  },
                  template: [
                    {
                      id: 'tcp-in-node',
                      type: 'tcp in',
                      name: '{{stage.title || "TCP Listener"}}',
                      server: 'server',
                      host: '{{params.host || "localhost"}}',
                      port: '{{params.port}}',
                      datamode: '{{params.datamode || "stream"}}',
                      base64: '{{params.base64 || false}}',
                      x: 150,
                      y: 200,
                      wires: [['data-processor']],
                    },
                    {
                      id: 'data-processor',
                      type: 'function',
                      name: 'Process TCP Data',
                      func: 'msg.processed = true; return msg;',
                      x: 300,
                      y: 200,
                      wires: [[]],
                    },
                  ],
                  source: { type: 'local' },
                };
              }
              throw new Error(`Template not found: ${nexonId}`);
          },
          validateTemplate: async () => ({ valid: true }),
        })
      .overrideProvider(ParameterSubstitutionService)
      .useValue({
            substituteParameters: async (template: any, context: any) => {
              // Mock parameter substitution with realistic substitution
              const substitutedNodes = template.map((node: any) => {
                const substituted = { ...node };
                
                // Simple template substitution for testing
                Object.keys(substituted).forEach(key => {
                  if (typeof substituted[key] === 'string') {
                    let value = substituted[key];
                    
                    // Replace stage.title
                    if (value.includes('{{stage.title')) {
                      value = value.replace(/\{\{stage\.title.*?\}\}/g, context.stage.title || 'Default Title');
                    }
                    
                    // Replace params
                    Object.keys(context.parameters).forEach(paramKey => {
                      const paramValue = context.parameters[paramKey];
                      const pattern = new RegExp(`\\{\\{params\\.${paramKey}.*?\\}\\}`, 'g');
                      if (value.includes(`{{params.${paramKey}`)) {
                        value = value.replace(pattern, String(paramValue));
                      }
                    });
                    
                    substituted[key] = value;
                  }
                });
                
                return substituted;
              });
              
              return {
                success: true,
                value: substitutedNodes,
              };
          },
        })
      .compile();

    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    nexonTemplateService = module.get<NexonTemplateService>(NexonTemplateService);
    parameterSubstitutionService = module.get<ParameterSubstitutionService>(ParameterSubstitutionService);
  });

  describe('Full Artifact Generation Pipeline', () => {
    it('should generate complete artifacts for a realistic channel', async () => {
      const options = {
        buildId: 'integration-test-build-001',
        mode: 'TEST' as const,
        target: 'onprem' as const,
      };

      const artifacts = await artifactsService.generateArtifacts(testChannel, options);

      // Verify all artifacts are generated
      expect(artifacts).toBeDefined();
      expect(artifacts.flowsJson).toBeDefined();
      expect(artifacts.settings).toBeDefined();
      expect(artifacts.manifest).toBeDefined();
      expect(artifacts.credentialsMap).toBeDefined();

      // Verify flows.json structure
      expect(Array.isArray(artifacts.flowsJson)).toBe(true);
      expect(artifacts.flowsJson.length).toBeGreaterThan(0);

      // Should have one flow tab
      const flowTabs = artifacts.flowsJson.filter(item => item.type === 'tab');
      expect(flowTabs).toHaveLength(1);
      expect(flowTabs[0].label).toBe(testChannel.title);

      // Should have nodes for both stages
      const nodes = artifacts.flowsJson.filter(item => item.type !== 'tab');
      expect(nodes.length).toBeGreaterThan(0);

      // Verify node properties
      nodes.forEach(node => {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.z).toBe(flowTabs[0].id); // Should be associated with flow tab
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(Array.isArray(node.wires)).toBe(true);
      });

      // Verify wiring between stages
      const tcpNodes = nodes.filter(node => node.id.includes('tcp-listener-stage'));
      const httpNodes = nodes.filter(node => node.id.includes('http-request-stage'));
      
      expect(tcpNodes.length).toBeGreaterThan(0);
      expect(httpNodes.length).toBeGreaterThan(0);

      // Last TCP node should be wired to first HTTP node
      const lastTcpNode = tcpNodes[tcpNodes.length - 1];
      const firstHttpNode = httpNodes[0];
      expect(lastTcpNode.wires[0]).toContain(firstHttpNode.id);
    });

    it('should generate secure production settings', async () => {
      const options = {
        buildId: 'prod-build-001',
        mode: 'PROD' as const,
        target: 'cloud' as const,
      };

      const artifacts = await artifactsService.generateArtifacts(testChannel, options);

      const settings = artifacts.settings;

      // Verify security settings for production
      expect(settings.httpAdminRoot).toBe(false);
      expect(settings.httpNodeRoot).toBe(false);
      expect(settings.uiPort).toBe(false);
      expect(settings.requireHttps).toBe(true);
      expect(settings.functionExternalModules).toBe(false);
      expect(settings.exportGlobalContextKeys).toBe(false);
      expect(settings.contextStorage).toBe(false);

      // Verify logging configuration
      expect(settings.logging.console.level).toBe('warn');
      expect(settings.logging.console.audit).toBe(true);
      expect(settings.logging.file).toBeDefined();

      // Verify function global context
      expect(settings.functionGlobalContext.channelId).toBe(testChannel.channelId);
      expect(settings.functionGlobalContext.buildId).toBe(options.buildId);
      expect(settings.functionGlobalContext.mode).toBe(options.mode);
      expect(settings.functionGlobalContext.target).toBe(options.target);
      expect(settings.functionGlobalContext.security).toEqual(testChannel.security);
    });

    it('should generate valid bundle manifest', async () => {
      const options = {
        buildId: 'manifest-test-build',
        mode: 'TEST' as const,
        target: 'onprem' as const,
      };

      const artifacts = await artifactsService.generateArtifacts(testChannel, options);

      const manifest = artifacts.manifest;

      // Verify manifest structure
      expect(manifest.version).toBe(1);
      expect(manifest.channelId).toBe(testChannel.channelId);
      expect(manifest.buildId).toBe(options.buildId);
      expect(manifest.mode).toBe(options.mode);

      // Verify artifact paths
      expect(manifest.artifacts.flowsJsonPath).toBe('./flows.json');
      expect(manifest.artifacts.settingsPath).toBe('./settings.js');
      expect(manifest.artifacts.credentialsMapPath).toBe('./credentials.map.json');
    });

    it('should generate empty credentials map for channel without secrets', async () => {
      const options = {
        buildId: 'no-secrets-build',
        mode: 'TEST' as const,
      };

      const artifacts = await artifactsService.generateArtifacts(testChannel, options);

      const credentialsMap = artifacts.credentialsMap;

      // Verify credentials map structure
      expect(credentialsMap.version).toBe(1);
      expect(credentialsMap.channelId).toBe(testChannel.channelId);
      expect(credentialsMap.buildId).toBe(options.buildId);
      expect(credentialsMap.credentials).toEqual({});
    });

    it('should handle channels with secret references', async () => {
      const channelWithSecrets: ChannelIR = {
        ...testChannel,
        stages: [
          {
            id: 'secure-http-stage',
            title: 'Secure HTTP Request',
            nexonId: 'http.request',
            params: {
              url: 'https://api.secure.com/data',
              method: 'POST',
              apiKey: {
                secret: {
                  type: 'secretRef',
                  ref: 'gcp://projects/test/secrets/api-key/versions/latest',
                },
              },
              authToken: {
                secret: {
                  type: 'secretRef',
                  ref: 'aws://secrets-manager/auth-token',
                },
              },
            },
          },
        ],
        edges: [],
      };

      const options = {
        buildId: 'secrets-test-build',
        mode: 'PROD' as const,
      };

      const artifacts = await artifactsService.generateArtifacts(channelWithSecrets, options);

      const credentialsMap = artifacts.credentialsMap;

      // Should extract secret references
      expect(Object.keys(credentialsMap.credentials)).toHaveLength(2);
      
      const apiKeyRef = credentialsMap.credentials['secure-http-stage.apiKey'];
      expect(apiKeyRef).toBeDefined();
      expect(apiKeyRef.type).toBe('secretRef');
      expect(apiKeyRef.ref).toBe('gcp://projects/test/secrets/api-key/versions/latest');
      expect(apiKeyRef.envVar).toBe('GJ_SECRET_SECURE_HTTP_STAGE_APIKEY');

      const authTokenRef = credentialsMap.credentials['secure-http-stage.authToken'];
      expect(authTokenRef).toBeDefined();
      expect(authTokenRef.type).toBe('secretRef');
      expect(authTokenRef.ref).toBe('aws://secrets-manager/auth-token');
      expect(authTokenRef.envVar).toBe('GJ_SECRET_SECURE_HTTP_STAGE_AUTHTOKEN');
    });

    it('should generate deterministic IDs across multiple runs', async () => {
      const options = {
        buildId: 'deterministic-test-build',
        mode: 'TEST' as const,
      };

      const artifacts1 = await artifactsService.generateArtifacts(testChannel, options);
      const artifacts2 = await artifactsService.generateArtifacts(testChannel, options);

      // Flow tab IDs should be identical
      const flowTab1 = artifacts1.flowsJson.find(item => item.type === 'tab');
      const flowTab2 = artifacts2.flowsJson.find(item => item.type === 'tab');
      expect(flowTab1.id).toBe(flowTab2.id);

      // Node IDs should be identical
      const nodes1 = artifacts1.flowsJson.filter(item => item.type !== 'tab');
      const nodes2 = artifacts2.flowsJson.filter(item => item.type !== 'tab');
      
      expect(nodes1).toHaveLength(nodes2.length);
      
      nodes1.forEach((node1, index) => {
        const node2 = nodes2[index];
        expect(node1.id).toBe(node2.id);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle template fetch failures gracefully', async () => {
      const channelWithInvalidNexon: ChannelIR = {
        ...testChannel,
        stages: [
          {
            id: 'invalid-stage',
            nexonId: 'non.existent.nexon',
            params: {},
          },
        ],
      };

      const options = {
        buildId: 'error-test-build',
        mode: 'TEST' as const,
      };

      await expect(
        artifactsService.generateArtifacts(channelWithInvalidNexon, options)
      ).rejects.toThrow('Template not found');
    });
  });
});