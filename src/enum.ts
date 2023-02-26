import { CXChildVisitResult, CXCursor, CXCursorKind } from "../deps.ts";
import { NamedDecl } from "./common.ts";
import { processCXType, TypeMetadata } from "./type.ts";
import type { VarDecl } from "./var.ts";

/** @see https://clang.llvm.org/doxygen/classclang_1_1EnumConstantDecl.html */
export interface EnumConstantDecl extends NamedDecl {
  value: string;
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1EnumDecl.html */
export interface EnumDecl extends NamedDecl {
  file: string;
  type: TypeMetadata;
  constants: EnumConstantDecl[];
}

export interface ProcessEnumResult {
  enumDecl?: EnumDecl;
  varDecls: VarDecl[];
}

export function processEnum(cursor: CXCursor): ProcessEnumResult {
  const enumDecl: EnumDecl = {
    name: cursor.getSpelling() || cursor.getType()?.getSpelling() || "",
    file: cursor.getLocation().getFileLocation().file.getName(),
    type: processCXType(cursor.getEnumDeclarationIntegerType()!),
    constants: [],
  };

  const varDecls: VarDecl[] = [];

  if (enumDecl.name.includes(" (unnamed at ")) {
    enumDecl.name = "";
  }

  cursor.visitChildren((cursor, _) => {
    if (cursor.kind === CXCursorKind.CXCursor_EnumConstantDecl) {
      const constant: EnumConstantDecl = {
        name: cursor.getSpelling(),
        value: cursor.getEnumConstantDeclarationValue().toString(),
      };

      if (enumDecl.name === "") {
        varDecls.push({
          file: enumDecl.file,
          name: constant.name,
          type: enumDecl.type,
          value: constant.value,
        });
      } else {
        enumDecl.constants.push(constant);
      }
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  return {
    enumDecl: enumDecl.constants.length > 0 ? enumDecl : undefined,
    varDecls,
  };
}
