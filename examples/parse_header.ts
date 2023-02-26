import { generateMetadata } from "../mod.ts";

const metadata = generateMetadata({
  umbrellaHeader: new URL("./test.h", import.meta.url),
});

Deno.writeTextFileSync("metadata.json", JSON.stringify(metadata, null, 2));
console.log("Written to metadata.json!");
