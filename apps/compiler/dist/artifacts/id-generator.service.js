import { __esDecorate, __runInitializers } from "tslib";
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
let IdGeneratorService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var IdGeneratorService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            IdGeneratorService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        /**
         * Generate a deterministic ID based on input components
         * Uses SHA-256 hash to ensure deterministic but unique IDs
         */
        generateDeterministicId(...components) {
            const input = components.join('|');
            const hash = createHash('sha256').update(input).digest('hex');
            // Create a Node-RED compatible ID (alphanumeric, starts with letter)
            // Take first 16 characters of hash and ensure it starts with a letter
            const hashPrefix = hash.substring(0, 15);
            return `n${hashPrefix}`;
        }
        /**
         * Generate a flow tab ID
         */
        generateFlowId(channelId) {
            return this.generateDeterministicId('flow', channelId);
        }
        /**
         * Generate a node ID
         */
        generateNodeId(stageId, templateNodeId) {
            return this.generateDeterministicId('node', stageId, templateNodeId);
        }
        /**
         * Generate a fallback node ID
         */
        generateFallbackNodeId(stageId) {
            return this.generateDeterministicId('fallback', stageId);
        }
        /**
         * Generate a build-specific ID that includes build context
         */
        generateBuildSpecificId(buildId, ...components) {
            return this.generateDeterministicId(buildId, ...components);
        }
        /**
         * Validate that an ID is Node-RED compatible
         */
        isValidNodeRedId(id) {
            // Node-RED IDs should be alphanumeric and can contain hyphens/underscores
            return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
        }
        /**
         * Sanitize a string to be used in ID generation
         */
        sanitizeForId(input) {
            return input.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        }
    };
    return IdGeneratorService = _classThis;
})();
export { IdGeneratorService };
//# sourceMappingURL=id-generator.service.js.map