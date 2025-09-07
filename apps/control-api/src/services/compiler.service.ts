import axios from 'axios';

import type { CompilerRequest, CompilerResponse } from '../common/types/index.js';
import type { AxiosInstance } from 'axios';
import type * as winston from 'winston';

interface ConfigService {
  get: <T>(key: string, defaultValue?: T) => T;
}

export class CompilerService {
  private readonly _logger: winston.Logger;
  private readonly _httpClient: AxiosInstance;
  private readonly _compilerUrl: string;

  constructor(
    private readonly _configService: ConfigService,
    logger: winston.Logger
  ) {
    this._logger = logger;
    this._compilerUrl = this._configService.get<string>('COMPILER_URL', 'http://localhost:3001');
    
    this._httpClient = axios.create({
      baseURL: this._compilerUrl,
      timeout: 30000, // 30 second timeout for compilation
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this._httpClient.interceptors.request.use(
      (config) => {
        this._logger.debug(`Compiler request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      async (error) => {
        this._logger.error('Compiler request error:', error);
        return await Promise.reject(error);
      }
    );

    this._httpClient.interceptors.response.use(
      (response) => {
        this._logger.debug(`Compiler response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        this._logger.error('Compiler response error:', error.response?.data ?? error.message);
        return await Promise.reject(error);
      }
    );
  }

  async compile(request: CompilerRequest): Promise<CompilerResponse> {
    try {
      this._logger.info(`Compiling channel for org ${request.orgId}`, {
        userId: request.userId,
        channelId: request.channel?.channelId,
      });

      const startTime = Date.now();
      
      const response = await this._httpClient.post('/compiler/compile', request);
      
      const duration = Date.now() - startTime;
      this._logger.info(`Compilation completed in ${duration}ms`, {
        success: response.data.success,
        buildId: response.data.buildId,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // HTTP error response from compiler
          this._logger.error(`Compiler HTTP error: ${error.response.status}`, error.response.data);
          throw new Error(`Compilation failed: ${error.response.data ?? 'HTTP error'}`);
        } else if (error.request) {
          // Network error
          this._logger.error('Compiler network error:', error.message);
          throw new Error('Compiler service unavailable');
        }
      }
      
      // Other error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error('Compiler error:', errorMessage);
      throw new Error('Internal compilation error');
    }
  }

  async getStatus(buildId: string): Promise<Record<string, unknown>> {
    try {
      this._logger.debug(`Getting compilation status for build ${buildId}`);

      const response = await this._httpClient.get(`/compiler/status/${buildId}`);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.error(`Failed to get build status for ${buildId}`, { error: errorMessage });
      throw new Error('Failed to get build status');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const HEALTH_CHECK_TIMEOUT = 5000;
      const response = await this._httpClient.get('/health', { timeout: HEALTH_CHECK_TIMEOUT });
      const HTTP_OK = 200;
      return response.status === HTTP_OK;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._logger.warn('Compiler health check failed', { error: errorMessage });
      return false;
    }
  }
}