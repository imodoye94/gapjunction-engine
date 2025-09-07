# Gap Junction Compiler Service

The Gap Junction Compiler Service is responsible for validating and compiling integration workflows defined in the Gap Junction Intermediate Representation (IR) format.

## Features

- **IR Validation**: Comprehensive validation using `@gapjunction/ir-schema`
- **Policy Linting**: Security and compliance policy enforcement
- **Code Generation**: Transforms IR into executable Node-RED flows
- **Security Acknowledgments**: Handles policy violation acknowledgments
- **Health Monitoring**: Built-in health check endpoints

## API Endpoints

### Compilation

- `POST /compiler/compile` - Compile a channel IR
- `GET /compiler/status/:buildId` - Get compilation status
- `GET /compiler/health` - Service health check

### Security Override

- `POST /compiler/verifySecurityAck` - Acknowledge policy violations

### Health Monitoring

- `GET /health` - General health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

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

### Configuration

Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

Key configuration options:

- `PORT` - Service port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level
- `CORS_ORIGIN` - CORS origin for development

## Architecture

The service is built using NestJS and follows a modular architecture:

```markdown
src/
├── app.module.ts           # Main application module
├── main.ts                 # Application entry point
├── compiler/               # Core compilation logic
│   ├── compiler.controller.ts
│   ├── compiler.service.ts
│   └── compiler.module.ts
├── validation/             # IR validation services
│   ├── validation.service.ts
│   └── validation.module.ts
├── policy/                 # Policy linting services
│   ├── policy.service.ts
│   └── policy.module.ts
└── health/                 # Health monitoring
    ├── health.controller.ts
    └── health.module.ts
```

## Validation Process

1. **Schema Validation**: Validates IR against JSON schemas
2. **Semantic Validation**: Checks for logical consistency
3. **Policy Linting**: Enforces organizational security policies
4. **Compilation**: Generates executable artifacts

## Policy Rules

The service enforces various policy rules:

### Security Policies

- `SEC001` - Internet HTTP Access
- `SEC002` - Internet TCP Access  
- `SEC003` - Internet UDP Access
- `SEC004` - Public HTTP Endpoints

### Nexon Policies

- `NEX001` - Blocked Nexon Usage
- `NEX002` - Unauthorized Nexon Usage
- `NEX003` - Missing Nexon Version

### Best Practices

- `BP001` - Channel Complexity
- `BP002` - Missing Documentation
- `BP003` - Undocumented Stages

### Compliance

- `COMP001` - Potential PHI Handling

## Development

### Running Tests

```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:cov

# E2E tests
pnpm run test:e2e
```

### Linting

```bash
# Lint code
pnpm run lint

# Type checking
pnpm run typecheck
```

## API Documentation

When running in development mode, Swagger documentation is available at:
`http://localhost:3001/api`

## Monitoring

The service provides several monitoring endpoints:

- `/health` - Overall service health
- `/health/ready` - Kubernetes readiness probe
- `/health/live` - Kubernetes liveness probe

## Security

The service implements several security measures:

- Input validation using class-validator
- CORS protection
- Comprehensive logging and audit trails
- Policy-based access control

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Ensure all linting passes

## License

Mozilla Public License 2.0
