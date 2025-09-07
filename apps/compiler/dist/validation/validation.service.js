import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
import { validateChannelIR, validateStage, validateEdge, validateParams } from '@gapjunction/ir-schema';
let ValidationService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ValidationService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ValidationService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new Logger(ValidationService.name);
        /**
         * Validates a complete Channel IR document
         */
        async validateChannel(input) {
            this.logger.debug('Validating channel IR');
            try {
                const result = validateChannelIR(input);
                if (!result.valid) {
                    this.logger.warn('Channel validation failed', { errors: result.errors });
                }
                else {
                    this.logger.debug('Channel validation successful', {
                        channelId: result.channel?.channelId,
                        title: result.channel?.title
                    });
                }
                return {
                    valid: result.valid,
                    channel: result.channel,
                    errors: result.errors,
                };
            }
            catch (error) {
                this.logger.error('Channel validation error', error);
                return {
                    valid: false,
                    errors: [`Validation error: ${error.message}`],
                };
            }
        }
        /**
         * Validates a single stage definition
         */
        async validateStage(input) {
            this.logger.debug('Validating stage');
            try {
                const result = validateStage(input);
                if (!result.valid) {
                    this.logger.warn('Stage validation failed', { errors: result.errors });
                }
                return {
                    valid: result.valid,
                    stage: result.stage,
                    errors: result.errors,
                };
            }
            catch (error) {
                this.logger.error('Stage validation error', error);
                return {
                    valid: false,
                    errors: [`Stage validation error: ${error.message}`],
                };
            }
        }
        /**
         * Validates a single edge definition
         */
        async validateEdge(input) {
            this.logger.debug('Validating edge');
            try {
                const result = validateEdge(input);
                if (!result.valid) {
                    this.logger.warn('Edge validation failed', { errors: result.errors });
                }
                return {
                    valid: result.valid,
                    edge: result.edge,
                    errors: result.errors,
                };
            }
            catch (error) {
                this.logger.error('Edge validation error', error);
                return {
                    valid: false,
                    errors: [`Edge validation error: ${error.message}`],
                };
            }
        }
        /**
         * Validates parameter values
         */
        async validateParameters(input) {
            this.logger.debug('Validating parameters');
            try {
                const result = validateParams(input);
                if (!result.valid) {
                    this.logger.warn('Parameter validation failed', { errors: result.errors });
                }
                return {
                    valid: result.valid,
                    errors: result.errors,
                };
            }
            catch (error) {
                this.logger.error('Parameter validation error', error);
                return {
                    valid: false,
                    errors: [`Parameter validation error: ${error.message}`],
                };
            }
        }
        /**
         * Performs comprehensive validation of a channel including semantic checks
         */
        async validateChannelComprehensive(input) {
            this.logger.debug('Performing comprehensive channel validation');
            const result = await this.validateChannel(input);
            if (!result.valid || !result.channel) {
                return result;
            }
            const warnings = [];
            const channel = result.channel;
            // Additional semantic validations
            try {
                // Check for orphaned stages (stages with no incoming or outgoing edges)
                const stageIds = new Set(channel.stages.map(s => s.id));
                const connectedStages = new Set();
                channel.edges.forEach(edge => {
                    connectedStages.add(edge.from.stageId);
                    connectedStages.add(edge.to.stageId);
                });
                const orphanedStages = channel.stages.filter(stage => !connectedStages.has(stage.id));
                if (orphanedStages.length > 0) {
                    warnings.push(`Found ${orphanedStages.length} orphaned stages: ${orphanedStages.map(s => s.id).join(', ')}`);
                }
                // Check for circular dependencies (basic check)
                const hasCircularDependency = this.detectCircularDependencies(channel);
                if (hasCircularDependency) {
                    warnings.push('Potential circular dependency detected in stage connections');
                }
                // Validate nexon references exist (placeholder - would need nexon catalog)
                const uniqueNexonIds = new Set(channel.stages.map(s => s.nexonId));
                this.logger.debug(`Channel uses ${uniqueNexonIds.size} unique nexon types`);
            }
            catch (error) {
                this.logger.error('Error during comprehensive validation', error);
                warnings.push(`Comprehensive validation warning: ${error.message}`);
            }
            return {
                ...result,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        }
        /**
         * Basic circular dependency detection
         */
        detectCircularDependencies(channel) {
            const graph = new Map();
            // Build adjacency list
            channel.stages.forEach(stage => {
                graph.set(stage.id, []);
            });
            channel.edges.forEach(edge => {
                const fromConnections = graph.get(edge.from.stageId) || [];
                fromConnections.push(edge.to.stageId);
                graph.set(edge.from.stageId, fromConnections);
            });
            // Simple DFS cycle detection
            const visited = new Set();
            const recursionStack = new Set();
            const hasCycle = (nodeId) => {
                if (recursionStack.has(nodeId)) {
                    return true;
                }
                if (visited.has(nodeId)) {
                    return false;
                }
                visited.add(nodeId);
                recursionStack.add(nodeId);
                const neighbors = graph.get(nodeId) || [];
                for (const neighbor of neighbors) {
                    if (hasCycle(neighbor)) {
                        return true;
                    }
                }
                recursionStack.delete(nodeId);
                return false;
            };
            for (const stageId of graph.keys()) {
                if (!visited.has(stageId)) {
                    if (hasCycle(stageId)) {
                        return true;
                    }
                }
            }
            return false;
        }
    };
    return ValidationService = _classThis;
})();
export { ValidationService };
//# sourceMappingURL=validation.service.js.map