import axios from 'axios';
export class CompilerService {
    _configService;
    _logger;
    _httpClient;
    _compilerUrl;
    constructor(_configService, logger) {
        this._configService = _configService;
        this._logger = logger;
        this._compilerUrl = this._configService.get('COMPILER_URL', 'http://localhost:3001');
        this._httpClient = axios.create({
            baseURL: this._compilerUrl,
            timeout: 30000, // 30 second timeout for compilation
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Add request/response interceptors for logging
        this._httpClient.interceptors.request.use((config) => {
            this._logger.debug(`Compiler request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            this._logger.error('Compiler request error:', error);
            return Promise.reject(error);
        });
        this._httpClient.interceptors.response.use((response) => {
            this._logger.debug(`Compiler response: ${response.status} ${response.config.url}`);
            return response;
        }, (error) => {
            this._logger.error('Compiler response error:', error.response?.data || error.message);
            return Promise.reject(error);
        });
    }
    async compile(request) {
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
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // HTTP error response from compiler
                    this._logger.error(`Compiler HTTP error: ${error.response.status}`, error.response.data);
                    throw new Error(`Compilation failed: ${error.response.data || 'HTTP error'}`);
                }
                else if (error.request) {
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
    async getStatus(buildId) {
        try {
            this._logger.debug(`Getting compilation status for build ${buildId}`);
            const response = await this._httpClient.get(`/compiler/status/${buildId}`);
            return response.data;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.error(`Failed to get build status for ${buildId}`, { error: errorMessage });
            throw new Error('Failed to get build status');
        }
    }
    async healthCheck() {
        try {
            const response = await this._httpClient.get('/health', { timeout: 5000 });
            return response.status === 200;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this._logger.warn('Compiler health check failed', { error: errorMessage });
            return false;
        }
    }
}
//# sourceMappingURL=compiler.service.js.map