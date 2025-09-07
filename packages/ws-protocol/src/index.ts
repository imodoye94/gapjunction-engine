// packages/ws-protocol/src/index.ts
// WebSocket protocol definitions and utilities

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export function createMessage(type: string, payload: unknown): WebSocketMessage {
  return { type, payload };
}