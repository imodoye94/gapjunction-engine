// packages/ir-schema/src/index.ts
// ESM-friendly barrel file
export * from "./types.js";
export { validateChannelIR, validateStage, validateEdge, validateParams, } from "./validate.js";
// (Optional) re-export raw JSON Schemas for tooling/introspection
// Consumers can import these to build their own validators if needed.
import channelSchema from "./schemas/channel.schema.json" with { type: "json" };
import stageSchema from "./schemas/stage.schema.json" with { type: "json" };
import edgeSchema from "./schemas/edge.schema.json" with { type: "json" };
import paramsSchema from "./schemas/params.schema.json" with { type: "json" };
import bundleManifestSchema from "./schemas/bundle-manifest.schema.json" with { type: "json" };
import credentialsSchema from "./schemas/credentials.schema.json" with { type: "json" };
import runtimeSchema from "./schemas/runtime.schema.json" with { type: "json" };
export const schemas = {
    channel: channelSchema,
    stage: stageSchema,
    edge: edgeSchema,
    params: paramsSchema,
    bundleManifest: bundleManifestSchema,
    credentials: credentialsSchema,
    runtime: runtimeSchema,
};
export function getSchema(name) {
    return schemas[name];
}
//# sourceMappingURL=index.js.map