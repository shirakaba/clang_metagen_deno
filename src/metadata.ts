import { CXChildVisitResult, CXCursor, CXCursorKind } from "../deps.ts";
import { CategoryDecl, processCategory } from "./category.ts";
import { EnumDecl, processEnum } from "./enum.ts";
import { FunctionDecl, processFunction } from "./function.ts";
import { InterfaceDecl, processInterface } from "./interface.ts";
import { processProtocol, ProtocolDecl } from "./protocol.ts";
import { processStruct, StructDecl } from "./struct.ts";
import { processVarDecl, VarDecl } from "./var.ts";

export interface Metadata {
  varDecls: VarDecl[];
  enumDecls: EnumDecl[];
  structDecls: StructDecl[];
  functionDecls: FunctionDecl[];
  interfaceDecls: InterfaceDecl[];
  categoryDecls: CategoryDecl[];
  protocolDecls: ProtocolDecl[];
}

export function processMetadata(cursor: CXCursor) {
  const metadata: Metadata = {
    varDecls: [],
    enumDecls: [],
    structDecls: [],
    functionDecls: [],
    interfaceDecls: [],
    categoryDecls: [],
    protocolDecls: [],
  };

  cursor.visitChildren((cursor, _) => {
    switch (cursor.kind) {
      case CXCursorKind.CXCursor_VarDecl: {
        const decl = processVarDecl(cursor);
        if (decl) metadata.varDecls.push(decl);
        break;
      }

      case CXCursorKind.CXCursor_ObjCInterfaceDecl: {
        const decl = processInterface(cursor);
        if (decl) metadata.interfaceDecls.push(decl);
        break;
      }

      case CXCursorKind.CXCursor_ObjCCategoryDecl: {
        const decl = processCategory(cursor);
        if (decl) metadata.categoryDecls.push(decl);
        break;
      }

      case CXCursorKind.CXCursor_ObjCProtocolDecl: {
        const decl = processProtocol(cursor);
        if (decl) metadata.protocolDecls.push(decl);
        break;
      }

      case CXCursorKind.CXCursor_EnumDecl: {
        const decl = processEnum(cursor);
        if (decl.enumDecl) metadata.enumDecls.push(decl.enumDecl);
        for (const varDecl of decl.varDecls) {
          metadata.varDecls.push(varDecl);
        }
        break;
      }

      case CXCursorKind.CXCursor_FunctionDecl: {
        const decl = processFunction(cursor);
        if (decl) metadata.functionDecls.push(decl);
        break;
      }

      case CXCursorKind.CXCursor_StructDecl: {
        const decl = processStruct(cursor);
        if (decl) metadata.structDecls.push(decl);
        break;
      }

      default:
        break;
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  return metadata;
}
