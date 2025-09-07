import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMockCompilerResponse } from '../../test/fixtures/index.js';
import { createMockConfigService, createMockLogger } from '../../test/utils/test-helpers.js';

import { CompilerService } from './compiler.service.js';


// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

describe('CompilerService', () => {
  let service: CompilerService;
  let mockConfigService: any;
  let mockLogger: any;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfigService = createMockConfigService({
       
      'COMPILER_URL': 'http://localhost:3001',
    });
    mockLogger = createMockLogger();
    
    // Setup mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    
    (axios.create as any).mockReturnValue(mockAxiosInstance);
    
    service = new CompilerService(mockConfigService, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('COMPILER_URL', 'http://localhost:3001');
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('compile', () => {
    it('should compile successfully', async () => {
      const mockRequest = {
        channel: { channelId: 'test-channel', version: 1 },
        orgId: 'test-org-123',
        userId: 'test-user-123',
        acknowledgedViolations: [],
      };

      const mockResponse = createMockCompilerResponse(true);
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await service.compile(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/compiler/compile', mockRequest);
      expect(result).toEqual(mockResponse);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Compiling channel for org ${mockRequest.orgId}`,
        expect.objectContaining({
          userId: mockRequest.userId,
          channelId: mockRequest.channel.channelId,
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Compilation completed in'),
        expect.objectContaining({
          success: mockResponse.success,
          buildId: mockResponse.buildId,
        })
      );
    });

    it('should handle HTTP error responses', async () => {
      const mockRequest = {
        channel: { channelId: 'test-channel', version: 1 },
        orgId: 'test-org-123',
        userId: 'test-user-123',
      };

      const axiosError = {
        response: {
          status: 400,
          data: { error: 'Invalid channel structure' },
        },
        isAxiosError: true,
      };

      mockAxiosInstance.post.mockRejectedValue(axiosError);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(service.compile(mockRequest)).rejects.toThrow(
        'Compilation failed: [object Object]'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Compiler HTTP error: 400',
        axiosError.response.data
      );
    });

    it('should handle network errors', async () => {
      const mockRequest = {
        channel: { channelId: 'test-channel', version: 1 },
        orgId: 'test-org-123',
        userId: 'test-user-123',
      };

      const axiosError = {
        request: {},
        message: 'Network Error',
        isAxiosError: true,
      };

      mockAxiosInstance.post.mockRejectedValue(axiosError);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(service.compile(mockRequest)).rejects.toThrow(
        'Compiler service unavailable'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Compiler network error:',
        axiosError.message
      );
    });

    it('should handle unexpected errors', async () => {
      const mockRequest = {
        channel: { channelId: 'test-channel', version: 1 },
        orgId: 'test-org-123',
        userId: 'test-user-123',
      };

      const unexpectedError = new Error('Unexpected error');
      mockAxiosInstance.post.mockRejectedValue(unexpectedError);
      (axios.isAxiosError as any).mockReturnValue(false);

      await expect(service.compile(mockRequest)).rejects.toThrow(
        'Internal compilation error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Compiler error:',
        unexpectedError.message
      );
    });

    it('should handle non-Error exceptions', async () => {
      const mockRequest = {
        channel: { channelId: 'test-channel', version: 1 },
        orgId: 'test-org-123',
        userId: 'test-user-123',
      };

      mockAxiosInstance.post.mockRejectedValue('String error');
      (axios.isAxiosError as any).mockReturnValue(false);

      await expect(service.compile(mockRequest)).rejects.toThrow(
        'Internal compilation error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Compiler error:',
        'Unknown error'
      );
    });
  });

  describe('getStatus', () => {
    it('should get build status successfully', async () => {
      const buildId = 'test-build-123';
      const mockStatus = {
        buildId,
        status: 'COMPILED',
        progress: 100,
        artifacts: ['flows.json', 'settings.js'],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockStatus });

      const result = await service.getStatus(buildId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/compiler/status/${buildId}`);
      expect(result).toEqual(mockStatus);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Getting compilation status for build ${buildId}`
      );
    });

    it('should handle errors when getting status', async () => {
      const buildId = 'test-build-123';
      const error = new Error('Status not found');

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getStatus(buildId)).rejects.toThrow(
        'Failed to get build status'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to get build status for ${buildId}`,
        expect.objectContaining({
          error: error.message,
        })
      );
    });

    it('should handle non-Error exceptions when getting status', async () => {
      const buildId = 'test-build-123';

      mockAxiosInstance.get.mockRejectedValue('String error');

      await expect(service.getStatus(buildId)).rejects.toThrow(
        'Failed to get build status'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to get build status for ${buildId}`,
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when compiler is healthy', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', { timeout: 5000 });
    });

    it('should return false when compiler returns non-200 status', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 500 });

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when compiler request fails', async () => {
      const error = new Error('Connection refused');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Compiler health check failed',
        expect.objectContaining({
          error: error.message,
        })
      );
    });

    it('should return false when non-Error exception occurs', async () => {
      mockAxiosInstance.get.mockRejectedValue('String error');

      const result = await service.healthCheck();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Compiler health check failed',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });

  describe('request interceptors', () => {
    it('should log requests in debug mode', () => {
      // Get the request interceptor
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        method: 'post',
        url: '/compiler/compile',
      };

      const result = requestInterceptor(config);

      expect(result).toBe(config);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Compiler request: POST /compiler/compile'
      );
    });

    it('should log request errors', async () => {
      // Get the request error interceptor
      const requestErrorInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][1];
      
      const error = new Error('Request setup failed');
      
      await expect(() => requestErrorInterceptor(error)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Compiler request error:', error);
    });

    it('should log successful responses', () => {
      // Get the response interceptor
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      
      const response = {
        status: 200,
        config: { url: '/compiler/compile' },
      };

      const result = responseInterceptor(response);

      expect(result).toBe(response);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Compiler response: 200 /compiler/compile'
      );
    });

    it('should log response errors', async () => {
      // Get the response error interceptor
      const responseErrorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        response: {
          data: { error: 'Compilation failed' },
        },
      };
      
      await expect(() => responseErrorInterceptor(error)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Compiler response error:',
        error.response.data
      );
    });

    it('should log response errors without response data', async () => {
      // Get the response error interceptor
      const responseErrorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        message: 'Network error',
      };
      
      await expect(() => responseErrorInterceptor(error)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Compiler response error:',
        error.message
      );
    });
  });
});