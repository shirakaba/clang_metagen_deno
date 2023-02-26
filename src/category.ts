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

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCCategoryDecl.html */
export interface CategoryDecl extends NamedDecl {
  file: string;
  interface: ClassRef;
  properties: PropertyDecl[];
  instanceMethods: MethodDecl[];
  classMethods: MethodDecl[];
  availability: AvailabilityEntry[];
}

export function processCategory(cursor: CXCursor): CategoryDecl | undefined {
  let availability;
  if (!(availability = getAvailability(cursor))) return;

  const categoryDecl: CategoryDecl = {
    name: cursor.getSpelling(),
    file: cursor.getLocation().getFileLocation().file.getName(),
    interface: {
      name: "",
      module: "",
    },
    properties: [],
    instanceMethods: [],
    classMethods: [],
    availability,
  };

  cursor.visitChildren((cursor, _) => {
    switch (cursor.kind) {
      case CXCursorKind.CXCursor_ObjCClassRef:
        categoryDecl.interface.name = cursor.getSpelling();
        categoryDecl.interface.module = cursor
          .getLocation()
          .getFileLocation()
          .file.getName();
        break;

      case CXCursorKind.CXCursor_ObjCPropertyDecl:
        processProperty(cursor, categoryDecl.properties);
        break;

      case CXCursorKind.CXCursor_ObjCInstanceMethodDecl:
        processMethod(cursor, categoryDecl.instanceMethods);
        break;

      case CXCursorKind.CXCursor_ObjCClassMethodDecl:
        processMethod(cursor, categoryDecl.classMethods);
        break;
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  return categoryDecl;
}
