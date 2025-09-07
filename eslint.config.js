import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/public/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/vendor/**',
      '**/.git/**',
      '**/tmp/**',
      '**/temp/**',
      '**/*.json',
      '**/*.jsonc',
      'eslint.config.js'
    ]
  },

  // TypeScript configuration for all TS files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin
    },
    rules: {
      // TypeScript ESLint Core Rules - Healthcare/Enterprise Grade
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/prefer-enum-initializers': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-literal-enum-member': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/return-await': ['error', 'always'],
      '@typescript-eslint/unified-signatures': 'error',

      // Security and Vulnerability Prevention
      '@typescript-eslint/no-implied-eval': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',

      // Code Quality and Maintainability
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': false,
        'ts-nocheck': false,
        'ts-check': false
      }],
      '@typescript-eslint/class-literal-property-style': ['error', 'fields'],
      '@typescript-eslint/consistent-generic-constructors': ['error', 'constructor'],
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase']
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase']
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require'
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false
          }
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE']
        }
      ],
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-confusing-non-null-assertion': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-duplicate-type-constituents': 'error',
      '@typescript-eslint/no-dynamic-delete': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-invalid-void-type': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/prefer-return-this-type': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',

      // Import/Export Rules for Monorepo
      'import/order': ['error', {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type'
        ],
        pathGroups: [
          {
            pattern: '@gapjunction/**',
            group: 'internal',
            position: 'before'
          }
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }],
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-relative-parent-imports': 'warn',
      'import/no-duplicates': 'error',
      'import/first': 'error',
      'import/exports-last': 'error',
      'import/newline-after-import': 'error',
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'warn',

      // Node.js Specific Rules
      'no-process-exit': 'error',
      'no-process-env': 'warn',

      // Security Rules - No console.log in production
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'off', // Handled by @typescript-eslint/no-implied-eval
      'no-new-func': 'error',
      'no-script-url': 'error',

      // General Code Quality
      'complexity': ['error', { max: 10 }],
      'max-depth': ['error', { max: 4 }],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': 'off',
      'max-nested-callbacks': ['error', { max: 3 }],
      'max-params': ['error', { max: 4 }],
      'no-magic-numbers': ['error', { 
        ignore: [-1, 0, 1, 2],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        detectObjects: false
      }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      // Healthcare Data Handling Best Practices
      'no-param-reassign': 'error',
      'no-return-assign': 'error',
      'no-sequences': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'require-await': 'off', // Handled by @typescript-eslint/require-await
      'yoda': 'error'
    }
  },

  // Test files configuration
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx'
    ],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        vitest: 'readonly'
      }
    },
    rules: {
      // Relax some rules for test files
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'max-lines-per-function': 'off',
      'no-magic-numbers': 'off',
      'max-nested-callbacks': 'off', // Test files often have deeply nested describe/it blocks
      'max-lines': 'off', // Test files can be long
      '@typescript-eslint/no-non-null-assertion': 'warn', // Sometimes needed in tests
      '@typescript-eslint/require-await': 'off', // Test setup functions may not need await
      '@typescript-eslint/no-unused-vars': 'off', // Test imports may appear unused
      'no-console': 'off', // Allow console in tests for debugging
      '@typescript-eslint/naming-convention': 'off', // Allow flexible naming in test data
      'no-undef': 'off' // Vitest globals are handled by languageOptions.globals
    }
  },

  // Configuration files
  {
    files: [
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      '*.config.cjs',
      'vitest.config.ts'
    ],
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    }
  },

  // Fastify-specific rules for control-api and compiler apps
  {
    files: [
      'apps/control-api/**/*.ts',
      'apps/compiler/**/*.ts'
    ],
    rules: {
      // Fastify allows some patterns that we normally restrict
      '@typescript-eslint/no-explicit-any': 'warn', // Fastify types sometimes require any
      'import/no-default-export': 'off', // Fastify plugins often use default exports
      '@typescript-eslint/explicit-function-return-type': 'warn', // Fastify handlers can infer types

      // --- Project-specific overrides for linter noise and framework-required patterns ---
      // Allow numeric property names (e.g., OpenAPI/Swagger status codes)
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'memberLike', modifiers: ['private'], format: ['camelCase'], leadingUnderscore: 'require' },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        // Allow numeric and quoted property names (for OpenAPI/Swagger, HTTP, etc.)
        { selector: 'objectLiteralProperty', modifiers: ['requiresQuotes'], format: null },
        { selector: 'objectLiteralProperty', modifiers: ['requiresQuotes'], filter: { regex: '^[0-9]+$', match: true }, format: null },
        // Allow PascalCase for Fastify generics (Body, Params, etc.)
        { selector: 'typeProperty', format: ['camelCase', 'PascalCase'] },
        // Allow dotted property names for Nexon/Node-RED mapping
        { selector: 'objectLiteralProperty', filter: { regex: '\\.', match: true }, format: null },
        // Allow UPPER_CASE for environment variable names
        { selector: 'objectLiteralProperty', filter: { regex: '^[A-Z_]+$', match: true }, format: null },
        // Allow PascalCase for class names in mocks (e.g., Server)
        { selector: 'objectLiteralProperty', filter: { regex: '^[A-Z][a-zA-Z]*$', match: true }, format: null }
      ],

      // Allow process.env usage in backend code
      'no-process-env': 'off',

      // Disable complexity rule for this project (per user request)
      'complexity': 'off',

      // Relax rules for main.ts which can be long due to Fastify setup
      'max-lines': ['error', { max: 800, skipBlankLines: true, skipComments: true }],

      // Allow nested callbacks in async/await patterns common in Fastify
      'max-nested-callbacks': ['error', { max: 5 }],

      // Allow more magic numbers for HTTP status codes, ports, etc.
      'no-magic-numbers': ['error', {
        ignore: [-1, 0, 1, 2, 3, 12, 60, 100, 200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 500, 502, 503, 1000, 1024, 3000, 3001, 3002, 8080],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        detectObjects: false
      }]
    }
  },

  // Prettier integration - must be last to override conflicting rules
  prettierConfig
];