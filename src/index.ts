import { generateFrameworkMetadata } from "./gen.ts";

const result = generateFrameworkMetadata(
  "/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk",
  "Foundation"
);

Deno.writeTextFileSync("metadata.json", JSON.stringify(result, null, 2));
