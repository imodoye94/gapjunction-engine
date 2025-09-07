import type { BundleManifest, ChannelIR, CredentialsRef, Edge, RuntimeTarget, Stage } from "./types.js";
/** Internal helper interface for runtime object */
interface RuntimeSpec {
    target: RuntimeTarget;
}
/** Validate a full Channel IR (schema + semantic checks) */
export declare function validateChannelIR(input: unknown): {
    valid: boolean;
    channel?: ChannelIR;
    errors?: string[];
};
/** Leaf validators */
export declare function validateStage(doc: unknown): {
    valid: boolean;
    errors?: string[];
    stage?: Stage;
};
export declare function validateEdge(doc: unknown): {
    valid: boolean;
    errors?: string[];
    edge?: Edge;
};
export declare function validateParams(doc: unknown): {
    valid: boolean;
    errors?: string[];
};
export declare function validateBundleManifest(doc: unknown): {
    valid: boolean;
    errors?: string[];
    manifest?: BundleManifest;
};
export declare function validateCredentialsRef(doc: unknown): {
    valid: boolean;
    errors?: string[];
    ref?: CredentialsRef;
};
export declare function validateRuntimeSpec(doc: unknown): {
    valid: boolean;
    errors?: string[];
    runtime?: RuntimeSpec;
};
export {};
//# sourceMappingURL=validate.d.ts.map