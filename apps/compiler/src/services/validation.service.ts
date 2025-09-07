import { 
  validateChannelIR, 
  validateStage, 
  validateEdge, 
  validateParams,
  type ChannelIR,
  type Stage,
  type Edge
} from '@gapjunction/ir-schema';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ChannelValidationResult extends ValidationResult {
  channel?: ChannelIR;
}

export interface StageValidationResult extends ValidationResult {
  stage?: Stage;
}

export interface EdgeValidationResult extends ValidationResult {
  edge?: Edge;
}

export class ValidationService {
  /**
   * Validates a complete Channel IR document
   */
  async validateChannel(input: unknown): Promise<ChannelValidationResult> {
    try {
      const result = validateChannelIR(input);
      
      return await Promise.resolve({
        valid: result.valid,
        channel: result.channel ?? {} as ChannelIR,
        errors: result.errors ?? [],
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return await Promise.resolve({
        valid: false,
        errors: [`Validation error: ${errorMessage}`],
      });
    }
  }

  /**
   * Validates a single stage definition
   */
  async validateStage(input: unknown): Promise<StageValidationResult> {
    try {
      const result = validateStage(input);
      
      return await Promise.resolve({
        valid: result.valid,
        stage: result.stage ?? {} as Stage,
        errors: result.errors ?? [],
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return await Promise.resolve({
        valid: false,
        errors: [`Stage validation error: ${errorMessage}`],
      });
    }
  }

  /**
   * Validates a single edge definition
   */
  async validateEdge(input: unknown): Promise<EdgeValidationResult> {
    await Promise.resolve();
    try {
      const result = validateEdge(input);
      
      return {
        valid: result.valid,
        edge: result.edge ?? {} as Edge,
        errors: result.errors ?? [],
      };
    } catch (error: unknown) {
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
  async validateParameters(input: unknown): Promise<ValidationResult> {
    await Promise.resolve();
    try {
      const result = validateParams(input);
      
      return {
        valid: result.valid,
        errors: result.errors ?? [],
      };
    } catch (error: unknown) {
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
  async validateChannelComprehensive(input: unknown): Promise<ChannelValidationResult> {
    const result = await this.validateChannel(input);
    
    if (!result.valid || !result.channel) {
      return result;
    }

    const warnings: string[] = [];
    const channel = result.channel;

    // Additional semantic validations
    try {
      // Check for orphaned stages (stages with no incoming or outgoing edges)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const stageIds = new Set(channel.stages.map((s: Stage) => s.id));
      const connectedStages = new Set<string>();
      
      channel.edges.forEach((edge: Edge) => {
        connectedStages.add(edge.from.stageId);
        connectedStages.add(edge.to.stageId);
      });

      const orphanedStages = channel.stages.filter((stage: Stage) => !connectedStages.has(stage.id));
      if (orphanedStages.length > 0) {
        warnings.push(`Found ${orphanedStages.length} orphaned stages: ${orphanedStages.map((s: Stage) => s.id).join(', ')}`);
      }

      // Check for circular dependencies (basic check)
      const hasCircularDependency = this._detectCircularDependencies(channel);
      if (hasCircularDependency) {
        warnings.push('Potential circular dependency detected in stage connections');
      }

      // Validate nexon references exist (placeholder - would need nexon catalog)
      const uniqueNexonIds = new Set(channel.stages.map((s: Stage) => s.nexonId));
      // Log for debugging purposes
      if (uniqueNexonIds.size > 0) {
        // This is just for internal tracking
      }

    } catch (error: unknown) {
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
  private _detectCircularDependencies(channel: ChannelIR): boolean {
    const graph = new Map<string, string[]>();
    
    // Build adjacency list
    channel.stages.forEach((stage: Stage) => {
      graph.set(stage.id, []);
    });
    
    channel.edges.forEach((edge: Edge) => {
      const fromConnections = graph.get(edge.from.stageId) ?? [];
      fromConnections.push(edge.to.stageId);
      graph.set(edge.from.stageId, fromConnections);
    });

    // Simple DFS cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
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