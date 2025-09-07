// packages/ir-schema/src/validate.ts
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import bundleManifestSchema from "./schemas/bundle-manifest.schema.json" with { type: "json" };
import channelSchema from "./schemas/channel.schema.json" with { type: "json" };
import credentialsSchema from "./schemas/credentials.schema.json" with { type: "json" };
import edgeSchema from "./schemas/edge.schema.json" with { type: "json" };
import paramsSchema from "./schemas/params.schema.json" with { type: "json" };
import runtimeSchema from "./schemas/runtime.schema.json" with { type: "json" };
import stageSchema from "./schemas/stage.schema.json" with { type: "json" };
/** Singleton Ajv instance (draft 2020-12) */
let ajvInstance = null;
function getAjv() {
    if (ajvInstance)
        return ajvInstance;
    const ajv = new Ajv2020({
        strict: true,
        strictTypes: false, // Allow uniqueItems without explicit type declaration
        allErrors: true,
        allowUnionTypes: true,
        $data: true,
    });
    addFormats.default(ajv);
    // Register schemas with explicit ids so we can fetch them later
    ajv.addSchema(paramsSchema, "params");
    ajv.addSchema(stageSchema, "stage");
    ajv.addSchema(edgeSchema, "edge");
    ajv.addSchema(channelSchema, "channel");
    ajv.addSchema(bundleManifestSchema, "bundle-manifest");
    ajv.addSchema(credentialsSchema, "credentials-ref");
    ajv.addSchema(runtimeSchema, "runtime-spec");
    // Optional keyword (we still do semantic checks; this is here if you ever want to use it in JSON Schema)
    ajv.addKeyword({
        keyword: "uniqueItemProperty",
        type: "array",
        schemaType: "string",
        errors: true,
        validate: function uniqueItemProperty(prop, data) {
            if (typeof prop !== "string" || !Array.isArray(data))
                return true;
            const seen = new Set();
            for (const [, item] of data.entries()) {
                if (!item || typeof item !== "object")
                    continue;
                const value = item[prop];
                if (value === undefined)
                    continue;
                const key = typeof value === "string" ? value : JSON.stringify(value);
                if (seen.has(key)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    uniqueItemProperty.errors = [
                        {
                            keyword: "uniqueItemProperty",
                            message: `items must be unique by property "${prop}"`,
                            params: { property: prop, duplicate: key },
                        },
                    ];
                    return false;
                }
                seen.add(key);
            }
            return true;
        },
    });
    ajvInstance = ajv;
    return ajv;
}
/** Pretty-print Ajv errors */
function formatAjvErrors(errs) {
    if (!errs?.length)
        return [];
    return errs.map((e) => {
        const where = e.instancePath || "(root)";
        const msg = e.message ?? "validation error";
        const params = ` ${JSON.stringify(e.params)}`;
        return `${where}: ${msg}${params}`;
    });
}
/** Check duplicates by "id" for arrays and emit readable errors. */
function uniqueByIdErrors(arr, label) {
    if (!Array.isArray(arr))
        return [];
    const seen = new Map(); // id -> first index
    const errs = [];
    arr.forEach((item, idx) => {
        const id = item.id;
        if (typeof id !== "string" || id.length === 0)
            return;
        if (seen.has(id)) {
            const firstIndex = seen.get(id);
            if (firstIndex !== undefined) {
                errs.push(`${label}[${idx}].id duplicates ${label}[${firstIndex}].id "${id}"`);
            }
        }
        else {
            seen.set(id, idx);
        }
    });
    return errs;
}
/** Compile once, reuse */
const compiledAjvInstance = getAjv();
const stageValidateRaw = compiledAjvInstance.getSchema("stage");
const edgeValidateRaw = compiledAjvInstance.getSchema("edge");
const paramsValidateRaw = compiledAjvInstance.getSchema("params");
const channelValidateRaw = compiledAjvInstance.getSchema("channel");
const bundleValidateRaw = compiledAjvInstance.getSchema("bundle-manifest");
const credentialsRefValidateRaw = compiledAjvInstance.getSchema("credentials-ref");
const runtimeValidateRaw = compiledAjvInstance.getSchema("runtime-spec");
if (!stageValidateRaw || !edgeValidateRaw || !paramsValidateRaw || !channelValidateRaw ||
    !bundleValidateRaw || !credentialsRefValidateRaw || !runtimeValidateRaw) {
    throw new Error("Failed to compile one or more schemas");
}
// Type-safe validators after null check
const stageValidate = stageValidateRaw;
const edgeValidate = edgeValidateRaw;
const paramsValidate = paramsValidateRaw;
const channelValidate = channelValidateRaw;
const bundleValidate = bundleValidateRaw;
const credentialsRefValidate = credentialsRefValidateRaw;
const runtimeValidate = runtimeValidateRaw;
/** Helper function to validate stage references in edges */
function validateStageReferences(ch, errors) {
    const stageIds = new Set(ch.stages.map((s) => s.id));
    for (const e of ch.edges) {
        if (!stageIds.has(e.from.stageId)) {
            errors.push(`edges[${e.id}].from.stageId "${e.from.stageId}" does not match any stage.id`);
        }
        if (!stageIds.has(e.to.stageId)) {
            errors.push(`edges[${e.id}].to.stageId "${e.to.stageId}" does not match any stage.id`);
        }
    }
}
/** Validate a full Channel IR (schema + semantic checks) */
export function validateChannelIR(input) {
    const ok = channelValidate(input);
    const errors = [];
    if (!ok) {
        errors.push(...formatAjvErrors(channelValidate.errors));
    }
    // Semantic checks beyond JSON Schema
    if (ok && input && typeof input === "object") {
        const ch = input;
        errors.push(...uniqueByIdErrors(ch.stages, "stages"));
        errors.push(...uniqueByIdErrors(ch.edges, "edges"));
        validateStageReferences(ch, errors);
    }
    if (errors.length === 0) {
        return {
            valid: true,
            channel: input,
        };
    }
    else {
        return {
            valid: false,
            errors: errors,
        };
    }
}
/** Leaf validators */
export function validateStage(doc) {
    const ok = stageValidate(doc);
    if (ok)
        return { valid: true, stage: doc };
    return { valid: false, errors: formatAjvErrors(stageValidate.errors) };
}
export function validateEdge(doc) {
    const ok = edgeValidate(doc);
    if (ok)
        return { valid: true, edge: doc };
    return { valid: false, errors: formatAjvErrors(edgeValidate.errors) };
}
export function validateParams(doc) {
    const ok = paramsValidate(doc);
    if (ok)
        return { valid: true };
    return { valid: false, errors: formatAjvErrors(paramsValidate.errors) };
}
export function validateBundleManifest(doc) {
    const ok = bundleValidate(doc);
    if (ok)
        return { valid: true, manifest: doc };
    return { valid: false, errors: formatAjvErrors(bundleValidate.errors) };
}
export function validateCredentialsRef(doc) {
    const ok = credentialsRefValidate(doc);
    if (ok)
        return { valid: true, ref: doc };
    return { valid: false, errors: formatAjvErrors(credentialsRefValidate.errors) };
}
export function validateRuntimeSpec(doc) {
    const ok = runtimeValidate(doc);
    if (ok)
        return { valid: true, runtime: doc };
    return { valid: false, errors: formatAjvErrors(runtimeValidate.errors) };
}
//# sourceMappingURL=validate.js.map