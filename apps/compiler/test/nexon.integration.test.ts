import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NexonTemplateService } from '../src/nexon/nexon-template.service';
import { ParameterSubstitutionService } from '../src/nexon/parameter-substitution.service';
import { NexonModule } from '../src/nexon/nexon.module';
import { SubstitutionContext } from '../src/nexon/types';

describe('Nexon Integration Tests', () => {
  let nexonTemplateService: NexonTemplateService;
  let parameterSubstitutionService: ParameterSubstitutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        NexonModule,
      ],
    }).compile();

    nexonTemplateService = module.get<NexonTemplateService>(NexonTemplateService);
    parameterSubstitutionService = module.get<ParameterSubstitutionService>(ParameterSubstitutionService);
  });

  describe('NexonTemplateService', () => {
    it('should fetch HTTP request template from local filesystem', async () => {
      const template = await nexonTemplateService.fetchTemplate('http.request', '1.0.0');
      
      expect(template).toBeDefined();
      expect(template.manifest.id).toBe('http.request');
      expect(template.manifest.version).toBe('1.0.0');
      expect(Array.isArray(template.template)).toBe(true);
      expect(template.template.length).toBeGreaterThan(0);
    });

    it('should validate HTTP request template', async () => {
      const template = await nexonTemplateService.fetchTemplate('http.request', '1.0.0');
      const validation = await nexonTemplateService.validateTemplate(template);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should fetch TCP listener template from local filesystem', async () => {
      const template = await nexonTemplateService.fetchTemplate('tcp.listener', '1.0.0');
      
      expect(template).toBeDefined();
      expect(template.manifest.id).toBe('tcp.listener');
      expect(template.manifest.version).toBe('1.0.0');
      expect(Array.isArray(template.template)).toBe(true);
    });

    it('should list available templates', async () => {
      const templates = await nexonTemplateService.listTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      const httpTemplate = templates.find(t => t.id === 'http.request');
      expect(httpTemplate).toBeDefined();
      expect(httpTemplate?.source).toBe('local');
    });

    it('should handle template not found', async () => {
      await expect(
        nexonTemplateService.fetchTemplate('nonexistent.template', '1.0.0')
      ).rejects.toThrow('Failed to fetch template');
    });
  });

  describe('ParameterSubstitutionService', () => {
    it('should substitute simple parameters', async () => {
      const context: SubstitutionContext = {
        parameters: {
          url: 'https://api.example.com/test',
          method: 'POST',
          timeout: 5000
        },
        stage: {
          id: 'test-stage',
          title: 'Test HTTP Request'
        },
        channel: {
          channelId: 'test-channel',
          title: 'Test Channel'
        }
      };

      const template = {
        url: '{{params.url}}',
        method: '{{params.method}}',
        timeout: '{{params.timeout}}',
        name: '{{stage.title}}'
      };

      const result = await parameterSubstitutionService.substituteParameters(
        template,
        context
      );

      expect(result.success).toBe(true);
      expect(result.value.url).toBe('https://api.example.com/test');
      expect(result.value.method).toBe('POST');
      expect(result.value.timeout).toBe(5000);
      expect(result.value.name).toBe('Test HTTP Request');
    });

    it('should handle secret references without expansion', async () => {
      const context: SubstitutionContext = {
        parameters: {
          apiKey: {
            secret: {
              type: 'secretRef',
              ref: 'gcp://projects/test/secrets/api-key/versions/latest'
            }
          }
        },
        stage: {
          id: 'test-stage'
        },
        channel: {
          channelId: 'test-channel',
          title: 'Test Channel'
        }
      };

      const result = await parameterSubstitutionService.substituteParameter(
        'apiKey',
        context.parameters.apiKey,
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toEqual(context.parameters.apiKey);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('will be resolved at runtime');
    });

    it('should handle expression tokens', async () => {
      const context: SubstitutionContext = {
        parameters: {
          dynamicUrl: {
            expression: 'params.baseUrl'
          },
          baseUrl: 'https://api.example.com'
        },
        stage: {
          id: 'test-stage'
        },
        channel: {
          channelId: 'test-channel',
          title: 'Test Channel'
        }
      };

      const result = await parameterSubstitutionService.substituteParameter(
        'dynamicUrl',
        context.parameters.dynamicUrl,
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('https://api.example.com');
    });

    it('should validate required parameters', async () => {
      const context: SubstitutionContext = {
        parameters: {},
        stage: {
          id: 'test-stage'
        },
        channel: {
          channelId: 'test-channel',
          title: 'Test Channel'
        }
      };

      const paramDefinition = {
        type: 'string' as const,
        required: true
      };

      const result = await parameterSubstitutionService.substituteParameter(
        'requiredParam',
        undefined as any,
        context,
        paramDefinition
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('required but not provided');
    });

    it('should handle nested object substitution', async () => {
      const context: SubstitutionContext = {
        parameters: {
          config: {
            host: 'localhost',
            port: 8080
          }
        },
        stage: {
          id: 'test-stage'
        },
        channel: {
          channelId: 'test-channel',
          title: 'Test Channel'
        }
      };

      const template = {
        server: {
          host: '{{params.config.host}}',
          port: '{{params.config.port}}',
          url: 'http://{{params.config.host}}:{{params.config.port}}'
        }
      };

      const result = await parameterSubstitutionService.substituteParameters(
        template,
        context
      );

      expect(result.success).toBe(true);
      expect(result.value.server.host).toBe('localhost');
      expect(result.value.server.port).toBe(8080);
    });
  });

  describe('End-to-End Template Processing', () => {
    it('should process complete HTTP request template with parameters', async () => {
      // Fetch template
      const template = await nexonTemplateService.fetchTemplate('http.request', '1.0.0');
      
      // Create substitution context
      const context: SubstitutionContext = {
        parameters: {
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'GET',
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GapJunction-Test'
          }
        },
        stage: {
          id: 'http-stage-1',
          title: 'Fetch Posts'
        },
        channel: {
          channelId: 'test-channel-1',
          title: 'API Integration Test'
        },
        runtime: {
          buildId: 'test-build-123',
          target: 'cloud'
        }
      };

      // Substitute parameters
      const result = await parameterSubstitutionService.substituteParameters(
        template.template,
        context,
        template.manifest.parameters
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);

      // Verify parameter substitution in nodes
      const httpNode = result.value.find((node: any) => node.type === 'http request');
      expect(httpNode).toBeDefined();
      expect(httpNode.url).toBe('https://jsonplaceholder.typicode.com/posts');
      expect(httpNode.method).toBe('GET');
    });
  });
});