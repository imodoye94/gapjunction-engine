# GapJunction

An open-source AI-native data integration engine for healthcare and life science businesses, built with TypeScript and designed for modern healthcare interoperability.

## Overview

GapJunction is a comprehensive data integration platform and workflow automation engine (think, Corepoint + Zapier) that enables seamless data exchange between healthcare systems and automates manual back-office tasks for healthcare and life science businesses - Hospitals, Clinics, Laboratories, Digital Health Statups, Biotechnology companies, Contract Research Organizations etc. Basically anyone who handles sensitive patient-related data (other business can use it for sure, but it is designed with handling sensitive patient data in mind). It provides AI-powered data mapping and transformations, real-time data processing, hardware + software integrations, and secure data handling to bridge the gaps in healthcare data interoperability.

## Architecture

The project consists of four main components:

- **Control API**: Central management and orchestration service
- **Compiler**: Transforms integration definitions into executable workflows
- **Agent**: Runtime execution environment for integration workflows
- **Packages**: Shared libraries and utilities

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm >= 8.15.0

### Installation

```bash
# Clone the repository
git clone https://github.com/imodoye94/gapjunction-engine.git
cd gapjunction-engine

# Install dependencies
pnpm install
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Build all packages and applications
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

## Project Structure

```markdown
gapjunction-engine/
├── apps/
│   ├── control-api/     # Central management API
│   ├── compiler/        # Integration workflow compiler
│   ├── agent/          # Runtime execution agent
├── packages/
│   ├── ir-schema/      # Intermediate representation schema
│   ├── ws-protocol/    # WebSocket protocol definitions
│   ├── redactor-core/  # Data redaction utilities
│   └── gj-spool-in/    # Data ingestion utilities
└── docs/               # Documentation
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 22+
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Testing**: Vitest
- **Linting**: ESLint + TypeScript ESLint
- **Formatting**: Prettier

## Related Projects

**Note**: The Gapjunction channel Editor has a backend (Supabase backend) and VueJS frontend components that are maintained in a separate repository and are not part of this core integration engine.

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details on how to get started.

## Security

For security concerns, please see our [Security Policy](./docs/SECURITY.md).

## License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/imodoye94/gapjunction-engine/issues)
- 💬 [Discussions](https://github.com/imodoye94/gapjunction-engine/discussions)
