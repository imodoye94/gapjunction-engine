# Gap Junction Compiler Service - Test Documentation

This document provides comprehensive information about the test suite for the Gap Junction Compiler Service, including test structure, coverage requirements, and execution guidelines.

## Test Suite Overview

The test suite is designed to provide comprehensive coverage of all compiler service functionality with a focus on reliability, security, and performance. The tests are organized into several categories:

### Test Categories

1. **Unit Tests** - Test individual services and components in isolation
2. **Integration Tests** - Test complete workflows and service interactions
3. **End-to-End Tests** - Test the full API surface and real-world scenarios
4. **Performance Tests** - Validate performance characteristics and scalability
5. **Security Tests** - Ensure security requirements are met and vulnerabilities are prevented

## Test Structure

```markdown
apps/compiler/
├── src/                           # Source code
│   ├── **/*.spec.ts              # Unit tests (co-located with source)
├── test/                          # Test directory
│   ├── fixtures/                  # Test data and fixtures
│   │   └── channels.ts           # Sample channel definitions
│   ├── utils/                     # Test utilities and helpers
│   │   └── test-helpers.ts       # Common test utilities
│   ├── app.e2e-spec.ts          # Basic E2E tests
│   ├── api.e2e-spec.ts          # Comprehensive API tests
│   ├── compiler.integration.test.ts  # Integration tests
│   ├── performance.test.ts       # Performance and load tests
│   ├── security.test.ts          # Security-focused tests
│   ├── setup.ts                  # Global test setup
│   └── vitest-e2e.config.ts     # E2E test configuration
├── vitest.config.ts              # Main test configuration
└── TEST_DOCUMENTATION.md         # This file
```

## Test Coverage Requirements

The test suite aims for comprehensive coverage with the following targets:

- **Overall Code Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: >95%
- **Line Coverage**: >90%

### Coverage by Component

| Component | Unit Tests | Integration Tests | E2E Tests | Security Tests |
|-----------|------------|-------------------|-----------|----------------|
| ValidationService | ✅ | ✅ | ✅ | ✅ |
| PolicyService | ✅ | ✅ | ✅ | ✅ |
| ArtifactsService | ✅ | ✅ | ✅ | ✅ |
| BundlingService | ✅ | ✅ | ✅ | ✅ |
| HashingService | ✅ | ✅ | ✅ | ✅ |
| NexonTemplateService | ✅ | ✅ | ✅ | ✅ |
| ParameterSubstitutionService | ✅ | ✅ | ✅ | ✅ |
| CompilerService | ✅ | ✅ | ✅ | ✅ |
| CompilerController | ✅ | ✅ | ✅ | ✅ |
| HealthController | ✅ | ✅ | ✅ | ✅ |

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Build required packages
pnpm run build --filter=@gj/ir-schema
```

### Test Commands

```bash
# Run all unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:cov

# Run integration and E2E tests
pnpm run test:e2e

# Run specific test files
pnpm vitest run src/validation/validation.service.spec.ts
pnpm vitest run test/performance.test.ts
pnpm vitest run test/security.test.ts

# Run tests with debugging
pnpm run test:debug

# Run performance tests only
pnpm vitest run test/performance.test.ts --reporter=verbose

# Run security tests only
pnpm vitest run test/security.test.ts --reporter=verbose
```

### Environment Variables

Tests can be configured using environment variables:

```bash
# Test environment
NODE_ENV=test

# Nexon template paths
NEXON_LOCAL_PATH=./packages/nexon-catalog
NEXON_REMOTE_URL=https://api.nexon.example.com

# Test timeouts
VITEST_TIMEOUT=30000

# Memory limits for performance tests
NODE_OPTIONS="--max-old-space-size=4096"
```

## Test Data and Fixtures

### Channel Fixtures

The test suite includes comprehensive channel fixtures in [`test/fixtures/channels.ts`](test/fixtures/channels.ts):

- **validMinimalChannel** - Simple channel with one function stage
- **validComplexChannel** - Complex channel with HTTP, transform, filter, and TCP stages
- **channelWithSecrets** - Channel with secret references from multiple providers
- **channelWithPolicyViolations** - Channel designed to trigger policy violations
- **largeChannel** - Channel with 100 stages for performance testing
- **channelWithCircularDependency** - Channel with circular dependencies
- **channelWithOrphanedStages** - Channel with disconnected stages
- **channelWithExpressions** - Channel with expression-based parameters
- **invalidChannels** - Collection of invalid channels for validation testing

### Test Utilities

The [`test/utils/test-helpers.ts`](test/utils/test-helpers.ts) file provides:

- **Mock Services** - Pre-configured mock services for testing
- **Test Data Generators** - Functions to generate test data
- **Assertion Helpers** - Custom assertions for common test scenarios
- **Performance Utilities** - Tools for measuring execution time and memory usage
- **Security Validators** - Functions to verify security requirements

## Unit Tests

Unit tests are co-located with source files using the `.spec.ts` suffix. Each service has comprehensive unit tests covering:

### ValidationService Tests

- Schema validation for channels, stages, edges, and parameters
- Comprehensive validation with semantic checks
- Circular dependency detection
- Orphaned stage detection
- Error handling and edge cases

### PolicyService Tests

- Security policy enforcement
- Nexon capability validation
- Runtime target restrictions
- Best practice checks
- Compliance requirements
- Organization-specific policies

### ArtifactsService Tests

- Flows.json generation
- Settings generation for different environments
- Manifest creation
- Credentials map generation
- Secret reference extraction
- Deterministic ID generation

### BundlingService Tests

- Bundle creation with compression
- Bundle extraction and verification
- Streaming bundle operations
- Hash verification
- Metadata handling
- Error recovery

### HashingService Tests

- SHA-256 hash computation
- File hashing
- Merkle tree creation and verification
- Bundle integrity verification
- Deterministic hashing

### NexonTemplateService Tests

- Local template fetching
- Remote template fetching with authentication
- Template validation
- Caching mechanisms
- Template listing
- Error handling

### ParameterSubstitutionService Tests

- Parameter substitution in templates
- Secret reference handling
- Expression evaluation
- Type validation
- Nested parameter handling
- Error scenarios

### CompilerService Tests

- End-to-end compilation pipeline
- Validation integration
- Policy enforcement
- Artifact generation
- Bundle creation
- Security acknowledgments
- Error handling

## Integration Tests

Integration tests verify complete workflows and service interactions:

### End-to-End Compilation Pipeline

- Complete compilation from IR to bundle
- Template fetching and processing
- Policy linting integration
- Error handling and recovery
- Performance under load
- Resource cleanup

### Bundle Integrity and Verification

- Bundle creation with valid hashes
- Bundle extraction and verification
- Tampering detection
- Merkle proof validation

### Security and Compliance

- Secret handling throughout pipeline
- Policy enforcement consistency
- Security acknowledgment workflow
- Audit trail generation

## End-to-End Tests

E2E tests validate the complete API surface:

### Health Endpoints

- `/health` - Service health status
- `/health/ready` - Readiness checks
- `/health/live` - Liveness checks

### Compilation Endpoints

- `/compiler/compile` - Channel compilation
- `/compiler/verifySecurityAck` - Security acknowledgments

### Test Scenarios

- Valid channel compilation
- Channels with secrets
- Policy violation handling
- Large channel processing
- Concurrent requests
- Error conditions
- Input validation
- Response format validation

## Performance Tests

Performance tests ensure the service meets scalability requirements:

### Compilation Performance

- Simple channel compilation < 2 seconds
- Large channel compilation < 10 seconds
- Concurrent compilation handling
- Performance consistency across runs

### Memory Usage

- Memory leak detection
- Large channel memory usage
- Resource cleanup verification

### Scalability

- Increasing channel size handling
- Burst request processing
- Performance scaling characteristics

### Component Performance

- Artifact generation speed
- Bundle creation performance
- Hash computation efficiency
- Merkle tree creation speed

## Security Tests

Security tests ensure the service meets security requirements:

### Secret Handling

- Secrets never exposed in artifacts
- Proper credentials map generation
- Secure environment variable naming
- Nested secret reference handling

### Policy Enforcement

- Consistent policy application
- Critical violation prevention
- Security acknowledgment validation
- Access control enforcement

### Data Integrity

- Cryptographic hash verification
- Bundle tampering detection
- Merkle proof validation
- Input validation and sanitization

### Secure Defaults

- Production environment security
- Test environment configuration
- Audit and logging requirements

## CI/CD Integration

The test suite is integrated with GitHub Actions for continuous testing:

### Workflow Jobs

1. **Unit Tests** - Fast feedback on code changes
2. **Integration Tests** - Verify service interactions
3. **E2E Tests** - Validate API functionality
4. **Performance Tests** - Ensure performance requirements
5. **Security Tests** - Validate security requirements
6. **Code Quality** - Linting and type checking
7. **Coverage Report** - Combined coverage analysis

### Quality Gates

- All tests must pass for PR approval
- Coverage thresholds must be met
- Security tests must pass
- Performance benchmarks must be met

## Test Maintenance

### Adding New Tests

When adding new functionality:

1. **Write unit tests** for new services/methods
2. **Update integration tests** if workflow changes
3. **Add E2E tests** for new API endpoints
4. **Include security tests** for security-sensitive features
5. **Add performance tests** for performance-critical features

### Test Data Management

- Keep test fixtures up to date with schema changes
- Add new fixtures for edge cases
- Maintain mock data consistency
- Update test utilities as needed

### Performance Monitoring

- Monitor test execution times
- Update performance thresholds as needed
- Investigate performance regressions
- Optimize slow tests

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Increase timeout values for slow operations
   - Check for infinite loops or blocking operations
   - Verify mock services are responding

2. **Memory Issues**
   - Increase Node.js memory limit
   - Check for memory leaks in tests
   - Verify proper cleanup in afterEach hooks

3. **Flaky Tests**
   - Add retry mechanisms for network-dependent tests
   - Use proper async/await patterns
   - Ensure test isolation

4. **Coverage Issues**
   - Identify uncovered code paths
   - Add tests for error conditions
   - Test edge cases and boundary conditions

### Debug Mode

Run tests in debug mode for troubleshooting:

```bash
pnpm run test:debug
```

This enables:

- Detailed error messages
- Stack traces
- Console output
- Breakpoint support

## Best Practices

### Test Writing Guidelines

1. **Test Structure**
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Keep tests focused and isolated
   - Use proper setup and teardown

2. **Assertions**
   - Use specific assertions
   - Test both positive and negative cases
   - Verify error conditions
   - Check edge cases

3. **Mocking**
   - Mock external dependencies
   - Use realistic mock data
   - Verify mock interactions
   - Reset mocks between tests

4. **Performance**
   - Keep tests fast
   - Use parallel execution where possible
   - Avoid unnecessary setup
   - Clean up resources

### Security Testing Guidelines

1. **Secret Handling**
   - Verify secrets are never exposed
   - Test all secret reference types
   - Validate environment variable generation
   - Check nested secret handling

2. **Input Validation**
   - Test malicious input handling
   - Verify sanitization
   - Check injection prevention
   - Test boundary conditions

3. **Access Control**
   - Test authorization checks
   - Verify policy enforcement
   - Check privilege escalation prevention
   - Test audit trail generation

## Conclusion

This comprehensive test suite provides confidence in the Gap Junction Compiler Service's reliability, security, and performance. The tests are designed to catch regressions early, ensure security requirements are met, and validate that the service can handle production workloads.

Regular maintenance and updates to the test suite ensure it continues to provide value as the service evolves. The CI/CD integration provides automated quality gates that prevent issues from reaching production.

For questions or issues with the test suite, please refer to the troubleshooting section or contact the development team.
