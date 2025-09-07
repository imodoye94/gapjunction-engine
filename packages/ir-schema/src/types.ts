// packages/ir-schema/src/types.ts

/**
 * Canonical TypeScript types for GapJunction's Intermediate Representation (IR).
 * These mirror the JSON Schemas in ./schemas and are intentionally minimal for v1.
 * Keep these types stable; bump ChannelIR.version if you introduce breaking changes.
 */

export type UUID = string;     // e.g., "3b2d2a62-1e24-4f7b-8c53-0d2f6a6b5a8a"
export type ISODate = string;  // e.g., "2025-08-29T04:20:00Z"

/**
 * An opaque reference to a secret stored in a provider (e.g., GCP Secret Manager).
 * Nothing sensitive is ever in the IR; only references live here.
 */
export interface CredentialsRef {
  type: 'secretRef';
  ref: string; // e.g., "gcp://projects/<pid>/secrets/<name>/versions/latest"
}

// A recursive JSON literal (string, number, boolean, null, array, or object)
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Tagged token shapes (kept explicit so they’re easy to narrow on)
export interface SecretRefToken {
  secret: CredentialsRef; // { type: 'secretRef', ref: '...' }
}
export interface ExpressionToken {
  expression: string;     // e.g. "$.payload.mrn"
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
  id: string;                       // UI slug, unique within the channel (e.g., "tcp_in_1")
  title?: string;                   // Optional friendly label
  description?: string;				// Optional description of the nexon in the context of the channel (e.g. receive data from miniVidas)
  iconUrl?: string;					// Optional logo/icon representation of the nexon (e.g. Twilio logo for twilio nexons)
  nexonId: string;                  // e.g., "tcp.listener", "http.request", "astm.ingress.minividas"
  nexonVersion?: string;            // semantic version or tag for the template
  documentation?: string;			// Optional full markdown user documentation of nexon (allowing users explain their logic to other users)
  params?: Record<string, ParamValue>;
  continuation?: { outlet?: string }; // for poly-node templates, named outlet to continue from
  position?: { x: number; y: number }; // UI-only
}

/**
 * A directed wire between two stage ports.
 * - outlet/inlet are optional; defaults to the template’s primary outlet/inlet
 */
export interface Edge {
  id: string;                       // unique within the channel
  from: { stageId: string; outlet?: string };
  to:   { stageId: string; inlet?: string };
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
  version: 1;                       	// bump if breaking shape changes
  channelId: string;                	// stable channel identifier
  title: string;
  runtime: { target: RuntimeTarget };
  security?: SecurityIntent;
  stages: Stage[];
  edges: Edge[];
  documentation?: string;				// Optional full markdown user documentation of channel (allowing users explain their logic to other users)
  metadata?: Record<string, any>;		// Free-form annotations for the editor, linters, or future features.
}

/**
 * Minimal manifest describing the compiler’s bundle output for the Agent.
 * The Agent uses this to know where artifacts are located.
 */
export interface BundleManifest {
  version: 1;
  channelId: string;
  buildId: string;                  // unique build identifier
  mode: 'TEST' | 'PROD';
  artifacts: {
    flowsJsonPath: string;          // path inside bundle tar (e.g., "./flows.json")
    settingsPath: string;           // path inside bundle tar (e.g., "./settings.js")
    credentialsMapPath?: string;    // optional path mapping secret refs → runtime creds
  };
}
