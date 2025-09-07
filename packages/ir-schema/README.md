# @gapjunction/ir-schema

JSON schemas and validation for GapJunction IR (Intermediate Representation).

## Overview

This package provides JSON schemas and TypeScript types for validating GapJunction IR structures including channels, stages, edges, parameters, credentials, continuations, runtime configurations, and bundle manifests.

## Installation

```bash
npm install @gapjunction/ir-schema
```

## Usage

```typescript
import { validateChannel, ChannelSchema } from '@gapjunction/ir-schema';

// Validate a channel configuration
const isValid = validateChannel(channelData);
```

## Schemas

- `channel.schema.json` - Channel configuration schema
- `stage.schema.json` - Stage definition schema
- `edge.schema.json` - Edge connection schema
- `params.schema.json` - Parameter schema
- `credentials.schema.json` - Credentials schema
- `continuation.schema.json` - Continuation schema
- `runtime.schema.json` - Runtime configuration schema
- `bundle-manifest.schema.json` - Bundle manifest schema

## Development

```bash
# Build the package
npm run build

# Run tests
npm run test

# Validate schemas
npm run validate
```

## License

MPL-2.0
