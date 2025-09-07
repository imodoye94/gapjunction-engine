import { createServer } from 'http';


import { Server as SocketIOServer } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { fixtures } from './fixtures/index.js';
import { createMockLogger } from './utils/test-helpers.js';

import type { AddressInfo } from 'net';
import type { Socket as ClientSocket } from 'socket.io-client';

describe('WebSocket Integration Tests', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let serverPort: number;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = createMockLogger();
    
    // Create HTTP server
    httpServer = createServer();
    
    // Create Socket.IO server
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
      path: '/socket.io/',
    });

    // Setup WebSocket event handlers
    io.on('connection', (socket) => {
      mockLogger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('enroll', async (data) => {
        mockLogger.info('Agent enrollment request', { socketId: socket.id, runtimeId: data.runtimeId });
        try {
          // Mock successful enrollment
          const result = {
            agentId: `agent-${Date.now()}`,
            agentJwt: 'mock-agent-jwt-token',
            overlay: {
              enabled: true,
              enrollmentCode: 'mock-enrollment-code',
              lighthouses: ['lighthouse1.example.com', 'lighthouse2.example.com'],
            },
          };
          socket.emit('enroll_result', result);
        } catch (error) {
          mockLogger.error('Agent enrollment failed', error);
          socket.emit('enroll_error', { error: 'Enrollment failed' });
        }
      });

      socket.on('heartbeat', async (data) => {
        mockLogger.debug('Agent heartbeat', { socketId: socket.id, agentId: data.agentId });
        try {
          // Mock heartbeat processing
          socket.emit('heartbeat_ack', {
            agentId: data.agentId,
            timestamp: new Date().toISOString(),
            status: 'acknowledged',
          });
        } catch (error) {
          mockLogger.error('Heartbeat processing failed', error);
          socket.emit('heartbeat_error', { error: 'Heartbeat processing failed' });
        }
      });

      socket.on('auth', async (data) => {
        mockLogger.info('Agent authentication request', { socketId: socket.id, agentId: data.agentId });
        try {
          // Mock authentication validation
          if (data.agentJwt?.startsWith('mock-')) {
            socket.emit('auth_ok', {
              agentId: data.agentId,
              authenticated: true,
              timestamp: new Date().toISOString(),
            });
          } else {
            socket.emit('auth_error', { error: 'Invalid JWT token' });
          }
        } catch (error) {
          mockLogger.error('Authentication failed', error);
          socket.emit('auth_error', { error: 'Authentication failed' });
        }
      });

      socket.on('run_test', async (data) => {
        mockLogger.info('Test run request', { socketId: socket.id, channelId: data.channelId });
        try {
          // Mock test execution
          setTimeout(() => {
            socket.emit('test_result', {
              channelId: data.channelId,
              testId: data.testId,
              status: 'PASSED',
              results: {
                duration: 1500,
                assertions: 5,
                passed: 5,
                failed: 0,
              },
              timestamp: new Date().toISOString(),
            });
          }, 100);
        } catch (error) {
          mockLogger.error('Test execution failed', error);
          socket.emit('test_result', {
            channelId: data.channelId,
            testId: data.testId,
            status: 'FAILED',
            error: 'Test execution failed',
          });
        }
      });

      socket.on('deploy', async (data) => {
        mockLogger.info('Deploy request', { socketId: socket.id, buildId: data.buildId });
        try {
          // Mock deployment process
          setTimeout(() => {
            socket.emit('deploy_result', {
              buildId: data.buildId,
              deployId: `deploy-${Date.now()}`,
              status: 'DEPLOYED',
              timestamp: new Date().toISOString(),
            });
          }, 200);
        } catch (error) {
          mockLogger.error('Deployment failed', error);
          socket.emit('deploy_result', {
            buildId: data.buildId,
            status: 'FAILED',
            error: 'Deployment failed',
          });
        }
      });

      socket.on('get_status', async (data) => {
        mockLogger.info('Status request', { socketId: socket.id, channelId: data.channelId });
        try {
          socket.emit('status', {
            channelId: data.channelId,
            runtimeId: data.runtimeId,
            status: 'RUNNING',
            health: 'HEALTHY',
            uptime: 3600,
            metrics: {
              cpuUsage: 0.25,
              memoryUsage: 0.45,
              diskUsage: 0.60,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          mockLogger.error('Status request failed', error);
          socket.emit('error', { error: 'Status request failed' });
        }
      });

      socket.on('start_channel', async (data) => {
        mockLogger.info('Start channel request', { socketId: socket.id, channelId: data.channelId });
        socket.emit('channel_started', {
          channelId: data.channelId,
          runtimeId: data.runtimeId,
          status: 'STARTED',
          timestamp: new Date().toISOString(),
        });
      });

      socket.on('stop_channel', async (data) => {
        mockLogger.info('Stop channel request', { socketId: socket.id, channelId: data.channelId });
        socket.emit('channel_stopped', {
          channelId: data.channelId,
          runtimeId: data.runtimeId,
          status: 'STOPPED',
          timestamp: new Date().toISOString(),
        });
      });

      socket.on('disconnect', () => {
        mockLogger.info(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        serverPort = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    clientSocket.disconnect();
    
    await new Promise<void>((resolve) => {
      void io.close(() => {
        void httpServer.close(() => { resolve(); });
      });
    });
  });

  describe('Connection', () => {
    it('should establish WebSocket connection', async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });

      await new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => {
          expect(clientSocket.connected).toBe(true);
          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('WebSocket client connected:')
          );
          resolve();
        });

        clientSocket.on('connect_error', (error) => {
          reject(error);
        });
      });
    });

    it('should handle disconnection', async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          clientSocket.disconnect();
        });

        clientSocket.on('disconnect', () => {
          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('WebSocket client disconnected:')
          );
          resolve();
        });
      });
    });
  });

  describe('Agent Enrollment', () => {
    beforeEach(async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle successful agent enrollment', async () => {
      const enrollRequest = {
        runtimeId: 'test-runtime-123',
        bootstrapToken: 'test-bootstrap-token',
        version: '1.0.0',
        os: 'linux',
      };

      clientSocket.emit('enroll', enrollRequest);

      await new Promise<void>((resolve, reject) => {
        clientSocket.on('enroll_result', (result) => {
          expect(result).toMatchObject({
            agentId: expect.stringMatching(/^agent-\d+$/),
            agentJwt: 'mock-agent-jwt-token',
            overlay: {
              enabled: true,
              enrollmentCode: 'mock-enrollment-code',
              lighthouses: expect.arrayContaining(['lighthouse1.example.com']),
            },
          });
          expect(mockLogger.info).toHaveBeenCalledWith(
            'Agent enrollment request',
            expect.objectContaining({
              runtimeId: enrollRequest.runtimeId,
            })
          );
          resolve();
        });

        clientSocket.on('enroll_error', (error) => {
          reject(new Error(`Enrollment failed: ${error.error}`));
        });
      });
    });
  });

  describe('Agent Authentication', () => {
    beforeEach(async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle successful authentication', async () => {
      const authRequest = {
        agentId: 'test-agent-123',
        agentJwt: 'mock-agent-jwt-token',
      };

      clientSocket.emit('auth', authRequest);

      await new Promise<void>((resolve, reject) => {
        clientSocket.on('auth_ok', (result) => {
          expect(result).toMatchObject({
            agentId: authRequest.agentId,
            authenticated: true,
            timestamp: expect.any(String),
          });
          resolve();
        });

        clientSocket.on('auth_error', (error) => {
          reject(new Error(`Authentication failed: ${error.error}`));
        });
      });
    });

    it('should handle authentication failure', async () => {
      const authRequest = {
        agentId: 'test-agent-123',
        agentJwt: 'invalid-jwt-token',
      };

      clientSocket.emit('auth', authRequest);

      await new Promise<void>((resolve, reject) => {
        clientSocket.on('auth_error', (error) => {
          expect(error.error).toBe('Invalid JWT token');
          resolve();
        });

        clientSocket.on('auth_ok', () => {
          reject(new Error('Authentication should have failed'));
        });
      });
    });
  });

  describe('Agent Heartbeat', () => {
    beforeEach(async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle heartbeat messages', async () => {
      const heartbeatData = fixtures.websocket.heartbeat();

      clientSocket.emit('heartbeat', heartbeatData);

      await new Promise<void>((resolve, reject) => {
        clientSocket.on('heartbeat_ack', (ack) => {
          expect(ack).toMatchObject({
            agentId: heartbeatData.agentId,
            timestamp: expect.any(String),
            status: 'acknowledged',
          });
          expect(mockLogger.debug).toHaveBeenCalledWith(
            'Agent heartbeat',
            expect.objectContaining({
              agentId: heartbeatData.agentId,
            })
          );
          resolve();
        });

        clientSocket.on('heartbeat_error', (error) => {
          reject(new Error(`Heartbeat failed: ${error.error}`));
        });
      });
    });
  });

  describe('Test Execution', () => {
    beforeEach(async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle test run requests', async () => {
      const testRequest = {
        channelId: 'test-channel-123',
        testId: 'test-123',
        buildId: 'build-123',
      };

      clientSocket.emit('run_test', testRequest);

      await new Promise<void>((resolve) => {
        clientSocket.on('test_result', (result) => {
          expect(result).toMatchObject({
            channelId: testRequest.channelId,
            testId: testRequest.testId,
            status: 'PASSED',
            results: {
              duration: expect.any(Number),
              assertions: expect.any(Number),
              passed: expect.any(Number),
              failed: expect.any(Number),
            },
            timestamp: expect.any(String),
          });
          resolve();
        });
      });
    });
  });

  describe('Deployment', () => {
    beforeEach(async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle deployment requests', async () => {
      const deployRequest = {
        buildId: 'test-build-123',
        runtimeId: 'test-runtime-123',
        channelId: 'test-channel-123',
      };

      clientSocket.emit('deploy', deployRequest);

      await new Promise<void>((resolve) => {
        clientSocket.on('deploy_result', (result) => {
          expect(result).toMatchObject({
            buildId: deployRequest.buildId,
            deployId: expect.stringMatching(/^deploy-\d+$/),
            status: 'DEPLOYED',
            timestamp: expect.any(String),
          });
          resolve();
        });
      });
    });
  });

  describe('Channel Management', () => {
    beforeEach(async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle channel start requests', async () => {
      const startRequest = {
        channelId: 'test-channel-123',
        runtimeId: 'test-runtime-123',
      };

      clientSocket.emit('start_channel', startRequest);

      await new Promise<void>((resolve) => {
        clientSocket.on('channel_started', (result) => {
          expect(result).toMatchObject({
            channelId: startRequest.channelId,
            runtimeId: startRequest.runtimeId,
            status: 'STARTED',
            timestamp: expect.any(String),
          });
          resolve();
        });
      });
    });

    it('should handle channel stop requests', async () => {
      const stopRequest = {
        channelId: 'test-channel-123',
        runtimeId: 'test-runtime-123',
      };

      clientSocket.emit('stop_channel', stopRequest);

      await new Promise<void>((resolve) => {
        clientSocket.on('channel_stopped', (result) => {
          expect(result).toMatchObject({
            channelId: stopRequest.channelId,
            runtimeId: stopRequest.runtimeId,
            status: 'STOPPED',
            timestamp: expect.any(String),
          });
          resolve();
        });
      });
    });

    it('should handle status requests', async () => {
      const statusRequest = {
        channelId: 'test-channel-123',
        runtimeId: 'test-runtime-123',
      };

      clientSocket.emit('get_status', statusRequest);

      await new Promise<void>((resolve) => {
        clientSocket.on('status', (result) => {
          expect(result).toMatchObject({
            channelId: statusRequest.channelId,
            runtimeId: statusRequest.runtimeId,
            status: 'RUNNING',
            health: 'HEALTHY',
            uptime: expect.any(Number),
            metrics: {
              cpuUsage: expect.any(Number),
              memoryUsage: expect.any(Number),
              diskUsage: expect.any(Number),
            },
            timestamp: expect.any(String),
          });
          resolve();
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });
      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    it('should handle connection timeout', async () => {
      const timeoutClient = Client(`http://localhost:${serverPort + 1}`, {
        path: '/socket.io/',
        timeout: 1000,
      });

      await new Promise<void>((resolve, reject) => {
        timeoutClient.on('connect_error', (error) => {
          expect(error).toBeDefined();
          timeoutClient.disconnect();
          resolve();
        });

        timeoutClient.on('connect', () => {
          reject(new Error('Connection should have failed'));
        });
      });
    });

    it('should handle invalid message format', async () => {
      // Send invalid data
      clientSocket.emit('invalid_event', { invalid: 'data' });

      // Should not crash the server
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(clientSocket.connected).toBe(true);
          resolve();
        }, 100);
      });
    });
  });

  describe('Multiple Clients', () => {
    let secondClient: ClientSocket;

    afterEach(() => {
      secondClient.disconnect();
    });

    it('should handle multiple concurrent connections', async () => {
      let connectCount = 0;

      const checkBothConnected = (): boolean => {
        connectCount++;
        if (connectCount === 2) {
          expect(clientSocket.connected).toBe(true);
          expect(secondClient.connected).toBe(true);
          return true;
        }
        return false;
      };

      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });

      secondClient = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });

      await new Promise<void>((resolve) => {
        const handleConnect = (): void => {
          if (checkBothConnected()) {
            resolve();
          }
        };

        clientSocket.on('connect', handleConnect);
        secondClient.on('connect', handleConnect);
      });
    });

    it('should handle broadcast messages', async () => {
      let messageCount = 0;

      const checkBothReceived = (): boolean => {
        messageCount++;
        return messageCount === 2;
      };

      clientSocket = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });

      secondClient = Client(`http://localhost:${serverPort}`, {
        path: '/socket.io/',
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          secondClient.on('connect', () => {
            // Setup listeners for broadcast message
            const handleBroadcast = (): void => {
              if (checkBothReceived()) {
                resolve();
              }
            };

            clientSocket.on('broadcast_test', handleBroadcast);
            secondClient.on('broadcast_test', handleBroadcast);

            // Simulate server broadcast
            io.emit('broadcast_test', { message: 'test broadcast' });
          });
        });
      });
    });
  });
});