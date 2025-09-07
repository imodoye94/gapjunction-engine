import { __esDecorate, __runInitializers } from "tslib";
import { Controller, Post, HttpCode, HttpStatus, Logger, Get, BadRequestException, InternalServerErrorException, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
// DTOs for request validation
let CompileRequestDto = (() => {
    let _channel_decorators;
    let _channel_initializers = [];
    let _channel_extraInitializers = [];
    let _orgId_decorators;
    let _orgId_initializers = [];
    let _orgId_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _acknowledgedViolations_decorators;
    let _acknowledgedViolations_initializers = [];
    let _acknowledgedViolations_extraInitializers = [];
    return class CompileRequestDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _channel_decorators = [IsObject()];
            _orgId_decorators = [IsOptional(), IsString()];
            _userId_decorators = [IsOptional(), IsString()];
            _acknowledgedViolations_decorators = [IsOptional(), IsArray(), IsString({ each: true })];
            __esDecorate(null, null, _channel_decorators, { kind: "field", name: "channel", static: false, private: false, access: { has: obj => "channel" in obj, get: obj => obj.channel, set: (obj, value) => { obj.channel = value; } }, metadata: _metadata }, _channel_initializers, _channel_extraInitializers);
            __esDecorate(null, null, _orgId_decorators, { kind: "field", name: "orgId", static: false, private: false, access: { has: obj => "orgId" in obj, get: obj => obj.orgId, set: (obj, value) => { obj.orgId = value; } }, metadata: _metadata }, _orgId_initializers, _orgId_extraInitializers);
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _acknowledgedViolations_decorators, { kind: "field", name: "acknowledgedViolations", static: false, private: false, access: { has: obj => "acknowledgedViolations" in obj, get: obj => obj.acknowledgedViolations, set: (obj, value) => { obj.acknowledgedViolations = value; } }, metadata: _metadata }, _acknowledgedViolations_initializers, _acknowledgedViolations_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        channel = __runInitializers(this, _channel_initializers, void 0);
        orgId = (__runInitializers(this, _channel_extraInitializers), __runInitializers(this, _orgId_initializers, void 0));
        userId = (__runInitializers(this, _orgId_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
        acknowledgedViolations = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _acknowledgedViolations_initializers, void 0));
        constructor() {
            __runInitializers(this, _acknowledgedViolations_extraInitializers);
        }
    };
})();
export { CompileRequestDto };
let SecurityAckRequestDto = (() => {
    let _channelId_decorators;
    let _channelId_initializers = [];
    let _channelId_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _violationIds_decorators;
    let _violationIds_initializers = [];
    let _violationIds_extraInitializers = [];
    let _reason_decorators;
    let _reason_initializers = [];
    let _reason_extraInitializers = [];
    return class SecurityAckRequestDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _channelId_decorators = [IsString()];
            _userId_decorators = [IsString()];
            _violationIds_decorators = [IsArray(), IsString({ each: true })];
            _reason_decorators = [IsString()];
            __esDecorate(null, null, _channelId_decorators, { kind: "field", name: "channelId", static: false, private: false, access: { has: obj => "channelId" in obj, get: obj => obj.channelId, set: (obj, value) => { obj.channelId = value; } }, metadata: _metadata }, _channelId_initializers, _channelId_extraInitializers);
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _violationIds_decorators, { kind: "field", name: "violationIds", static: false, private: false, access: { has: obj => "violationIds" in obj, get: obj => obj.violationIds, set: (obj, value) => { obj.violationIds = value; } }, metadata: _metadata }, _violationIds_initializers, _violationIds_extraInitializers);
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: obj => "reason" in obj, get: obj => obj.reason, set: (obj, value) => { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        channelId = __runInitializers(this, _channelId_initializers, void 0);
        userId = (__runInitializers(this, _channelId_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
        violationIds = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _violationIds_initializers, void 0));
        reason = (__runInitializers(this, _violationIds_extraInitializers), __runInitializers(this, _reason_initializers, void 0));
        constructor() {
            __runInitializers(this, _reason_extraInitializers);
        }
    };
})();
export { SecurityAckRequestDto };
let CompilerController = (() => {
    let _classDecorators = [ApiTags('compiler'), Controller('compiler')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _compile_decorators;
    let _verifySecurityAck_decorators;
    let _getStatus_decorators;
    let _getHealth_decorators;
    var CompilerController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _compile_decorators = [Post('compile'), HttpCode(HttpStatus.OK), ApiOperation({
                    summary: 'Compile a channel IR',
                    description: 'Validates and compiles a GapJunction channel IR into executable artifacts'
                }), ApiBody({ type: CompileRequestDto }), ApiResponse({
                    status: 200,
                    description: 'Compilation completed (may include warnings or errors)',
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            buildId: { type: 'string' },
                            validation: {
                                type: 'object',
                                properties: {
                                    valid: { type: 'boolean' },
                                    errors: { type: 'array', items: { type: 'string' } },
                                    warnings: { type: 'array', items: { type: 'string' } },
                                }
                            },
                            policyLint: {
                                type: 'object',
                                properties: {
                                    passed: { type: 'boolean' },
                                    violations: { type: 'array' },
                                    summary: {
                                        type: 'object',
                                        properties: {
                                            errors: { type: 'number' },
                                            warnings: { type: 'number' },
                                            info: { type: 'number' },
                                        }
                                    }
                                }
                            },
                            errors: { type: 'array', items: { type: 'string' } },
                            warnings: { type: 'array', items: { type: 'string' } },
                            bundle: {
                                type: 'string',
                                format: 'binary',
                                description: 'Compiled bundle as .tgz file (base64 encoded)'
                            },
                            artifactHashes: {
                                type: 'object',
                                properties: {
                                    flowsJson: { type: 'string' },
                                    settings: { type: 'string' },
                                    manifest: { type: 'string' },
                                    credentialsMap: { type: 'string' },
                                }
                            },
                            bundleHash: { type: 'string', description: 'SHA-256 hash of the bundle' },
                            merkleRoot: { type: 'string', description: 'Merkle root for blockchain anchoring' },
                            metadata: {
                                type: 'object',
                                properties: {
                                    orgId: { type: 'string' },
                                    userId: { type: 'string' },
                                    runtime: {
                                        type: 'object',
                                        properties: {
                                            target: { type: 'string' },
                                            mode: { type: 'string' },
                                        }
                                    },
                                    linting: {
                                        type: 'object',
                                        properties: {
                                            errors: { type: 'number' },
                                            warnings: { type: 'number' },
                                            info: { type: 'number' },
                                        }
                                    }
                                }
                            },
                            compiledArtifacts: { type: 'object' },
                        }
                    }
                }), ApiResponse({ status: 400, description: 'Invalid request data' }), ApiResponse({ status: 500, description: 'Internal server error' })];
            _verifySecurityAck_decorators = [Post('verifySecurityAck'), HttpCode(HttpStatus.OK), ApiOperation({
                    summary: 'Verify security acknowledgment',
                    description: 'Acknowledges policy violations to allow compilation to proceed'
                }), ApiBody({ type: SecurityAckRequestDto }), ApiResponse({
                    status: 200,
                    description: 'Security acknowledgment processed',
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            acknowledgedViolations: { type: 'array', items: { type: 'string' } },
                            message: { type: 'string' },
                        }
                    }
                }), ApiResponse({ status: 400, description: 'Invalid request data' }), ApiResponse({ status: 500, description: 'Internal server error' })];
            _getStatus_decorators = [Get('status/:buildId'), ApiOperation({
                    summary: 'Get compilation status',
                    description: 'Retrieves the status of a compilation build'
                }), ApiResponse({
                    status: 200,
                    description: 'Build status retrieved',
                    schema: {
                        type: 'object',
                        properties: {
                            buildId: { type: 'string' },
                            status: { type: 'string' },
                            timestamp: { type: 'string' },
                        }
                    }
                }), ApiResponse({ status: 404, description: 'Build not found' })];
            _getHealth_decorators = [Get('health'), ApiOperation({
                    summary: 'Health check',
                    description: 'Returns the health status of the compiler service'
                }), ApiResponse({
                    status: 200,
                    description: 'Service is healthy',
                    schema: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            timestamp: { type: 'string' },
                            version: { type: 'string' },
                        }
                    }
                })];
            __esDecorate(this, null, _compile_decorators, { kind: "method", name: "compile", static: false, private: false, access: { has: obj => "compile" in obj, get: obj => obj.compile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _verifySecurityAck_decorators, { kind: "method", name: "verifySecurityAck", static: false, private: false, access: { has: obj => "verifySecurityAck" in obj, get: obj => obj.verifySecurityAck }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getStatus_decorators, { kind: "method", name: "getStatus", static: false, private: false, access: { has: obj => "getStatus" in obj, get: obj => obj.getStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getHealth_decorators, { kind: "method", name: "getHealth", static: false, private: false, access: { has: obj => "getHealth" in obj, get: obj => obj.getHealth }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CompilerController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        compilerService = __runInitializers(this, _instanceExtraInitializers);
        logger = new Logger(CompilerController.name);
        constructor(compilerService) {
            this.compilerService = compilerService;
        }
        async compile(request) {
            // Log the raw request body for debugging
            this.logger.log('[DEBUG] Raw compile request body', { request });
            this.logger.log('Received compile request', {
                orgId: request.orgId,
                userId: request.userId,
                hasChannel: !!request.channel,
                acknowledgedCount: request.acknowledgedViolations?.length || 0,
            });
            try {
                const result = await this.compilerService.compile(request);
                this.logger.log('Compile request completed', {
                    success: result.success,
                    buildId: result.buildId,
                    errorCount: result.errors?.length || 0,
                    warningCount: result.warnings?.length || 0,
                });
                return result;
            }
            catch (error) {
                this.logger.error('[DEBUG] Compile request failed', error, { errorMessage: error.message, errorStack: error.stack });
                throw new InternalServerErrorException('Compilation failed');
            }
        }
        async verifySecurityAck(request) {
            this.logger.log('Received security acknowledgment request', {
                channelId: request.channelId,
                userId: request.userId,
                violationCount: request.violationIds.length,
            });
            try {
                const result = await this.compilerService.verifySecurityAck(request);
                this.logger.log('Security acknowledgment completed', {
                    success: result.success,
                    acknowledgedCount: result.acknowledgedViolations.length,
                });
                return result;
            }
            catch (error) {
                this.logger.error('Security acknowledgment failed', error);
                throw new InternalServerErrorException('Security acknowledgment failed');
            }
        }
        async getStatus(buildId) {
            if (!buildId) {
                throw new BadRequestException('Build ID is required');
            }
            this.logger.debug('Retrieving build status', { buildId });
            try {
                const status = await this.compilerService.getCompilationStatus(buildId);
                return status;
            }
            catch (error) {
                this.logger.error('Failed to retrieve build status', error, { buildId });
                throw new InternalServerErrorException('Failed to retrieve build status');
            }
        }
        getHealth() {
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };
        }
    };
    return CompilerController = _classThis;
})();
export { CompilerController };
//# sourceMappingURL=compiler.controller.js.map