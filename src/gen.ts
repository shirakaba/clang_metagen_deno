import { CXIndex, fromFileUrl, toFileUrl } from "../deps.ts";
import { Metadata, processMetadata } from "./metadata.ts";

export interface GenerateMetadataOptions {
  umbrellaHeader: string | URL;
  args?: string[];
}

export function generateMetadata(options: GenerateMetadataOptions): Metadata {
  const index = new CXIndex(false);
  const path = typeof options.umbrellaHeader === "string"
    ? (options.umbrellaHeader.startsWith("/")
      ? options.umbrellaHeader
      : fromFileUrl(
        new URL(
          `${
            options.umbrellaHeader.startsWith(".") ? "" : "./"
          }${options.umbrellaHeader}`,
          toFileUrl(Deno.cwd() + "/"),
        ),
      ))
    : fromFileUrl(options.umbrellaHeader);
  const tu = index.parseTranslationUnit(path, options.args);
  const meta = processMetadata(tu.getCursor());
  tu.dispose();
  index.dispose();
  return meta;
}

export interface GenerateFrameworkMetadataOptions {
  sdk: string;
  framework: string;
  umbrellaHeader?: string;
}

export function generateFrameworkMetadata(
  options: GenerateFrameworkMetadataOptions,
): Metadata {
  const frameworksDir = `${options.sdk}/System/Library/Frameworks`;
  const foundationUmbrella =
    `${frameworksDir}/${options.framework}.framework/Headers/${
      options.umbrellaHeader ?? options.framework
    }.h`;

  return generateMetadata({
    umbrellaHeader: foundationUmbrella,
    args: [
      "-Xclang",

      // You can determine this path using: xcrun --sdk iphoneos --show-sdk-path
      "-isysroot",
      options.sdk,

      "-x",
      "objective-c",

      "-fno-objc-arc",
      "-fmodule-maps",
      "-ferror-limit=0",

      "-Wno-unknown-pragmas",
      "-Wno-ignored-attributes",
      "-Wno-nullability-completeness",
      "-Wno-expansion-to-defined",

      "-std=gnu99",

      // Include the framework's umbrella header.
      `-I${frameworksDir}/${options.framework}.framework/Headers`,

      // Include the system headers (CoreFoundation, for example, requires them).
      `-I${options.sdk}/usr/include`,

      // Pass the Frameworks directory.
      `-F${frameworksDir}`,
    ],
  });
}
