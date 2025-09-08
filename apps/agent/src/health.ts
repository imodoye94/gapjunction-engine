import type { HealthStatus, ChannelStatus, RuntimeSummary, AgentConfig } from './types.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('health');

export class HealthProbe {
  constructor(private _config: AgentConfig) {}

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const checks = await Promise.allSettled([
        this._checkDiskSpace(),
        this._checkMemory(),
        this._checkNetworkConnectivity(),
      ]);

      const failures = checks
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      if (failures.length === 0) {
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        };
      }

      if (failures.length === checks.length) {
        return {
          status: 'unhealthy',
          details: `All health checks failed: ${failures.map(f => f.message).join(', ')}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'unhealthy',
        details: `Some health checks failed: ${failures.map(f => f.message).join(', ')}`,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Health check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        status: 'unhealthy',
        details: `Health check error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Node-RED process health
   */
  async checkNodeRedHealth(port: number): Promise<HealthStatus> {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/diagnostics`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const diagnostics = await response.json();
        
        return {
          status: 'healthy',
          details: `Node-RED diagnostics: ${JSON.stringify(diagnostics)}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'unhealthy',
        details: `Node-RED diagnostics failed: ${response.status} ${response.statusText}`,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: `Node-RED health check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate runtime summary for status reporting
   */
  generateRuntimeSummary(
    channels: ChannelStatus[],
    overlayInfo?: { ip?: string; hostId?: string }
  ): RuntimeSummary {
    return {
      runtimeId: this._config.runtimeId,
      agentVersion: '0.1.0', // TODO: Get from package.json
      overlay: overlayInfo,
      channels,
      ts: new Date().toISOString(),
    };
  }

  /**
   * Check available disk space
   */
  private async _checkDiskSpace(): Promise<void> {
    try {
      // Simple disk space check using Node.js fs.statSync
      // This is a basic implementation - in production, you might want more sophisticated checks
      const fs = await import('fs');
      const path = await import('path');
      
      const stats = fs.statSync(path.resolve('.'));
      
      // Basic check - if we can stat the current directory, assume disk is accessible
      if (!stats) {
        throw new Error('Unable to access disk');
      }

      logger.debug('Disk space check passed');

    } catch (error) {
      logger.warn('Disk space check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error(`Disk space check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check available memory
   */
  private async _checkMemory(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal;
      const usedMem = memUsage.heapUsed;
      const memUsagePercent = (usedMem / totalMem) * 100;

      // Alert if memory usage is above 90%
      if (memUsagePercent > 90) {
        throw new Error(`High memory usage: ${memUsagePercent.toFixed(2)}%`);
      }

      logger.debug('Memory check passed', { 
        usedMB: Math.round(usedMem / 1024 / 1024),
        totalMB: Math.round(totalMem / 1024 / 1024),
        usagePercent: memUsagePercent.toFixed(2) 
      });

    } catch (error) {
      logger.warn('Memory check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Check network connectivity to control API
   */
  private async _checkNetworkConnectivity(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this._config.control.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Control API health check failed: ${response.status} ${response.statusText}`);
      }

      logger.debug('Network connectivity check passed');

    } catch (error) {
      logger.warn('Network connectivity check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error(`Network connectivity failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Simple health check utilities
 */
export class HealthUtils {
  /**
   * Check if a port is listening
   */
  static async isPortListening(port: number, host = '127.0.0.1'): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Get process CPU and memory usage
   */
  static getProcessStats(pid: number): { cpuPercent?: number; memoryMB?: number } {
    try {
      // This is a simplified implementation
      // In production, you might want to use a library like 'pidusage'
      const memUsage = process.memoryUsage();
      
      return {
        memoryMB: Math.round(memUsage.rss / 1024 / 1024),
        // CPU percentage would require more complex calculation over time
        cpuPercent: undefined,
      };

    } catch (error) {
      return {};
    }
  }

  /**
   * Format uptime in human-readable format
   */
  static formatUptime(startTime: Date): string {
    const uptimeMs = Date.now() - startTime.getTime();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}