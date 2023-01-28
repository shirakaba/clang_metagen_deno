import { CXEvalResultKind, CXVisitorResult } from "https://deno.land/x/libclang@1.0.0-beta.3/include/typeDefinitions.ts";
import {
  CXIndex,
  CXFile,
  CXCursor,
} from "https://deno.land/x/libclang@1.0.0-beta.3/mod.ts";
import { CXChildVisitResult } from "https://deno.land/x/libclang@1.0.0-beta.3/include/typeDefinitions.ts";

const foundationUmbrella =
  "/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks/Foundation.framework/Headers/Foundation.h";

const index = new CXIndex(false);
// const tu = index.parseTranslationUnit(foundationUmbrella);
// const tu = index.parseTranslationUnit(foundationUmbrella, ["-fmodules"]);
const tu = index.parseTranslationUnit(foundationUmbrella, [
  "-Xclang",

  // You can determine this path using: xcrun --sdk iphoneos --show-sdk-path
  "-isysroot",
  "/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk",

  // Doesn't seem to be necessary. Found in an unrelated project.
  // "-arch", "arm64",

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
  // This is the iPhone simulator I have installed. Your version may
  // differ.
  "-target",
  "arm64-apple-ios16.2",

  // The below headers I guessed myself. I guess the metadata generator
  // links and includes via calling the clang APIs rather than passing
  // these flags.
  //
  // Include the Foundation umbrella header.
  "-I/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/System/Library/Frameworks/Foundation.framework/Headers",
  "-I/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/usr/include",
  // Pass the Frameworks directory.
  "-F/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/System/Library/Frameworks",
]);

const files: CXFile[] = [];
let i = 0;
tu.getInclusions((file, stack) => {
  // console.log(`[${i}] ${file.getName()}`);
  i++;
  files.push(file);
});

// https://github.com/NativeScript/ios/blob/01efe3593dac3aec9adb6033c1211651136f2bb0/metadata-generator/src/Meta/MetaFactory.cpp#L116

files.forEach((file) => {
  const cursor = file.tu.getCursor();
  cursor.visitChildren((cursor, parent) => {
    // if (["EnumDecl", "EnumConstantDecl"].includes(cursor.getKindSpelling())) {
    // }

    switch (cursor.getKindSpelling()) {
      case "VarDecl":
        // console.log(
        //   `[${cursor.getKindSpelling()}] ${cursor.getSpelling()} ${cursor.getPrettyPrinted()}`
        // );
        fromVar(cursor);
        break;

      default:
        break;
    }
    // if(cursor.getDisplayName().includes("NSStringTransform")){
    // console.log("displayName: ", cursor.getDisplayName());
    // console.log("getSpelling:", cursor.getType()?.getSpelling());
    // console.log("getCanonicalType:", cursor.getType()?.getCanonicalType().getSpelling());
    // console.log("getTypedefName:", cursor.getType()?.getTypedefName());
    // console.log("getNamedType:", cursor.getType()?.getNamedType());
    // }
    return CXChildVisitResult.CXChildVisit_Continue;
  });
});

function fromVar(cursor: CXCursor) {
  // if (var.getLexicalDeclContext() != var.getASTContext().getTranslationUnitDecl()) {
  //   throw MetaCreationException(&varMeta, "A nested var.", false);
  // }

  const initializer = cursor.getVariableDeclarationInitializer();
  if (!initializer) {
    // Evaluate() will fail if there is no initializer.
    return;
  }

  const evValue = cursor.Evaluate();
  let value = 0;
  switch (evValue.getKind()) {
    case CXEvalResultKind.CXEval_Int:
      value = evValue.getAsInt();
      break;
    case CXEvalResultKind.CXEval_Float:
      value = evValue.getAsDouble();
      break;
    default:
      // throw new Error(`Unsupported CXEvalResultKind: ${evValue.getKind()}`);
      // ignore
      break;
  }

  console.log(
    // `[${cursor.getKindSpelling()}] ${cursor.getSpelling()} ${cursor.getPrettyPrinted()} evValue ${value}`
    `[${cursor.getKindSpelling()}] ${cursor.getSpelling()} evValue ${value}`
  );
}

// function populateMetaFields(){

// }

tu.dispose();
index.dispose();
