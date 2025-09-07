/**
 * Types for Nexon template system
 * Defines the structure of Nexon templates, manifests, and parameter substitution
 */
import { JSONValue, ParamValue } from '@gj/ir-schema';
/**
 * Nexon template manifest - describes a template's capabilities and parameters
 */
export interface NexonManifest {
    /** Template metadata */
    id: string;
    version: string;
    title: string;
    description?: string;
    author?: string;
    license?: string;
    /** Template capabilities and requirements */
    capabilities: {
        /** Network capabilities required */
        network?: {
            httpOut?: boolean;
            tcpOut?: boolean;
            udpOut?: boolean;
            httpInPublic?: boolean;
        };
        /** File system capabilities */
        filesystem?: {
            read?: boolean;
            write?: boolean;
            paths?: string[];
        };
        /** System capabilities */
        system?: {
            exec?: boolean;
            env?: string[];
        };
    };
    /** Parameter definitions */
    parameters: Record<string, NexonParameter>;
    /** Template continuation rules for multi-node flows */
    continuation?: {
        outlets: Record<string, {
            title: string;
            description?: string;
            required?: boolean;
        }>;
    };
    /** Compatibility information */
    compatibility?: {
        minCompilerVersion?: string;
        nodeRedVersion?: string;
        dependencies?: Record<string, string>;
    };
}
/**
 * Parameter definition in a Nexon template
 */
export interface NexonParameter {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'secretRef' | 'expression';
    title?: string;
    description?: string;
    required?: boolean;
    default?: JSONValue;
    /** Validation constraints */
    validation?: {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        enum?: JSONValue[];
    };
    /** UI hints */
    ui?: {
        widget?: 'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'password';
        placeholder?: string;
        help?: string;
    };
}
/**
 * Nexon template - parameterized Node-RED JSON export
 */
export interface NexonTemplate {
    /** Template metadata */
    manifest: NexonManifest;
    /** Node-RED flow template with parameter placeholders */
    template: NodeRedFlowTemplate;
    /** Template source information */
    source: {
        type: 'local' | 'remote';
        path?: string;
        url?: string;
        checksum?: string;
    };
    /** Cache metadata */
    cached?: {
        timestamp: string;
        ttl?: number;
    };
}
/**
 * Node-RED flow template with parameter placeholders
 * This is now a flat array of nodes to match Node-RED's flows.json format
 */
export type NodeRedFlowTemplate = NodeRedNodeTemplate[];
/**
 * Node-RED node template with parameter substitution
 */
export interface NodeRedNodeTemplate {
    id: string;
    type: string;
    name?: string;
    /** Node properties with parameter placeholders */
    [key: string]: any;
}
/**
 * Parameter substitution context
 */
export interface SubstitutionContext {
    /** Parameter values provided by the user */
    parameters: Record<string, ParamValue>;
    /** Stage context information */
    stage: {
        id: string;
        title?: string;
    };
    /** Channel context information */
    channel: {
        channelId: string;
        title: string;
    };
    /** Runtime context */
    runtime?: {
        buildId: string;
        target: 'onprem' | 'cloud';
    };
}
/**
 * Parameter substitution result
 */
export interface SubstitutionResult {
    success: boolean;
    value?: any;
    errors?: string[];
    warnings?: string[];
}
/**
 * Template validation result
 */
export interface TemplateValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
    /** Compatibility check results */
    compatibility?: {
        compatible: boolean;
        issues?: string[];
    };
}
/**
 * Template fetch options
 */
export interface TemplateFetchOptions {
    /** Force refresh from source (bypass cache) */
    forceRefresh?: boolean;
    /** Timeout for remote fetches */
    timeout?: number;
    /** Authentication for remote sources */
    auth?: {
        type: 'bearer' | 'basic' | 'apikey';
        token?: string;
        username?: string;
        password?: string;
        apikey?: string;
    };
}
/**
 * Template cache entry
 */
export interface TemplateCacheEntry {
    template: NexonTemplate;
    timestamp: string;
    ttl: number;
    checksum: string;
}
/**
 * Template source configuration
 */
export interface TemplateSource {
    type: 'local' | 'remote';
    /** Local source configuration */
    local?: {
        basePath: string;
    };
    /** Remote source configuration */
    remote?: {
        baseUrl: string;
        auth?: {
            type: 'bearer' | 'basic' | 'apikey';
            token?: string;
            username?: string;
            password?: string;
            apikey?: string;
        };
    };
}
/**
 * Expression evaluation context
 */
export interface ExpressionContext {
    /** Current message/payload data */
    payload?: any;
    /** Stage parameters */
    params?: Record<string, any>;
    /** Channel metadata */
    channel?: {
        channelId: string;
        title: string;
    };
    /** Runtime environment */
    env?: Record<string, string>;
}
/**
 * Expression evaluation result
 */
export interface ExpressionResult {
    success: boolean;
    value?: any;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map