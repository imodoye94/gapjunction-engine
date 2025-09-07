// packages/ir-schema/src/dev-smoke.ts
import { validateChannelIR } from "./validate.js";
import example from "./examples/channel.minimal.json" with { type: "json" };

const res = validateChannelIR(example);

if (!res.valid) {
  console.error("❌ IR invalid:\n", (res.errors ?? []).join("\n"));
  process.exit(1);
}

console.log("✅ IR valid. Title:", res.channel!.title);
