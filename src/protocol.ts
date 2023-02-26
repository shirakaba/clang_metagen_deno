import {
  AvailabilityEntry,
  CXChildVisitResult,
  CXCursor,
  CXCursorKind,
} from "../deps.ts";
import { getAvailability, NamedDecl } from "./common.ts";
import {
  ClassRef,
  MethodDecl,
  processMethod,
  processProperty,
  PropertyDecl,
} from "./interface.ts";

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCProtocolDecl.html */
export interface ProtocolDecl extends NamedDecl {
  file: string;
  protocols: ClassRef[];
  properties: PropertyDecl[];
  instanceMethods: MethodDecl[];
  classMethods: MethodDecl[];
  availability: AvailabilityEntry[];
}

export function processProtocol(cursor: CXCursor): ProtocolDecl | undefined {
  let availability;
  if (!(availability = getAvailability(cursor))) return;

  const protocolDecl: ProtocolDecl = {
    name: cursor.getSpelling(),
    file: cursor.getLocation().getFileLocation().file.getName(),
    protocols: [],
    properties: [],
    instanceMethods: [],
    classMethods: [],
    availability,
  };

  cursor.visitChildren((cursor, _) => {
    switch (cursor.kind) {
      case CXCursorKind.CXCursor_ObjCProtocolRef:
        protocolDecl.protocols.push({
          name: cursor.getSpelling(),
          module: cursor.getLocation().getFileLocation().file.getName(),
        });
        break;

      case CXCursorKind.CXCursor_ObjCPropertyDecl:
        processProperty(cursor, protocolDecl.properties);
        break;

      case CXCursorKind.CXCursor_ObjCInstanceMethodDecl:
        processMethod(cursor, protocolDecl.instanceMethods);
        break;

      case CXCursorKind.CXCursor_ObjCClassMethodDecl:
        processMethod(cursor, protocolDecl.classMethods);
        break;

      default:
        break;
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  return protocolDecl;
}
