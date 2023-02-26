import { generateMetadata } from "./mod.ts";

if (!Deno.args.length) {
  console.error(
    "correct usage: <umbrella header file> [... clang-args]",
  );
  Deno.exit(1);
}

const metadata = generateMetadata({
  umbrellaHeader: Deno.args[0],
  args: Deno.args.slice(1),
});

Deno.writeTextFileSync("metadata.json", JSON.stringify(metadata, null, 2));
console.log("Written to metadata.json!");
