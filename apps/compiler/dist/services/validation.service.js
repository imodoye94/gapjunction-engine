import { validateChannelIR, validateStage, validateEdge, validateParams } from '@gapjunction/ir-schema';
export class ValidationService {
    /**
     * Validates a complete Channel IR document
     */
    async validateChannel(input) {
        try {
            const result = validateChannelIR(input);
            return {
                valid: result.valid,
                channel: result.channel ?? {},
                errors: result.errors ?? [],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                valid: false,
                errors: [`Validation error: ${errorMessage}`],
            };
        }
    }
    /**
     * Validates a single stage definition
     */
    async validateStage(input) {
        try {
            const result = validateStage(input);
            return {
                valid: result.valid,
                stage: result.stage ?? {},
                errors: result.errors ?? [],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                valid: false,
                errors: [`Stage validation error: ${errorMessage}`],
            };
        }
    }
    /**
     * Validates a single edge definition
     */
    async validateEdge(input) {
        try {
            const result = validateEdge(input);
            return {
                valid: result.valid,
                edge: result.edge ?? {},
                errors: result.errors ?? [],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                valid: false,
                errors: [`Edge validation error: ${errorMessage}`],
            };
        }
    }
    /**
     * Validates parameter values
     */
    async validateParameters(input) {
        try {
            const result = validateParams(input);
            return {
                valid: result.valid,
                errors: result.errors ?? [],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                valid: false,
                errors: [`Parameter validation error: ${errorMessage}`],
            };
        }
    }
    /**
     * Performs comprehensive validation of a channel including semantic checks
     */
    async validateChannelComprehensive(input) {
        const result = await this.validateChannel(input);
        if (!result.valid || !result.channel) {
            return result;
        }
        const warnings = [];
        const channel = result.channel;
        // Additional semantic validations
        try {
            // Check for orphaned stages (stages with no incoming or outgoing edges)
            const stageIds = new Set(channel.stages.map((s) => s.id));
            const connectedStages = new Set();
            channel.edges.forEach((edge) => {
                connectedStages.add(edge.from.stageId);
                connectedStages.add(edge.to.stageId);
            });
            const orphanedStages = channel.stages.filter((stage) => !connectedStages.has(stage.id));
            if (orphanedStages.length > 0) {
                warnings.push(`Found ${orphanedStages.length} orphaned stages: ${orphanedStages.map((s) => s.id).join(', ')}`);
            }
            // Check for circular dependencies (basic check)
            const hasCircularDependency = this._detectCircularDependencies(channel);
            if (hasCircularDependency) {
                warnings.push('Potential circular dependency detected in stage connections');
            }
            // Validate nexon references exist (placeholder - would need nexon catalog)
            const uniqueNexonIds = new Set(channel.stages.map((s) => s.nexonId));
            // Log for debugging purposes
            if (uniqueNexonIds.size > 0) {
                // This is just for internal tracking
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            warnings.push(`Comprehensive validation warning: ${errorMessage}`);
        }
        return {
            ...result,
            warnings: warnings,
        };
    }
    /**
     * Basic circular dependency detection
     */
    _detectCircularDependencies(channel) {
        const graph = new Map();
        // Build adjacency list
        channel.stages.forEach((stage) => {
            graph.set(stage.id, []);
        });
        channel.edges.forEach((edge) => {
            const fromConnections = graph.get(edge.from.stageId) ?? [];
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
            const neighbors = graph.get(nodeId) ?? [];
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
}
//# sourceMappingURL=validation.service.js.map