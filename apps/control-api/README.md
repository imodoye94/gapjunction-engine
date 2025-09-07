# Gap Junction Control API

The Gap Junction Control API is the orchestration service that manages compile, deploy, and monitor workflows for the GapJunction platform. It serves as the "brain" of the system, coordinating between the Editor, Compiler, Runtime Agents, and external services.

## Features

- **Channel Management**: Compile, test, and deploy channels to runtime environments
- **Agent Communication**: WebSocket-based protocol for runtime agent coordination
- **Build Orchestration**: Manages the complete build and deployment lifecycle
- **Agent Enrollment**: Secure agent registration and JWT management
- **Capability Tokens**: P2P route tokens and enrollment codes
- **Health Monitoring**: Built-in health check endpoints

## API Endpoints

### Channels

- `POST /v1/channels/:channelId/compile` - Trigger channel compilation
- `POST /v1/channels/:channelId/start` - Start a channel on a runtime
- `POST /v1/channels/:channelId/stop` - Stop a channel on a runtime
- `GET /v1/channels/:channelId/status` - Get channel status

### Builds

- `POST /v1/builds/:buildId/deploy` - Deploy a compiled build to a runtime

### Agents

- `POST /v1/agents/enroll` - Enroll a new agent with credentials
- `POST /v1/agents/renew` - Rotate Agent JWT

### Capabilities

- `POST /v1/capabilities/route-token` - Issue P2P route capability token
- `POST /v1/capabilities/enrollment-code` - Issue agent enrollment code

### Health

- `GET /health` - General health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## WebSocket Protocol

The Control API provides a WebSocket server at `/agents/ws` for agent communication using the following message types:

### Agent → Control API
- `heartbeat` - Agent status and health updates
- `test_result` - Test execution results
- `deploy_result` - Deployment status updates
- `attestation` - Deployment attestation hashes
- `log_batch` - Batched log entries
- `metrics_batch` - Batched metrics data
- `error` - Error reports

### Control API → Agent
- `run_test` - Execute test with bundle
- `deploy` - Deploy bundle with strategy
- `stop_channel` - Stop a running channel
- `start_channel` - Start a channel
- `get_status` - Request status update
- `update_agent` - Agent update command
- `rotate_enrollment` - Rotate enrollment credentials

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install

# Build the service
pnpm run build

# Start in development mode
pnpm run start:dev

# Start in production mode
pnpm run start:prod
```

### Environment Variables

```bash
# Server configuration
PORT=3002
NODE_ENV=development

# Supabase configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Compiler service
COMPILER_URL=http://localhost:3001

# JWT secrets
AGENT_JWT_SECRET=your-agent-jwt-secret
ENROLLMENT_JWT_SECRET=your-enrollment-jwt-secret
CAPABILITY_JWT_SECRET=your-capability-jwt-secret

# DN (Defined Networking) configuration
DN_API_URL=https://api.defined.net
DN_API_KEY=your-dn-api-key

# GCP Secret Manager (future)
GCP_PROJECT_ID=your-gcp-project
GCP_SERVICE_ACCOUNT_KEY=path/to/service-account.json

# Bitcoin anchoring (future)
CHAINSTACK_API_KEY=your-chainstack-key
QUICKNODE_API_KEY=your-quicknode-key
```

### Testing

```bash
# Run unit tests
pnpm run test

# Run integration tests
pnpm run test:integration

# Run e2e tests
pnpm run test:e2e

# Run all tests
pnpm run test:all
```

## Architecture

The Control API follows a modular NestJS architecture:

- **Controllers**: Handle HTTP requests and validation
- **Services**: Implement business logic and orchestration
- **Gateways**: Manage WebSocket connections and messaging
- **DTOs**: Define request/response data structures
- **Types**: Shared type definitions and interfaces

## Security

- **Authentication**: Supabase JWT for REST API, Agent JWT for WebSocket
- **Authorization**: Role-based access control
- **Idempotency**: All critical operations support idempotency keys
- **PHI Protection**: No PHI data crosses the Control API boundary
- **Secrets**: Integration with GCP Secret Manager (future)

## Monitoring

- **Health Checks**: Kubernetes-compatible health endpoints
- **Logging**: Structured logging with Winston
- **Metrics**: Agent heartbeats and deployment attestations
- **Tracing**: Request ID tracking for debugging

## Development

### Project Structure

```
src/
├── common/           # Shared types and DTOs
├── channels/         # Channel management
├── builds/           # Build and deployment
├── agents/           # Agent enrollment and management
├── capabilities/     # Token and capability management
├── websocket/        # WebSocket gateway and services
├── health/           # Health check endpoints
├── app.module.ts     # Main application module
└── main.ts          # Application entry point
```

### Adding New Features

1. Create feature module in `src/`
2. Add controller for REST endpoints
3. Add service for business logic
4. Update DTOs and types as needed
5. Add to `app.module.ts`
6. Write tests

## Deployment

The Control API is designed to run in containerized environments:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3002
CMD ["node", "dist/main.js"]
```

## Contributing

Please see the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MPL-2.0 License - see the [LICENSE](../../LICENSE) file for details.