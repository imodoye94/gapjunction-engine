/**
 * Canonical TypeScript types for GapJunction's Intermediate Representation (IR).
 * These mirror the JSON Schemas in ./schemas and are intentionally minimal for v1.
 * Keep these types stable; bump ChannelIR.version if you introduce breaking changes.
 */
export type UUID = string;
export type ISODate = string;
/**
 * An opaque reference to a secret stored in a provider (e.g., GCP Secret Manager).
 * Nothing sensitive is ever in the IR; only references live here.
 */
export interface CredentialsRef {
    type: 'secretRef';
    ref: string;
}
export type JSONValue = string | number | boolean | null | JSONValue[] | {
    [key: string]: JSONValue;
};
export interface SecretRefToken {
    secret: CredentialsRef;
}
export interface ExpressionToken {
    expression: string;
}
/**
 * Parameter values a Nexon instance can accept.
 * - Any JSON literal (including nested objects/arrays)
 * - or a tagged secret token
 * - or a tagged expression token
 *
 * Note: TypeScript can't easily express "JSONValue but not SecretRefToken/ExpressionToken".
 * We enforce that disjointness at runtime with JSON Schema (see params.schema.json).
 */
export type ParamValue = JSONValue | SecretRefToken | ExpressionToken;
/**
 * A placed Nexon instance in the canvas.
 * - id: a stable slug for UI (compiler will generate deterministic runtime IDs)
 * - nexonId/nexonVersion: selects a template from the nexon-catalog
 * - params: values that hydrate the template
 * - continuation: where to attach next stages for poly-nodal templates
 * - position: purely for editor layout (ignored by compiler logic)
 */
export interface Stage {
    id: string;
    title?: string;
    description?: string;
    iconUrl?: string;
    nexonId: string;
    nexonVersion?: string;
    documentation?: string;
    params?: Record<string, ParamValue>;
    continuation?: {
        outlet?: string;
    };
    position?: {
        x: number;
        y: number;
    };
}
/**
 * A directed wire between two stage ports.
 * - outlet/inlet are optional; defaults to the template’s primary outlet/inlet
 */
export interface Edge {
    id: string;
    from: {
        stageId: string;
        outlet?: string;
    };
    to: {
        stageId: string;
        inlet?: string;
    };
}
/** Where this channel is intended to run. */
export type RuntimeTarget = 'onprem' | 'cloud';
/**
 * Security intent hints for the compiler/agent guardrails.
 * Defaults are secure; users must explicitly opt-in to riskier behaviors.
 */
export interface SecurityIntent {
    /** Allow HTTP requests to the public Internet during runtime (default false). */
    allowInternetHttpOut?: boolean;
    /** Allow TCP connections to the public Internet (default false). */
    allowInternetTcpOut?: boolean;
    /** Allow UDP to the public Internet (default false). */
    allowInternetUdpOut?: boolean;
    /** Allow public HTTP-In listeners (default false; else bind to localhost/VPN only). */
    allowHttpInPublic?: boolean;
}
/**
 * Root Channel IR document saved by the Editor.
 */
export interface ChannelIR {
    version: 1;
    channelId: string;
    title: string;
    runtime: {
        target: RuntimeTarget;
    };
    security?: SecurityIntent;
    stages: Stage[];
    edges: Edge[];
    documentation?: string;
    metadata?: Record<string, any>;
}
/**
 * Minimal manifest describing the compiler’s bundle output for the Agent.
 * The Agent uses this to know where artifacts are located.
 */
export interface BundleManifest {
    version: 1;
    channelId: string;
    buildId: string;
    mode: 'TEST' | 'PROD';
    artifacts: {
        flowsJsonPath: string;
        settingsPath: string;
        credentialsMapPath?: string;
    };
}
//# sourceMappingURL=types.d.ts.map