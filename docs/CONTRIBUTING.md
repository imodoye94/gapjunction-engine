# Contributing to GapJunction

Thank you for your interest in contributing to GapJunction! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 8.15.0
- Git

### Setting Up the Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/your-username/gapjunction.git
   cd gapjunction
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Create a new branch for your feature or fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Project

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

# Type check
pnpm typecheck
```

### Project Structure

- `apps/` - Applications (control-api, compiler, agent, adapter)
- `packages/` - Shared packages and utilities
- `docs/` - Documentation
- Root configuration files for the monorepo

### Making Changes

1. Make your changes in the appropriate directory
2. Add or update tests as needed
3. Ensure all tests pass: `pnpm test`
4. Ensure code is properly formatted: `pnpm format`
5. Ensure code passes linting: `pnpm lint`
6. Ensure TypeScript compilation succeeds: `pnpm typecheck`

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] Tests pass locally
- [ ] Code is properly formatted and linted
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventional commit format

### Submitting a Pull Request

1. Push your changes to your fork
2. Create a pull request against the main branch
3. Fill out the pull request template completely
4. Ensure all CI checks pass
5. Respond to any feedback from maintainers

### Pull Request Guidelines

- Keep pull requests focused and atomic
- Write clear, descriptive commit messages
- Include tests for new functionality
- Update documentation as needed
- Reference any related issues

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use meaningful variable and function names
- Follow established patterns in the codebase

### Code Style

- Use Prettier for code formatting (configured in `.prettierrc`)
- Follow ESLint rules (configured in `.eslintrc.cjs`)
- Use 2 spaces for indentation
- Use double quotes for strings
- Include semicolons

### Testing

- Write unit tests for new functionality
- Use descriptive test names
- Follow the existing test patterns
- Aim for good test coverage

## Commit Message Format

We use conventional commits for consistent commit messages:

```ini
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```ini
feat(api): add user authentication endpoint
fix(compiler): resolve memory leak in workflow processing
docs: update installation instructions
```

## Developer Certificate of Origin (DCO)

By contributing to this project, you agree to the Developer Certificate of Origin (DCO). All commits must be signed off to indicate that you agree to the DCO.

Add the `-s` flag when committing:

```bash
git commit -s -m "your commit message"
```

## Contributor License Agreement (CLA)

Contributors may be required to sign a Contributor License Agreement (CLA) for significant contributions. This will be communicated during the pull request process if required.

## Getting Help

- Check existing issues and discussions
- Create a new issue for bugs or feature requests
- Join our community discussions
- Reach out to maintainers for guidance

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## Recognition

Contributors will be recognized in our documentation and release notes. We appreciate all contributions, whether they're code, documentation, bug reports, or feature suggestions.

Thank you for contributing to GapJunction!
