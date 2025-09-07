# Gap Junction Artifact Generation System

## Overview

The Gap Junction Compiler Service now includes a comprehensive artifact generation system that transforms validated Channel IR into production-ready Node-RED artifacts. This system generates all the necessary files that the Node-RED runtime needs to execute integration workflows.

## Architecture

The artifact generation system consists of several key components:

### Core Services

1. **ArtifactsService** (`src/artifacts/artifacts.service.ts`)
   - Main orchestrator for artifact generation
   - Coordinates with Nexon template system
   - Handles error recovery and fallback generation

2. **IdGeneratorService** (`src/artifacts/id-generator.service.ts`)
   - Generates deterministic, Node-RED compatible IDs
   - Uses SHA-256 hashing for consistency
   - Ensures reproducible builds

3. **ArtifactsModule** (`src/artifacts/artifacts.module.ts`)
   - NestJS module that integrates artifact generation into the compiler pipeline

## Generated Artifacts

The system generates four critical artifacts:

### 1. flows.json - Node-RED Flow Definition

**Purpose**: Complete Node-RED flow ready for execution

**Features**:

- Converts Channel IR stages to Node-RED nodes using Nexon templates
- Handles parameter substitution with context-aware replacement
- Implements proper node wiring based on Channel IR edges
- Supports both single-node and multi-node (poly-nodal) templates
- Generates fallback nodes when template processing fails
- Creates deterministic node IDs for reproducible builds

**Structure**:

```json
[
  {
    "id": "n1a2b3c4d5e6f7g8",
    "label": "Integration Channel",
    "type": "tab",
    "disabled": false,
    "info": "Channel documentation"
  },
  {
    "id": "n9h8g7f6e5d4c3b2",
    "type": "http request",
    "z": "n1a2b3c4d5e6f7g8",
    "name": "API Call",
    "method": "GET",
    "url": "https://api.example.com/data",
    "x": 200,
    "y": 100,
    "wires": [[]]
  }
]
```

### 2. settings.js - Secure Node-RED Configuration

**Purpose**: Production-ready Node-RED runtime settings

**Security Features**:

- Disables UI components for headless operation (`httpAdminRoot: false`)
- Prevents external module loading (`functionExternalModules: false`)
- Disables context storage for security (`contextStorage: false`)
- Configures secure CORS policies
- Implements environment-specific logging

**Production vs Development**:

- **Production**: HTTPS required, minimal logging, audit trails enabled
- **Development**: Relaxed CORS, verbose logging, faster iteration

**Global Context**:

- Channel metadata (ID, title, build info)
- Security permissions from Channel IR
- Runtime target information (cloud vs onprem)

### 3. manifest.json - Bundle Metadata

**Purpose**: Describes the compiled bundle for the Agent

**Schema Compliance**: Follows `@gj/ir-schema` BundleManifest specification

**Contents**:

```json
{
  "version": 1,
  "channelId": "integration-channel-001",
  "buildId": "build-abc123def456",
  "mode": "PROD",
  "artifacts": {
    "flowsJsonPath": "./flows.json",
    "settingsPath": "./settings.js",
    "credentialsMapPath": "./credentials.map.json"
  }
}
```

### 4. credentials.map.json - Secret Reference Mapping

**Purpose**: Maps secret references to runtime environment variables

**Security Model**:

- Never contains actual secret values
- Only maps `secretRef` tokens to environment variable names
- Supports multiple secret management systems (GCP, AWS, Azure)
- Enables secure credential injection at runtime

**Structure**:

```json
{
  "version": 1,
  "channelId": "integration-channel-001",
  "buildId": "build-abc123def456",
  "credentials": {
    "api-stage.apiKey": {
      "type": "secretRef",
      "ref": "gcp://projects/prod/secrets/api-key/versions/latest",
      "envVar": "GJ_SECRET_API_STAGE_APIKEY"
    }
  }
}
```

## Key Features

### Deterministic ID Generation

The system generates consistent, deterministic IDs using SHA-256 hashing:

```typescript
// Same inputs always produce same IDs
const flowId1 = idGenerator.generateFlowId('channel-123');
const flowId2 = idGenerator.generateFlowId('channel-123');
// flowId1 === flowId2 ✓
```

**Benefits**:

- Reproducible builds across environments
- Consistent node references for debugging
- Stable artifact hashing for change detection

### Nexon Template Integration

Full integration with the existing Nexon template system:

1. **Template Fetching**: Retrieves templates from local filesystem or remote sources
2. **Parameter Substitution**: Context-aware replacement of template placeholders
3. **Validation**: Ensures template compatibility and correctness
4. **Error Handling**: Graceful fallback to basic nodes when templates fail

### Edge Wiring System

Sophisticated node wiring based on Channel IR edges:

- **Multi-node Templates**: Handles complex templates with multiple internal nodes
- **Stage Connections**: Wires output of one stage to input of next stage
- **Continuation Support**: Supports poly-nodal templates with named outlets
- **Error Recovery**: Maintains connectivity even when individual stages fail

### Security-First Design

All generated artifacts follow security best practices:

- **Headless Operation**: No UI components in production
- **Secret Isolation**: Credentials never appear in plaintext
- **Minimal Permissions**: Only required capabilities enabled
- **Audit Logging**: Comprehensive logging in production mode

## Integration Points

### Compiler Pipeline Integration

The artifact generation system integrates seamlessly with the existing compiler pipeline:

```typescript
// In CompilerService.compile()
const artifacts = await this.artifactsService.generateArtifacts(channel, {
  buildId,
  mode: 'PROD',
  target: channel.runtime.target,
});
```

### Error Handling

Comprehensive error handling at multiple levels:

1. **Template Level**: Fallback nodes when templates fail
2. **Stage Level**: Individual stage failures don't break entire flow
3. **Service Level**: Detailed error logging and recovery
4. **Pipeline Level**: Integration with existing compiler error handling

## Usage Examples

### Basic Usage

```typescript
import { ArtifactsService } from './artifacts/artifacts.service';

const artifacts = await artifactsService.generateArtifacts(channel, {
  buildId: 'build-001',
  mode: 'TEST',
  target: 'onprem',
});

// Access generated artifacts
const flows = artifacts.flowsJson;      // Node-RED flows
const settings = artifacts.settings;    // Runtime settings
const manifest = artifacts.manifest;    // Bundle metadata
const credentials = artifacts.credentialsMap; // Secret mappings
```

### Advanced Configuration

```typescript
// Production deployment
const prodArtifacts = await artifactsService.generateArtifacts(channel, {
  buildId: ulid(),
  mode: 'PROD',
  target: 'cloud',
});

// Development testing
const devArtifacts = await artifactsService.generateArtifacts(channel, {
  buildId: 'dev-build',
  mode: 'TEST',
  target: 'onprem',
});
```

## Testing

The system includes comprehensive test coverage:

### Unit Tests (`src/artifacts/artifacts.service.spec.ts`)

- Individual artifact generation functions
- Error handling scenarios
- Deterministic ID generation
- Security configuration validation

### Integration Tests (`test/artifacts.integration.test.ts`)

- End-to-end artifact generation pipeline
- Nexon template integration
- Real-world channel scenarios
- Cross-artifact consistency validation

## Performance Considerations

### Optimization Features

1. **Template Caching**: Nexon templates are cached to avoid repeated fetching
2. **Parallel Processing**: Independent artifacts generated concurrently
3. **Memory Efficiency**: Streaming processing for large channels
4. **Deterministic Builds**: Consistent output reduces unnecessary rebuilds

### Scalability

- **Stateless Design**: No shared state between artifact generations
- **Resource Isolation**: Each generation is independent
- **Error Isolation**: Individual stage failures don't cascade
- **Horizontal Scaling**: Multiple compiler instances can run in parallel

## Future Enhancements

### Planned Features

1. **Template Versioning**: Support for template version constraints
2. **Artifact Validation**: Post-generation validation of Node-RED compatibility
3. **Bundle Optimization**: Minification and optimization of generated artifacts
4. **Incremental Builds**: Only regenerate changed artifacts
5. **Custom Generators**: Plugin system for custom artifact types

### Extension Points

The system is designed for extensibility:

- **Custom ID Generators**: Pluggable ID generation strategies
- **Additional Artifacts**: Easy addition of new artifact types
- **Template Processors**: Custom template processing logic
- **Validation Rules**: Custom validation for specific deployment targets

## Conclusion

The Gap Junction Artifact Generation System provides a robust, secure, and scalable solution for transforming Channel IR into production-ready Node-RED artifacts. With comprehensive error handling, deterministic builds, and security-first design, it enables reliable deployment of integration workflows across different environments.

The system successfully bridges the gap between high-level integration definitions and low-level Node-RED execution, while maintaining the flexibility and power of the Nexon template system.
