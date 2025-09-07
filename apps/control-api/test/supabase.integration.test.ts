import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SupabaseService } from '../src/services/supabase.service.js';

import { createMockConfigService, createMockLogger, createMockSupabaseClient } from './utils/test-helpers.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}));

describe('Supabase Integration Tests', () => {
  let service: SupabaseService;
  let mockConfigService: any;
  let mockLogger: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfigService = createMockConfigService({
      'SUPABASE_URL': 'https://test.supabase.co',
      'SUPABASE_SERVICE_KEY': 'test-service-key',
      'SUPABASE_PROJECT_REF': 'test-project',
    });
    
    mockLogger = createMockLogger();
    mockSupabase = createMockSupabaseClient();
    
    service = new SupabaseService(mockConfigService, mockLogger);
  });

  describe('Database Operations', () => {
    describe('Build Management', () => {
      it('should create and retrieve build records', async () => {
        const mockBuild = {
          buildId: 'test-build-123',
          orgId: 'test-org-123',
          channelId: 'test-channel-123',
          userId: 'test-user-123',
          runtimeId: 'test-runtime-123',
          runtimeType: 'onprem' as const,
          mode: 'TEST' as const,
          irContent: { version: 1, channelId: 'test' },
          irVersion: 1,
        };

        const mockDbResponse = {
          id: mockBuild.buildId,
          organizationId: mockBuild.orgId,
          channelId: mockBuild.channelId,
          userId: mockBuild.userId,
          runtimeId: mockBuild.runtimeId,
          runtimeType: mockBuild.runtimeType,
          mode: mockBuild.mode,
          irContent: mockBuild.irContent,
          irVersion: mockBuild.irVersion,
          buildStatus: 'QUEUED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Mock successful creation
        mockSupabase._mocks.single.mockResolvedValueOnce({
          data: mockDbResponse,
          error: null,
        });

        const createdBuild = await service.createBuild(mockBuild);

        expect(createdBuild.buildId).toBe(mockBuild.buildId);
        expect(createdBuild.buildStatus).toBe('QUEUED');
        expect(mockSupabase.from).toHaveBeenCalledWith('bundles');
        expect(mockSupabase._mocks.insert).toHaveBeenCalled();

        // Mock successful retrieval
        mockSupabase._mocks.single.mockResolvedValueOnce({
          data: mockDbResponse,
          error: null,
        });

        const retrievedBuild = await service.getBuild(mockBuild.buildId);

        expect(retrievedBuild).toBeDefined();
        expect(retrievedBuild?.buildId).toBe(mockBuild.buildId);
        expect(mockSupabase._mocks.select).toHaveBeenCalledWith('*');
        expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('id', mockBuild.buildId);
      });

      it('should update build status and metadata', async () => {
        const buildId = 'test-build-123';
        const updates = {
          buildStatus: 'COMPILED' as const,
          buildTime: Date.now(),
          bundleTarball: 'bundles/test-build-123.tgz',
        };

        const mockDbResponse = {
          id: buildId,
          buildStatus: updates.buildStatus,
          buildTime: updates.buildTime,
          bundleTarball: updates.bundleTarball,
          updatedAt: new Date().toISOString(),
        };

        mockSupabase._mocks.single.mockResolvedValue({
          data: mockDbResponse,
          error: null,
        });

        const updatedBuild = await service.updateBuild(buildId, updates);

        expect(updatedBuild.buildId).toBe(buildId);
        expect(updatedBuild.buildStatus).toBe(updates.buildStatus);
        expect(mockSupabase._mocks.update).toHaveBeenCalledWith(
          expect.objectContaining({
            buildStatus: updates.buildStatus,
            buildTime: updates.buildTime,
            bundleTarball: updates.bundleTarball,
          })
        );
        expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('id', buildId);
      });

      it('should handle build not found scenarios', async () => {
        const buildId = 'non-existent-build';

        mockSupabase._mocks.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });

        const result = await service.getBuild(buildId);

        expect(result).toBeNull();
      });

      it('should handle database connection errors', async () => {
        const mockBuild = {
          buildId: 'test-build-123',
          orgId: 'test-org-123',
          channelId: 'test-channel-123',
          userId: 'test-user-123',
          runtimeId: 'test-runtime-123',
          runtimeType: 'onprem' as const,
          mode: 'TEST' as const,
          irContent: { version: 1 },
          irVersion: 1,
        };

        mockSupabase._mocks.single.mockResolvedValue({
          data: null,
          error: { message: 'Connection failed', code: 'CONNECTION_ERROR' },
        });

        await expect(service.createBuild(mockBuild)).rejects.toThrow(
          'Failed to create build record'
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to create build record',
          expect.objectContaining({
            error: 'Connection failed',
            channelId: mockBuild.channelId,
          })
        );
      });
    });

    describe('Storage Operations', () => {
      it('should upload and download bundles', async () => {
        const buildId = 'test-build-123';
        const bundleData = Buffer.from('test bundle content');
        const expectedPath = `bundles/${buildId}.tgz`;

        // Mock successful upload
        mockSupabase._mocks.upload.mockResolvedValue({
          data: { path: expectedPath },
          error: null,
        });

        const uploadPath = await service.uploadBundle(buildId, bundleData);

        expect(uploadPath).toBe(expectedPath);
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('bundles');
        expect(mockSupabase._mocks.upload).toHaveBeenCalledWith(
          expectedPath,
          bundleData,
          expect.objectContaining({
            contentType: 'application/gzip',
            upsert: true,
          })
        );

        // Mock successful download
        const mockBlob = new Blob([bundleData]);
        mockSupabase._mocks.download.mockResolvedValue({
          data: mockBlob,
          error: null,
        });

        const downloadedData = await service.downloadBundle(expectedPath);

        expect(downloadedData).toBeInstanceOf(Buffer);
        expect(mockSupabase._mocks.download).toHaveBeenCalledWith(expectedPath);
      });

      it('should handle storage upload failures', async () => {
        const buildId = 'test-build-123';
        const bundleData = Buffer.from('test bundle content');

        mockSupabase._mocks.upload.mockResolvedValue({
          data: null,
          error: { message: 'Storage quota exceeded' },
        });

        await expect(service.uploadBundle(buildId, bundleData)).rejects.toThrow(
          'Failed to upload bundle'
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          `Failed to upload bundle for build ${buildId}`,
          expect.objectContaining({
            error: 'Storage quota exceeded',
          })
        );
      });

      it('should handle storage download failures', async () => {
        const bundlePath = 'bundles/non-existent.tgz';

        mockSupabase._mocks.download.mockResolvedValue({
          data: null,
          error: { message: 'File not found' },
        });

        await expect(service.downloadBundle(bundlePath)).rejects.toThrow(
          'Failed to download bundle'
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          `Failed to download bundle from ${bundlePath}`,
          expect.objectContaining({
            error: 'File not found',
          })
        );
      });
    });

    describe('Real-time Broadcasting', () => {
      it('should broadcast messages to editor channels', async () => {
        const channelId = 'test-channel-123';
        const event = 'build_completed';
        const payload = { buildId: 'test-build-123', status: 'COMPLETED' };

        // Mock successful fetch
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
        });

        await service.broadcastToEditor(channelId, event, payload);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/realtime/v1/api/broadcast'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'apikey': 'test-service-key',
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
              messages: [
                {
                  topic: channelId,
                  event,
                  payload,
                },
              ],
            }),
          })
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          `Broadcasting ${event} to channel ${channelId}`
        );
      });

      it('should handle broadcast failures', async () => {
        const channelId = 'test-channel-123';
        const event = 'build_failed';
        const payload = { error: 'Build failed' };

        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

        await expect(service.broadcastToEditor(channelId, event, payload)).rejects.toThrow(
          'Failed to broadcast to editor'
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Broadcast operation failed',
          expect.objectContaining({
            error: 'HTTP 500: Internal Server Error',
            channelId,
            event,
          })
        );
      });

      it('should handle network errors during broadcast', async () => {
        const channelId = 'test-channel-123';
        const event = 'build_failed';
        const payload = { error: 'Build failed' };

        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        await expect(service.broadcastToEditor(channelId, event, payload)).rejects.toThrow(
          'Failed to broadcast to editor'
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Broadcast operation failed',
          expect.objectContaining({
            error: 'Network error',
            channelId,
            event,
          })
        );
      });
    });
  });

  describe('Health Monitoring', () => {
    it('should report healthy status when database is accessible', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: { count: 0 },
        error: null,
      });

      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('bundles');
      expect(mockSupabase._mocks.select).toHaveBeenCalledWith('count');
    });

    it('should report unhealthy status when database has errors', async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase health check failed',
        expect.objectContaining({
          error: 'Connection timeout',
        })
      );
    });

    it('should handle health check exceptions', async () => {
      mockSupabase._mocks.single.mockRejectedValue(new Error('Database unavailable'));

      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase health check failed',
        expect.objectContaining({
          error: 'Database unavailable',
        })
      );
    });
  });

  describe('Configuration Handling', () => {
    it('should handle missing configuration gracefully', () => {
      const configWithMissingValues = createMockConfigService({
        'SUPABASE_URL': '',
        'SUPABASE_SERVICE_KEY': '',
      });

      const serviceWithMissingConfig = new SupabaseService(configWithMissingValues, mockLogger);

      expect(serviceWithMissingConfig).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase configuration missing, some features will be disabled'
      );
    });

    it('should use provided configuration values', () => {
      const customConfig = createMockConfigService({
        'SUPABASE_URL': 'https://custom.supabase.co',
        'SUPABASE_SERVICE_KEY': 'custom-service-key',
        'SUPABASE_PROJECT_REF': 'custom-project',
      });

      const customService = new SupabaseService(customConfig, mockLogger);

      expect(customService).toBeDefined();
      expect(customConfig.get).toHaveBeenCalledWith('SUPABASE_URL', '');
      expect(customConfig.get).toHaveBeenCalledWith('SUPABASE_SERVICE_KEY', '');
      expect(customConfig.get).toHaveBeenCalledWith('SUPABASE_PROJECT_REF', '');
    });
  });

  describe('Data Mapping', () => {
    it('should correctly map database records to Build objects', async () => {
      const mockDbRecord = {
        id: 'test-build-123',
        organizationId: 'test-org-123',
        projectId: 'test-project-123',
        channelId: 'test-channel-123',
        userId: 'test-user-123',
        runtimeId: 'test-runtime-123',
        runtimeType: 'onprem',
        mode: 'TEST',
        irContent: { version: 1, channelId: 'test' },
        irVersion: 1,
        notes: 'Test build',
        bundleTarball: 'bundles/test.tgz',
        compilerBundleId: 'compiler-123',
        buildStatus: 'COMPILED',
        buildTime: 1234567890,
        deploymentStatus: 'DEPLOYED',
        deploymentId: 'deploy-123',
        deploymentTime: 1234567900,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockDbRecord,
        error: null,
      });

      const build = await service.getBuild('test-build-123');

      expect(build).toMatchObject({
        buildId: 'test-build-123',
        orgId: 'test-org-123',
        projectId: 'test-project-123',
        channelId: 'test-channel-123',
        userId: 'test-user-123',
        runtimeId: 'test-runtime-123',
        runtimeType: 'onprem',
        mode: 'TEST',
        irContent: { version: 1, channelId: 'test' },
        irVersion: 1,
        notes: 'Test build',
        bundleTarball: 'bundles/test.tgz',
        compilerBundleId: 'compiler-123',
        buildStatus: 'COMPILED',
        buildTime: 1234567890,
        deploymentStatus: 'DEPLOYED',
        deploymentId: 'deploy-123',
        deploymentTime: 1234567900,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(build?.createdAt.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      expect(build?.updatedAt.toISOString()).toBe('2023-01-01T01:00:00.000Z');
    });
  });

  describe('Error Handling', () => {
    it('should handle various Supabase error codes', async () => {
      const errorScenarios = [
        { code: 'PGRST116', message: 'Not found', expectNull: true },
        { code: 'PGRST301', message: 'Connection failed', expectThrow: true },
        { code: '23505', message: 'Duplicate key violation', expectThrow: true },
        { code: '42P01', message: 'Table does not exist', expectThrow: true },
      ];

      for (const scenario of errorScenarios) {
        vi.clearAllMocks();
        
        mockSupabase._mocks.single.mockResolvedValue({
          data: null,
          error: { code: scenario.code, message: scenario.message },
        });

        if (scenario.expectNull) {
          const result = await service.getBuild('test-build');
          expect(result).toBeNull();
        } else if (scenario.expectThrow) {
          await expect(service.getBuild('test-build')).rejects.toThrow();
          expect(mockLogger.error).toHaveBeenCalled();
        }
      }
    });

    it('should handle unexpected exceptions gracefully', async () => {
      mockSupabase._mocks.single.mockRejectedValue(new Error('Unexpected database error'));

      await expect(service.getBuild('test-build')).rejects.toThrow('Failed to get build');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Get build operation failed',
        expect.objectContaining({
          error: 'Unexpected database error',
          buildId: 'test-build',
        })
      );
    });
  });
});