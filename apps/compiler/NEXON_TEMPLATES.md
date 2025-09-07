# Nexon Template System

The Nexon Template System is a core component of the Gap Junction Compiler Service that handles the fetching, validation, and parameter substitution of Nexon templates. This system enables the compiler to transform high-level channel definitions into executable Node-RED flows.

## Overview

The Nexon Template System consists of several key components:

1. **NexonTemplateService** - Handles template fetching from local and remote sources
2. **ParameterSubstitutionService** - Manages parameter substitution with support for JSON literals, expressions, and secret references
3. **Template Validation** - Ensures template integrity and compatibility
4. **Mock Templates** - Example templates for testing and development

## Architecture

### Template Structure

Each Nexon template consists of:

- **manifest.json** - Template metadata, capabilities, and parameter definitions
- **template.json** - Parameterized Node-RED flow template

### Template Sources

The system supports multiple template sources:

- **Local Filesystem** - Templates stored in `packages/nexon-catalog/`
- **Remote API** - Templates fetched from remote repositories (configurable via `NEXON_REMOTE_URL`)

### Parameter Substitution

The system supports three types of parameter values:

1. **JSON Literals** - Direct values (strings, numbers, booleans, objects, arrays)
2. **Expression Tokens** - Dynamic expressions evaluated at compile time
3. **Secret References** - References to secrets (passed through without expansion)

## Usage

### Fetching Templates

```typescript
const template = await nexonTemplateService.fetchTemplate('http.request', '1.0.0');
```

### Parameter Substitution Snippet

```typescript
const context: SubstitutionContext = {
  parameters: {
    url: 'https://api.example.com',
    method: 'GET',
    apiKey: {
      secret: {
        type: 'secretRef',
        ref: 'gcp://projects/test/secrets/api-key/versions/latest'
      }
    }
  },
  stage: { id: 'http-1', title: 'API Request' },
  channel: { channelId: 'test-channel', title: 'Test Channel' }
};

const result = await parameterSubstitutionService.substituteParameters(
  template.template,
  context,
  template.manifest.parameters
);
```

## Template Manifest Schema

```json
{
  "id": "template-id",
  "version": "1.0.0",
  "title": "Human Readable Name",
  "description": "Template description",
  "capabilities": {
    "network": {
      "httpOut": true,
      "tcpOut": false
    },
    "filesystem": {
      "read": false,
      "write": false
    }
  },
  "parameters": {
    "paramName": {
      "type": "string|number|boolean|object|array|secretRef|expression",
      "title": "Parameter Title",
      "description": "Parameter description",
      "required": true,
      "default": "default-value",
      "validation": {
        "min": 1,
        "max": 100,
        "pattern": "^https?://.+"
      }
    }
  }
}
```

## Template Examples

### HTTP Request Template

Located at `packages/nexon-catalog/http.request/`:

- Supports HTTP methods (GET, POST, PUT, DELETE, etc.)
- Configurable URL, headers, and payload
- Timeout configuration
- API key authentication via secret references

### TCP Listener Template

Located at `packages/nexon-catalog/tcp.listener/`:

- Configurable host and port
- Multiple data modes (stream, single, base64)
- Connection monitoring
- Continuation support for multi-node flows

## Configuration

### Environment Variables

- `NEXON_LOCAL_PATH` - Base path for local templates (default: `packages/nexon-catalog`)
- `NEXON_REMOTE_URL` - Base URL for remote template API

### Template Caching

Templates are cached in memory with configurable TTL:

- Default cache TTL: 1 hour
- Force refresh with `forceRefresh: true` option
- Cache invalidation by template key

## Integration with Compiler Pipeline

The Nexon Template System is integrated into the main compilation pipeline:

1. **Validation** - Channel IR is validated
2. **Policy Linting** - Security policies are checked
3. **Template Fetching** - Nexon templates are fetched for each stage
4. **Parameter Substitution** - Stage parameters are substituted into templates
5. **Node Generation** - Template nodes are converted to Node-RED nodes
6. **Artifact Generation** - Final flows.json and settings are generated

## Error Handling

The system includes comprehensive error handling:

- Template not found errors
- Parameter validation errors
- Substitution failures
- Network timeouts for remote fetching
- Fallback to basic node generation on template errors

## Testing

Integration tests are provided in `test/nexon.integration.test.ts`:

- Template fetching from local filesystem
- Parameter substitution with various value types
- Template validation
- End-to-end processing

## Security Considerations

- Secret references are never expanded during compilation
- Templates are validated before use
- Capability declarations enable security policy enforcement
- Remote template fetching supports authentication

## Future Enhancements

Potential improvements for the Nexon Template System:

1. **Template Versioning** - Semantic version resolution and compatibility checking
2. **Template Registry** - Centralized template repository with search and discovery
3. **Template Composition** - Support for template inheritance and composition
4. **Advanced Expressions** - More sophisticated expression evaluation engine
5. **Template Hot Reloading** - Dynamic template updates without service restart
6. **Template Analytics** - Usage tracking and performance metrics

## API Reference

### NexonTemplateService

- `fetchTemplate(nexonId, version?, options?)` - Fetch a template
- `validateTemplate(template)` - Validate template structure
- `listTemplates()` - List available templates
- `clearCache(templateKey?)` - Clear template cache

### ParameterSubstitutionService

- `substituteParameters(template, context, paramDefinitions?)` - Substitute all parameters
- `substituteParameter(name, value, context, definition?)` - Substitute single parameter

### Types

- `NexonTemplate` - Complete template with manifest and flow
- `NexonManifest` - Template metadata and parameter definitions
- `SubstitutionContext` - Context for parameter substitution
- `SubstitutionResult` - Result of parameter substitution operation

## Contributing

When adding new templates:

1. Create a directory under `packages/nexon-catalog/`
2. Add `manifest.json` with complete parameter definitions
3. Add `template.json` with parameterized Node-RED flow
4. Update integration tests
5. Document any new capabilities or parameter types

## Troubleshooting

Common issues and solutions:

- **Template not found**: Check template ID and version, verify file paths
- **Parameter substitution failed**: Validate parameter types and required fields
- **Template validation failed**: Check manifest and template structure
- **Remote fetch timeout**: Increase timeout or check network connectivity
