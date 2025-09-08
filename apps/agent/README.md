# GapJunction Runtime Agent

The GapJunction Runtime Agent is a long-running TypeScript daemon that executes integration workflows on customer machines. It maintains secure communication with the Control API and supervises Node-RED processes for each deployed channel.

## Features

- **Secure Communication**: Outbound-only WebSocket connection with JWT authentication
- **Process Supervision**: Blue/green deployment and monitoring of Node-RED instances
- **Local MQTT Broker**: Aedes-based broker for intra-host channel communication
- **Identity Management**: Device keypair generation and secure credential storage
- **Overlay Networking**: Optional Defined Networking (Nebula) integration
- **Sidecar Services**: Automated installation of Orthanc DICOM server and Syncthing file sync (Windows)
- **Health Monitoring**: Built-in diagnostics and status reporting
- **Security-First**: No PHI in control plane, encrypted secrets, local-only admin interfaces

## Architecture

```markdown
┌─────────────────┐    WSS/msgpack    ┌─────────────────┐
│   Control API   │◄──────────────────┤ Runtime Agent   │
└─────────────────┘                   └─────────────────┘
                                              │
                                              ├── Node-RED Supervisor
                                              ├── MQTT Broker (Aedes)
                                              ├── Identity Manager
                                              ├── Bundle Manager
                                              ├── Overlay Manager
                                              └── Health Probe
```

## Installation

### Prerequisites

- Node.js 20+
- pnpm package manager
- Platform-specific requirements:
  - **Windows**: PowerShell (for DN client)
  - **macOS/Linux**: sudo access (for DN client)

### Build from Source

```bash
# Install dependencies
pnpm install

# Build the agent
pnpm run build

# Start in development mode
pnpm run start:dev

# Start in production mode
pnpm run start:prod
```

## Configuration

The agent uses a YAML configuration file located at:

- **Windows**: `%PROGRAMDATA%\gapjunction\agent.yaml`
- **macOS**: `/usr/local/var/gapjunction/agent.yaml`
- **Linux**: `/var/lib/gapjunction/agent.yaml`

### Example Configuration

```yaml
runtimeId: "rtm_abc123"
bootstrapToken: "one-time-bootstrap-token"  # Removed after enrollment

control:
  baseUrl: "https://api.gapjunction.io"
  wsPath: "/agents/ws"

overlay:
  enabled: false
  lighthouses: []

mqtt:
  enabled: true
  host: "127.0.0.1"
  port: 1883

nodeRed:
  bin: "node-red"

security:
  nodeRedAdminPath: "/rtm_abc123__gj_admin__xyz789"
  apiAdminHost: "127.0.0.1"
  apiAdminPort: "1890"

# Optional: Sidecar services (set automatically during enrollment)
sidecars:
  installOrthanc: true      # Install Orthanc DICOM server
  installSyncthing: true    # Install Syncthing file synchronization
```

## Directory Structure

```markdown
%PROGRAMDATA%/gapjunction/         # Windows
/var/lib/gapjunction/              # Linux/macOS
├── agent.yaml                     # Configuration
├── state/
│   ├── identity.json              # Device identity and keypair
│   ├── overlay.json               # Overlay network state
├── channels/
│   └── <channelId>/
│       ├── builds/<buildId>/      # Deployed bundles
│       │   ├── flows.json
│       │   ├── settings.js
│       │   └── manifest.json
│       └── runtime/
│           ├── current -> ../builds/<id>
│           ├── logs/
│           └── pid
├── mqtt/
│   └── broker.log
└── bin/
    └── dn/                        # DN client binaries
```

## Usage

### Command Line Options

```bash
# Start with default configuration
node dist/main.js

# Start with custom config file
node dist/main.js --config=/path/to/agent.yaml

# Start in service mode (JSON logging)
node dist/main.js --service
```

### First Run (Enrollment)

1. Obtain a bootstrap token from the GapJunction Control API
2. Create `agent.yaml` with your `runtimeId` and `bootstrapToken`
3. Start the agent - it will automatically:
   - Generate device identity and keypair
   - Enroll with the Control API
   - Install sidecar services if requested (Windows only)
   - Store JWT tokens in OS keystore
   - Connect via WebSocket
   - Start local MQTT broker

### Channel Deployment

Channels are deployed via WebSocket commands from the Control API:

1. **Deploy**: Extract bundle, configure Node-RED, start process
2. **Start/Stop**: Control channel lifecycle
3. **Status**: Report channel health and metrics

### MQTT Topics

Local MQTT broker uses these topic conventions:

- `gj/<channelId>/in` - Messages into a channel
- `gj/<channelId>/out` - Messages from a channel

## Security

### Authentication

- Device identity uses X25519 keypairs
- JWT tokens stored in OS keystore (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- Automatic token refresh before expiry

### Network Security

- Outbound-only WebSocket connections (WSS)
- No inbound HTTP listeners
- MQTT broker bound to 127.0.0.1 only
- Node-RED admin interfaces on localhost with random paths

### Data Protection

- PHI never sent to Control API
- Secrets encrypted with device public key
- Node-RED editor disabled in production
- Credential secrets generated per deployment

## Sidecar Services (Windows Only)

The agent can automatically install and configure sidecar services during enrollment:

### Orthanc DICOM Server

When `installOrthanc: true` is received from the Control API:

1. Downloads and installs Orthanc DICOM server
2. Configures authentication with runtime ID and generated admin password
3. Sets up DICOM worklist functionality
4. Opens required firewall ports (4242/TCP, 8042/TCP)
5. Starts the Orthanc service

**Access:**
- HTTP interface: `http://localhost:8042`
- DICOM port: `localhost:4242`
- Username: `<runtimeId>`
- Password: Stored in Windows Credential Manager

### Syncthing File Synchronization

When `installSyncthing: true` is received from the Control API:

1. Downloads and installs Syncthing
2. Opens required firewall ports (22000/TCP, 22000/UDP, 21027/UDP)
3. Starts the Syncthing service

**Access:**
- Web interface: `http://localhost:8384` (default)

### Installation Scripts

Sidecar installation is handled by PowerShell scripts located in:
- `tools/installers/windows/install-orthanc.ps1`
- `tools/installers/windows/install-syncthing.ps1`

These scripts require Administrator privileges and handle:
- Downloading official installers
- Silent installation
- Configuration file setup
- Firewall rule creation
- Service management
- Error handling and logging

## Overlay Networking (Optional)

When enabled, the agent can enroll in Defined Networking for secure P2P communication:

1. Downloads platform-specific DN client
2. Enrolls with provided enrollment code
3. Reports Nebula IP and Host ID to Control API

## Monitoring

### Health Checks

- Disk space and memory usage
- Network connectivity to Control API
- Node-RED process health via `/diagnostics`

### Logging

- Structured JSON logs (production) or pretty-printed (development)
- Per-channel Node-RED logs in `channels/<id>/runtime/logs/`
- MQTT broker logs in `mqtt/broker.log`

### Status Reporting

Regular status updates include:

- Channel states and resource usage
- Overlay network information
- Agent version and uptime

## Development

### Project Structure

```markdown
src/
├── main.ts              # Application entry point
├── types.ts             # Shared type definitions
├── logger.ts            # Pino logger configuration
├── config.ts            # Configuration loading
├── identity.ts          # Device identity and JWT management
├── wsClient.ts          # WebSocket client with msgpack
├── commands.ts          # Command dispatcher
├── bundles.ts           # Bundle extraction and management
├── supervisor.ts        # Node-RED process supervision
├── mqtt.ts              # Aedes MQTT broker
├── overlay.ts           # Defined Networking integration
├── sidecars.ts          # Sidecar service installation
├── health.ts            # Health checks and diagnostics
└── updater.ts           # OTA update handling (stub)
```

### Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:cov

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Troubleshooting

### Common Issues

1. **Enrollment fails**: Check bootstrap token and network connectivity
2. **Node-RED won't start**: Verify Node-RED installation and port availability
3. **MQTT connection issues**: Ensure port 1883 is available on localhost
4. **Overlay enrollment fails**: Check DN client download and sudo permissions
5. **Sidecar installation fails**:
   - Ensure running as Administrator on Windows
   - Check internet connectivity for downloads
   - Verify PowerShell execution policy allows scripts
   - Check installation logs in `%TEMP%\orthanc-install.log` or `%TEMP%\syncthing-install.log`

### Logs

Check logs for detailed error information:

```bash
# Development mode (pretty logs)
pnpm run start:dev

# Production mode (JSON logs)
pnpm run start:prod 2>&1 | pino-pretty
```

### Debug Mode

Set environment variables for verbose logging:

```bash
export NODE_ENV=development
export LOG_LEVEL=debug
node dist/main.js
```

## License

Mozilla Public License 2.0 - see [LICENSE](../../LICENSE) file for details.
