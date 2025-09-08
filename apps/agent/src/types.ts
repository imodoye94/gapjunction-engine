// Re-export from ws-protocol and extend with agent-specific types
// Note: ws-protocol types will be imported when the package is built
import type { ChildProcess } from 'child_process';

// Basic WebSocket message interface (fallback if ws-protocol is minimal)
export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

// Agent-specific types based on the engineering brief

export type Platform = 'win' | 'mac' | 'linux';

export interface AgentHello {
  op: 'hello';
  runtimeId: string;
  agentVersion: string;
  deviceId: string;
  nebula?: { ip?: string; hostId?: string };
  capabilities: { 
    mqtt: boolean; 
    httpProxy: boolean; 
    platform: Platform;
  };
}

export type ControlToAgent =
  | { op: 'deploy'; buildId: string; bundleContent: string; channelId: string; mode: 'TEST' | 'PROD'; secretPayload?: Uint8Array }
  | { op: 'start'; channelId: string }
  | { op: 'stop'; channelId: string; drainMs?: number }
  | { op: 'restart'; channelId: string }
  | { op: 'status'; correlationId: string }
  | { op: 'update-agent'; url: string; signature: Uint8Array }
  | { op: 'overlay-enroll'; enrollmentCode: string };

export type AgentToControl =
  | { op: 'hello'; payload: AgentHello }
  | { op: 'ack'; ref?: string }
  | { op: 'status'; correlationId?: string; summary: RuntimeSummary }
  | { op: 'deploy-result'; channelId: string; buildId: string; ok: boolean; details?: string }
  | { op: 'log'; channelId?: string; level: 'info' | 'warn' | 'error'; msg: string }
  | { op: 'heartbeat'; ts: number };

export interface ChannelStatus {
  channelId: string;
  state: 'stopped' | 'starting' | 'running' | 'draining' | 'error';
  pid?: number;
  port?: number;
  buildId?: string;
  startedAt?: string;
  cpuPct?: number;
  rssMb?: number;
}

export interface RuntimeSummary {
  runtimeId: string;
  agentVersion: string;
  overlay?: { ip?: string; hostId?: string };
  channels: ChannelStatus[];
  ts: string;
}

export interface AgentConfig {
  runtimeId: string;
  bootstrapToken?: string;
  control: {
    baseUrl: string;
    wsPath: string;
  };
  overlay: {
    enabled: boolean;
    lighthouses: string[];
  };
  mqtt: {
    enabled: boolean;
    host: string;
    port: number;
  };
  nodeRed: {
    bin: string;
  };
  security: {
    nodeRedAdminPath: string;
    apiAdminHost: string;
    apiAdminPort: string;
  };
  sidecars?: {
    installOrthanc?: boolean;
    installSyncthing?: boolean;
  };
}

export interface DeviceIdentity {
  deviceId: string;
  devicePublicKey: string;
  devicePrivateKey: string;
  machineFingerprint: string;
  issuedAt: string;
}

export interface TokenState {
  agentJwt: string;
  refreshToken: string;
  expiresAt: string;
}

export interface OverlayState {
  dnEnrolled: boolean;
  nebulaIp?: string;
  hostId?: string;
}

export interface BundleManifest {
  version: number;
  channelId: string;
  buildId: string;
  mode: 'TEST' | 'PROD';
  artifacts: {
    flowsJsonPath: string;
    settingsPath: string;
    credentialsMapPath?: string;
  };
}

export type CredentialsMap = Record<string, string>;

export interface NodeRedProcess {
  channelId: string;
  buildId: string;
  pid: number;
  port: number;
  process: ChildProcess;
  startedAt: Date;
  adminPassword: string;
  credSecret: string;
}

export interface MQTTTopicConventions {
  channelIn: (channelId: string) => string;
  channelOut: (channelId: string) => string;
}

export const MQTT_TOPICS: MQTTTopicConventions = {
  channelIn: (channelId: string) => `gj/${channelId}/in`,
  channelOut: (channelId: string) => `gj/${channelId}/out`,
};

export interface CommandHandlers {
  onDeploy: (buildId: string, bundleContent: string, channelId: string, mode: 'TEST' | 'PROD', secretPayload?: Uint8Array) => Promise<void>;
  onStart: (channelId: string) => Promise<void>;
  onStop: (channelId: string, drainMs?: number) => Promise<void>;
  onRestart: (channelId: string) => Promise<void>;
  onStatus: (correlationId: string) => Promise<void>;
  onUpdateAgent: (url: string, signature: Uint8Array) => Promise<void>;
  onOverlayEnroll: (enrollmentCode: string) => Promise<void>;
}

export interface BundleInfo {
  channelId: string;
  buildId: string;
  mode: 'TEST' | 'PROD';
  buildDir: string;
  manifest: BundleManifest;
  flowsPath: string;
  settingsPath: string;
  credentialsMapPath?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  details?: string;
  timestamp: string;
}