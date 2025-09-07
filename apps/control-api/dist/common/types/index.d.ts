export interface ApiError {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp?: string;
}
export interface IdempotencyRecord {
    key: string;
    orgId: string;
    result: any;
    createdAt: Date;
    expiresAt: Date;
}
export interface Channel {
    channelId: string;
    orgId: string;
    projectId: string;
    userId: string;
    title: string;
    description?: string;
    irContent: any;
    irVersion: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Build {
    buildId: string;
    orgId: string;
    projectId: string;
    channelId: string;
    userId: string;
    runtimeId: string;
    runtimeType: 'cloud' | 'onprem';
    mode: 'PROD' | 'TEST';
    irContent: any;
    irVersion: number;
    notes?: string;
    bundleTarball?: string;
    compilerBundleId?: string;
    buildStatus: 'QUEUED' | 'COMPILING' | 'COMPILED' | 'FAILED';
    buildTime?: number;
    deploymentStatus?: 'QUEUED' | 'DEPLOYING' | 'DEPLOYED' | 'FAILED' | null;
    deploymentId?: string;
    deploymentTime?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Deployment {
    deploymentId: string;
    buildId: string;
    runtimeId: string;
    channelId: string;
    mode: 'PROD' | 'TEST';
    strategy: DeploymentStrategy;
    status: 'QUEUED' | 'DEPLOYING' | 'DEPLOYED' | 'FAILED';
    startedAt?: Date;
    completedAt?: Date;
    attestation?: DeploymentAttestation;
}
export interface DeploymentStrategy {
    type: 'blueGreen' | 'rolling' | 'recreate';
    healthTimeoutSec?: number;
    maxUnavailable?: number;
}
export interface DeploymentAttestation {
    bundleHash: string;
    merkleRoot: string;
    artifactHashes: Record<string, string>;
    timestamp: Date;
    signature?: string;
}
export interface Agent {
    agentId: string;
    runtimeId: string;
    orgId: string;
    version: string;
    os: string;
    nebulaIp?: string;
    status: 'ONLINE' | 'OFFLINE' | 'PENDING';
    lastHeartbeat?: Date;
    channels: AgentChannel[];
    createdAt: Date;
    updatedAt: Date;
}
export interface AgentChannel {
    channelId: string;
    state: 'RUNNING' | 'STOPPED' | 'FAILED';
    pid?: number;
    version?: string;
    health?: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
}
export interface AgentJWT {
    agentId: string;
    runtimeId: string;
    orgId: string;
    iat: number;
    exp: number;
}
export interface EnrollmentToken {
    runtimeId: string;
    orgId: string;
    userId: string;
    agentId: string;
    useP2p: boolean;
    iat: number;
    exp: number;
}
export interface CapabilityToken {
    fromRuntime: string;
    toRuntime: string;
    channelId: string;
    maxBytes: number;
    iat: number;
    exp: number;
}
export type WebSocketMessageType = 'enroll' | 'auth' | 'auth_ok' | 'auth_error' | 'heartbeat' | 'pong' | 'run_test' | 'test_result' | 'deploy' | 'deploy_result' | 'attestation' | 'log_batch' | 'metrics_batch' | 'drain_ack' | 'drain_error' | 'update_agent' | 'update_result' | 'rotate_enrollment' | 'rotate_result' | 'stop_channel' | 'start_channel' | 'get_status' | 'status' | 'error';
export interface WebSocketMessage {
    type: WebSocketMessageType;
    requestId?: string;
    payload?: any;
    timestamp?: string;
}
export interface SupabaseConfig {
    url: string;
    serviceKey: string;
    projectRef: string;
}
export interface CompilerRequest {
    channel: any;
    orgId: string;
    userId?: string;
    acknowledgedViolations?: string[];
}
export interface CompilerResponse {
    success: boolean;
    buildId: string;
    bundle?: Buffer;
    bundleHash?: string;
    merkleRoot?: string;
    artifactHashes?: Record<string, string>;
    errors?: any[];
    warnings?: any[];
    validation?: any;
    policyLint?: any;
    metadata?: any;
}
//# sourceMappingURL=index.d.ts.map