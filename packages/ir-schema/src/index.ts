// packages/ir-schema/src/index.ts
// ESM-friendly barrel file

export * from "./types.js";
export {
  validateChannelIR,
  validateStage,
  validateEdge,
  validateParams,
} from "./validate.js";

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
} as const;

export type SchemaName = keyof typeof schemas;
export type Schema = typeof schemas[SchemaName];

export function getSchema(name: SchemaName): Schema {
  return schemas[name];
}