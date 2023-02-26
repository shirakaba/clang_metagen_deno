import { CXChildVisitResult, CXCursor, CXCursorKind } from "../deps.ts";
import { CXCursorRepresentation } from "./common.ts";
import { processCXType, TypeMetadata } from "./type.ts";

/**
 * Represents CXCursor_StructFieldDecl.
 * @see https://clang.llvm.org/doxygen/Index_8h_source.html#l01062
 */
export interface StructFieldDecl extends CXCursorRepresentation {
  type: TypeMetadata;
  offset: number;
}

/**
 * Represents CXCursor_StructDecl.
 * @see https://clang.llvm.org/doxygen/Index_8h_source.html#l01062
 */
export interface StructDecl extends CXCursorRepresentation {
  file: string;
  fields: StructFieldDecl[];
  size: number;
}

export function processStruct(cursor: CXCursor): StructDecl | undefined {
  const structDecl: StructDecl = {
    name: cursor.getSpelling(),
    file: cursor.getLocation().getFileLocation().file.getName(),
    fields: [],
    size: cursor.getType()?.getSizeOf() || 0,
  };

  if (structDecl.name === "") {
    structDecl.name = cursor.getType()?.getSpelling() || "";
    if (structDecl.name.startsWith("struct ")) {
      structDecl.name = structDecl.name.substring(7);
    }
  }

  cursor.visitChildren((cursor, _) => {
    if (cursor.kind === CXCursorKind.CXCursor_FieldDecl) {
      const field: StructFieldDecl = {
        name: cursor.getSpelling(),
        type: processCXType(cursor.getType()!),
        offset: cursor.getOffsetOfField() || 0,
      };

      structDecl.fields.push(field);
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  return structDecl;
}
