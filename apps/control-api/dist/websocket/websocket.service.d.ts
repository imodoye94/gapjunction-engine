import type { Socket } from 'socket.io';
import type * as winston from 'winston';
import type { WebSocketMessage } from '../common/types/index.js';
export declare class WebSocketService {
    private readonly _logger;
    private readonly _connectedAgents;
    constructor(logger: winston.Logger);
    validateAgentToken(token: string, agentId: string, runtimeId: string): Promise<boolean>;
    registerAgent(client: Socket, agentId: string, runtimeId: string): Promise<void>;
    unregisterAgent(client: Socket, agentId: string, runtimeId: string): Promise<void>;
    handleHeartbeat(agentId: string, runtimeId: string, payload: Record<string, unknown>): Promise<void>;
    handleTestResult(agentId: string, runtimeId: string, message: WebSocketMessage): Promise<void>;
    handleDeployResult(agentId: string, runtimeId: string, message: WebSocketMessage): Promise<void>;
    handleAttestation(agentId: string, runtimeId: string, message: WebSocketMessage): Promise<void>;
    handleLogBatch(agentId: string, runtimeId: string, message: WebSocketMessage): Promise<void>;
    handleMetricsBatch(agentId: string, runtimeId: string, message: WebSocketMessage): Promise<void>;
    handleError(agentId: string, runtimeId: string, message: WebSocketMessage): Promise<void>;
    sendToAgent(agentId: string, runtimeId: string, message: WebSocketMessage): Promise<boolean>;
    sendDeployCommand(agentId: string, runtimeId: string, deploymentId: string, bundle: Record<string, unknown>, strategy: Record<string, unknown>): Promise<boolean>;
    sendTestCommand(agentId: string, runtimeId: string, testId: string, bundle: Record<string, unknown>): Promise<boolean>;
    sendStopChannelCommand(agentId: string, runtimeId: string, channelId: string): Promise<boolean>;
    sendStartChannelCommand(agentId: string, runtimeId: string, channelId: string): Promise<boolean>;
    getConnectedAgents(): Promise<string[]>;
    isAgentConnected(agentId: string, runtimeId: string): Promise<boolean>;
}
//# sourceMappingURL=websocket.service.d.ts.map