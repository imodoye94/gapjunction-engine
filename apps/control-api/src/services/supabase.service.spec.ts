import { describe, it, expect, vi, beforeEach } from 'vitest';

import { mockErrors } from '../../test/fixtures/index.js';
import { createMockConfigService, createMockLogger } from '../../test/utils/test-helpers.js';

import { SupabaseService } from './supabase.service.js';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
};

// Mock createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockConfigService: any;
  let mockLogger: any;
  let mockFrom: any;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfigService = createMockConfigService();
    mockLogger = createMockLogger();
    
    // Setup mock chain for database operations
    mockFrom = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    
    mockSupabaseClient.from.mockReturnValue(mockFrom);
    
    // Setup mock chain for storage operations
    mockStorage = {
      upload: vi.fn(),
      download: vi.fn(),
    };
    
    mockSupabaseClient.storage.from.mockReturnValue(mockStorage);
    
    service = new SupabaseService(mockConfigService, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_URL', '');
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_SERVICE_KEY', '');
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_PROJECT_REF', '');
    });

    it('should warn when configuration is missing', () => {
      const configWithMissingValues = createMockConfigService({
        'SUPABASE_URL': '',
        'SUPABASE_SERVICE_KEY': '',
      });
      
      new SupabaseService(configWithMissingValues, mockLogger);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase configuration missing, some features will be disabled'
      );
    });
  });

  describe('createBuild', () => {
    it('should create a build record successfully', async () => {
      const mockBuild = {
        buildId: 'test-build-123',
        orgId: 'test-org-123',
        projectId: 'test-project-123',
        channelId: 'test-channel-123',
        userId: 'test-user-123',
        runtimeId: 'test-runtime-123',
        runtimeType: 'onprem' as const,
        mode: 'TEST' as const,
        irContent: { version: 1, channelId: 'test' },
        irVersion: 1,
        notes: 'Test build',
      };
      const mockDbResponse = {
        id: mockBuild.buildId,
        organizationId: mockBuild.orgId,
        userId: mockBuild.userId,
        runtimeId: mockBuild.runtimeId,
        channelId: mockBuild.channelId,
        runtimeType: mockBuild.runtimeType,
        mode: mockBuild.mode,
        irContent: mockBuild.irContent,
        irVersion: mockBuild.irVersion,
        notes: mockBuild.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        buildStatus: 'QUEUED',
      };

      mockFrom.single.mockResolvedValue({ data: mockDbResponse, error: null });

      const result = await service.createBuild(mockBuild);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bundles');
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockBuild.orgId,
          userId: mockBuild.userId,
          runtimeId: mockBuild.runtimeId,
          channelId: mockBuild.channelId,
          buildStatus: 'QUEUED',
        })
      );
      expect(result.buildId).toBe(mockBuild.buildId);
      expect(result.buildStatus).toBe('QUEUED');
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Creating build record for channel ${mockBuild.channelId}`
      );
    });

    it('should handle database errors when creating build', async () => {
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
      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: mockErrors.supabaseError 
      });

      await expect(service.createBuild(mockBuild)).rejects.toThrow(
        'Failed to create build record'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create build record',
        expect.objectContaining({
          error: mockErrors.supabaseError.message,
          channelId: mockBuild.channelId,
        })
      );
    });

    it('should handle unexpected errors when creating build', async () => {
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
      mockFrom.single.mockRejectedValue(new Error('Unexpected error'));

      await expect(service.createBuild(mockBuild)).rejects.toThrow(
        'Failed to create build record'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Create build operation failed',
        expect.objectContaining({
          error: 'Unexpected error',
          channelId: mockBuild.channelId,
        })
      );
    });
  });

  describe('updateBuild', () => {
    it('should update a build record successfully', async () => {
      const buildId = 'test-build-123';
      const updates = {
        buildStatus: 'COMPILED' as const,
        buildTime: Date.now(),
        bundleTarball: 'bundles/test-build-123.tgz',
      };

      const mockDbResponse = {
        id: buildId,
        buildStatus: 'COMPILED',
        buildTime: updates.buildTime,
        bundleTarball: updates.bundleTarball,
        updatedAt: new Date().toISOString(),
      };

      mockFrom.single.mockResolvedValue({ data: mockDbResponse, error: null });

      const result = await service.updateBuild(buildId, updates);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bundles');
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          buildStatus: 'COMPILED',
          buildTime: updates.buildTime,
          bundleTarball: updates.bundleTarball,
        })
      );
      expect(mockFrom.eq).toHaveBeenCalledWith('id', buildId);
      expect(result.buildId).toBe(buildId);
    });

    it('should handle database errors when updating build', async () => {
      const buildId = 'test-build-123';
      const updates = { buildStatus: 'FAILED' as const };
      
      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: mockErrors.supabaseError 
      });

      await expect(service.updateBuild(buildId, updates)).rejects.toThrow(
        'Failed to update build'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to update build ${buildId}`,
        expect.objectContaining({
          error: mockErrors.supabaseError.message,
        })
      );
    });
  });

  describe('getBuild', () => {
    it('should retrieve a build record successfully', async () => {
      const buildId = 'test-build-123';
      const mockDbResponse = {
        id: buildId,
        organizationId: 'test-org',
        channelId: 'test-channel',
        buildStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFrom.single.mockResolvedValue({ data: mockDbResponse, error: null });

      const result = await service.getBuild(buildId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bundles');
      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', buildId);
      expect(result).toBeDefined();
      expect(result?.buildId).toBe(buildId);
    });

    it('should return null when build not found', async () => {
      const buildId = 'non-existent-build';
      
      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const result = await service.getBuild(buildId);

      expect(result).toBeNull();
    });

    it('should handle database errors when getting build', async () => {
      const buildId = 'test-build-123';
      
      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: mockErrors.supabaseError 
      });

      await expect(service.getBuild(buildId)).rejects.toThrow(
        'Failed to get build'
      );
    });
  });

  describe('uploadBundle', () => {
    it('should upload bundle successfully', async () => {
      const buildId = 'test-build-123';
      const bundle = Buffer.from('test bundle data');
      const expectedPath = `bundles/${buildId}.tgz`;

      mockStorage.upload.mockResolvedValue({
        data: { path: expectedPath },
        error: null,
      });

      const result = await service.uploadBundle(buildId, bundle);

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('bundles');
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expectedPath,
        bundle,
        expect.objectContaining({
          contentType: 'application/gzip',
          upsert: true,
        })
      );
      expect(result).toBe(expectedPath);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Uploading bundle for build ${buildId}`
      );
    });

    it('should handle storage errors when uploading bundle', async () => {
      const buildId = 'test-build-123';
      const bundle = Buffer.from('test bundle data');

      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      await expect(service.uploadBundle(buildId, bundle)).rejects.toThrow(
        'Failed to upload bundle'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to upload bundle for build ${buildId}`,
        expect.objectContaining({
          error: 'Storage error',
        })
      );
    });
  });

  describe('downloadBundle', () => {
    it('should download bundle successfully', async () => {
      const bundlePath = 'bundles/test-build-123.tgz';
      const mockBundleData = new Blob(['test bundle data']);

      mockStorage.download.mockResolvedValue({
        data: mockBundleData,
        error: null,
      });

      const result = await service.downloadBundle(bundlePath);

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('bundles');
      expect(mockStorage.download).toHaveBeenCalledWith(bundlePath);
      expect(result).toBeInstanceOf(Buffer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Downloading bundle from ${bundlePath}`
      );
    });

    it('should handle storage errors when downloading bundle', async () => {
      const bundlePath = 'bundles/test-build-123.tgz';

      mockStorage.download.mockResolvedValue({
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

  describe('broadcastToEditor', () => {
    it('should broadcast message to editor successfully', async () => {
      const channelId = 'test-channel-123';
      const event = 'build_completed';
      const payload = { buildId: 'test-build-123', status: 'COMPLETED' };

      // Mock global fetch
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

    it('should handle HTTP errors when broadcasting', async () => {
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
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      mockFrom.single.mockResolvedValue({ data: { count: 0 }, error: null });

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bundles');
      expect(mockFrom.select).toHaveBeenCalledWith('count');
    });

    it('should return false when database has errors', async () => {
      mockFrom.single.mockResolvedValue({ 
        data: null, 
        error: mockErrors.supabaseError 
      });

      const result = await service.healthCheck();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase health check failed',
        expect.objectContaining({
          error: mockErrors.supabaseError.message,
        })
      );
    });

    it('should return false when database throws exception', async () => {
      mockFrom.single.mockRejectedValue(new Error('Connection failed'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Supabase health check failed',
        expect.objectContaining({
          error: 'Connection failed',
        })
      );
    });
  });
});