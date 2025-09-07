import { __esDecorate, __runInitializers } from "tslib";
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
let HealthController = (() => {
    let _classDecorators = [ApiTags('health'), Controller('health')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getHealth_decorators;
    let _getReadiness_decorators;
    let _getLiveness_decorators;
    var HealthController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getHealth_decorators = [Get(), ApiOperation({
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
                            service: { type: 'string' },
                            version: { type: 'string' },
                            uptime: { type: 'number' },
                        }
                    }
                })];
            _getReadiness_decorators = [Get('ready'), ApiOperation({
                    summary: 'Readiness check',
                    description: 'Returns whether the service is ready to accept requests'
                }), ApiResponse({
                    status: 200,
                    description: 'Service is ready',
                    schema: {
                        type: 'object',
                        properties: {
                            ready: { type: 'boolean' },
                            timestamp: { type: 'string' },
                        }
                    }
                })];
            _getLiveness_decorators = [Get('live'), ApiOperation({
                    summary: 'Liveness check',
                    description: 'Returns whether the service is alive'
                }), ApiResponse({
                    status: 200,
                    description: 'Service is alive',
                    schema: {
                        type: 'object',
                        properties: {
                            alive: { type: 'boolean' },
                            timestamp: { type: 'string' },
                        }
                    }
                })];
            __esDecorate(this, null, _getHealth_decorators, { kind: "method", name: "getHealth", static: false, private: false, access: { has: obj => "getHealth" in obj, get: obj => obj.getHealth }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getReadiness_decorators, { kind: "method", name: "getReadiness", static: false, private: false, access: { has: obj => "getReadiness" in obj, get: obj => obj.getReadiness }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getLiveness_decorators, { kind: "method", name: "getLiveness", static: false, private: false, access: { has: obj => "getLiveness" in obj, get: obj => obj.getLiveness }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            HealthController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        getHealth() {
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'gapjunction-compiler',
                version: '1.0.0',
                uptime: process.uptime(),
            };
        }
        getReadiness() {
            return {
                ready: true,
                timestamp: new Date().toISOString(),
            };
        }
        getLiveness() {
            return {
                alive: true,
                timestamp: new Date().toISOString(),
            };
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
    return HealthController = _classThis;
})();
export { HealthController };
//# sourceMappingURL=health.controller.js.map