import {
  CXCursor,
  CXCursorKind,
  CXChildVisitResult,
  CXType,
  CXEvalResultKind,
  CXIndex,
} from "../deps.ts";

export interface TypeMetadata {
  name: string;
  kind: string;
  canonical: string;
  canonicalKind: string;
  size: number;
}

export interface Metadata {
  varDecls: VarDecl[];
  enumDecls: EnumDecl[];
  structDecls: StructDecl[];
  functionDecls: FunctionDecl[];
  interfaceDecls: InterfaceDecl[];
  categoryDecls: CategoryDecl[];
  protocolDecls: ProtocolDecl[];
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1NamedDecl.html */
export interface NamedDecl {
  name: string;
}

/**
 * Our representation of CXCursor - we generate a 'name' field from its 'kind'
 * field.
 * @see https://clang.llvm.org/doxygen/structCXCursor.html
 */
export interface CXCursorRepresentation {
  name: string;
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1VarDecl.html */
export interface VarDecl extends NamedDecl {
  type: TypeMetadata;
  value: string | null;
}

/**
 * @see https://clang.llvm.org/doxygen/classclang_1_1ObjCTypeParamDecl.html
 * @see https://clang.llvm.org/doxygen/classclang_1_1ParmVarDecl.html
 */
export interface ParameterDecl extends NamedDecl {
  type: TypeMetadata;
}

/**
 * @see https://clang.llvm.org/doxygen/classclang_1_1ObjCMethodDecl.html
 * @see https://clang.llvm.org/doxygen/classclang_1_1CXXMethodDecl.html
 */
export interface MethodDecl extends NamedDecl {
  parameters: ParameterDecl[];
  result: TypeMetadata;
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCPropertyDecl.html */
export interface PropertyDecl extends NamedDecl {
  type: TypeMetadata;
}

/**
 * Represents CXCursor_ObjCClassRef or CXCursor_ObjCSuperClassRef.
 * @see https://clang.llvm.org/doxygen/Index_8h_source.html#l01137
 */
export interface ClassRef extends CXCursorRepresentation {
  module: string;
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCInterfaceDecl.html */
export interface InterfaceDecl extends NamedDecl {
  super: ClassRef | null;
  properties: PropertyDecl[];
  instanceMethods: MethodDecl[];
  classMethods: MethodDecl[];
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCCategoryDecl.html */
export interface CategoryDecl extends NamedDecl {
  interface: ClassRef;
  properties: PropertyDecl[];
  instanceMethods: MethodDecl[];
  classMethods: MethodDecl[];
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCProtocolDecl.html */
export interface ProtocolDecl extends NamedDecl {
  protocols: ClassRef[];
  properties: PropertyDecl[];
  instanceMethods: MethodDecl[];
  classMethods: MethodDecl[];
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1EnumConstantDecl.html */
export interface EnumConstantDecl extends NamedDecl {
  value: string;
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1EnumDecl.html */
export interface EnumDecl extends NamedDecl {
  type: TypeMetadata;
  constants: EnumConstantDecl[];
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1FunctionDecl.html */
export interface FunctionDecl extends NamedDecl {
  parameters: ParameterDecl[];
  result: TypeMetadata;
}

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
  fields: StructFieldDecl[];
  size: number;
}

export function generateFrameworkMetadata(
  sdk: string,
  framework: string,
  umbrella?: string
) {
  const foundationUmbrella = `${sdk}/System/Library/Frameworks/${framework}.framework/Headers/${
    umbrella ?? framework
  }.h`;

  const index = new CXIndex(false);

  const tu = index.parseTranslationUnit(foundationUmbrella, [
    "-Xclang",

    // You can determine this path using: xcrun --sdk iphoneos --show-sdk-path
    "-isysroot",
    sdk,

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
    // This is the iPhone simulator I have installed. Your version may differ.
    "-target",
    "arm64-apple-ios16.2",

    // The below headers I guessed myself. I guess the metadata generator links
    // and includes via calling the clang APIs rather than passing these flags.

    // Include the framework's umbrella header.
    `-I${sdk}/System/Library/Frameworks/${framework}.framework/Headers`,
    // Include the system headers (CoreFoundation, for example, requires them).
    `-I${sdk}/usr/include`,
    // Pass the Frameworks directory.
    `-F${sdk}/System/Library/Frameworks`,
  ]);
  const meta = generate(tu.getCursor());
  tu.dispose();
  index.dispose();
  return meta;
}

export function generate(cursor: CXCursor) {
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
      case CXCursorKind.CXCursor_VarDecl:
        processVarDecl(cursor, metadata);
        break;

      case CXCursorKind.CXCursor_ObjCInterfaceDecl:
        processInterface(cursor, metadata);
        break;

      case CXCursorKind.CXCursor_ObjCCategoryDecl:
        processCategory(cursor, metadata);
        break;

      case CXCursorKind.CXCursor_ObjCProtocolDecl:
        processProtocol(cursor, metadata);
        break;

      case CXCursorKind.CXCursor_EnumDecl:
        processEnum(cursor, metadata);
        break;

      case CXCursorKind.CXCursor_FunctionDecl:
        processFunction(cursor, metadata);
        break;

      case CXCursorKind.CXCursor_StructDecl:
        processStruct(cursor, metadata);
        break;

      default:
        break;
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  return metadata;
}

export function processCXType(type: CXType): TypeMetadata {
  // type.getCanonicalType().get
  return {
    name: type.getSpelling(),
    kind: type.getKindSpelling(),
    canonical: type.getCanonicalType().getSpelling(),
    canonicalKind: type.getCanonicalType().getKindSpelling(),
    size: type.getSizeOf(),
  };
}

export function processVarDecl(cursor: CXCursor, metadata: Metadata) {
  const initializer = cursor.getVariableDeclarationInitializer();
  if (!initializer) {
    return;
  }

  const evValue = cursor.Evaluate();
  let value: string | null = null;
  switch (evValue.getKind()) {
    case CXEvalResultKind.CXEval_Int:
      value = evValue.getAsInt().toString();
      break;
    case CXEvalResultKind.CXEval_Float:
      value = evValue.getAsDouble().toString();
      break;
    default:
      // ignore
      break;
  }

  const varDecl: VarDecl = {
    name: cursor.getSpelling(),
    type: processCXType(cursor.getType()!),
    value,
  };

  metadata.varDecls.push(varDecl);
}

export function processInterface(cursor: CXCursor, metadata: Metadata) {
  const interfaceDecl: InterfaceDecl = {
    name: cursor.getSpelling(),
    super: null,
    properties: [],
    instanceMethods: [],
    classMethods: [],
  };

  cursor.visitChildren((cursor, _) => {
    switch (cursor.kind) {
      case CXCursorKind.CXCursor_ObjCSuperClassRef:
        interfaceDecl.super = {
          name: cursor.getSpelling(),
          module: cursor.getLocation().getFileLocation().file.getName(),
        };
        break;

      case CXCursorKind.CXCursor_ObjCPropertyDecl:
        processProperty(cursor, interfaceDecl.properties);
        break;

      case CXCursorKind.CXCursor_ObjCInstanceMethodDecl:
        processMethod(cursor, interfaceDecl.instanceMethods);
        break;

      case CXCursorKind.CXCursor_ObjCClassMethodDecl:
        processMethod(cursor, interfaceDecl.classMethods);
        break;

      default:
        break;
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  metadata.interfaceDecls.push(interfaceDecl);
}

export function processProperty(cursor: CXCursor, properties: PropertyDecl[]) {
  const propertyDecl: PropertyDecl = {
    name: cursor.getSpelling(),
    type: processCXType(cursor.getType()!),
  };

  properties.push(propertyDecl);
}

export function processMethod(cursor: CXCursor, methodDecls: MethodDecl[]) {
  const methodDecl: MethodDecl = {
    name: cursor.getSpelling(),
    parameters: [],
    result: processCXType(cursor.getResultType()!),
  };

  for (let i = 0; i < cursor.getNumberOfArguments(); i++) {
    const arg = cursor.getArgument(i)!;
    const param: ParameterDecl = {
      name: arg.getSpelling(),
      type: processCXType(arg.getType()!),
    };

    methodDecl.parameters.push(param);
  }

  methodDecls.push(methodDecl);
}

export function processCategory(cursor: CXCursor, metadata: Metadata) {
  if (metadata.categoryDecls.find((v) => v.name === cursor.getSpelling())) {
    return;
  }

  const categoryDecl: CategoryDecl = {
    name: cursor.getSpelling(),
    interface: {
      name: "",
      module: "",
    },
    properties: [],
    instanceMethods: [],
    classMethods: [],
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

  metadata.categoryDecls.push(categoryDecl);
}

export function processProtocol(cursor: CXCursor, metadata: Metadata) {
  const protocolDecl: ProtocolDecl = {
    name: cursor.getSpelling(),
    protocols: [],
    properties: [],
    instanceMethods: [],
    classMethods: [],
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

  metadata.protocolDecls.push(protocolDecl);
}

export function processEnum(cursor: CXCursor, metadata: Metadata) {
  const enumDecl: EnumDecl = {
    name: cursor.getSpelling() || cursor.getType()?.getSpelling() || "",
    type: processCXType(cursor.getEnumDeclarationIntegerType()!),
    constants: [],
  };

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
        metadata.varDecls.push({
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

  if (enumDecl.constants.length > 0) {
    metadata.enumDecls.push(enumDecl);
  }
}

export function processFunction(cursor: CXCursor, metadata: Metadata) {
  const functionDecl: FunctionDecl = {
    name: cursor.getSpelling(),
    parameters: [],
    result: processCXType(cursor.getResultType()!),
  };

  for (let i = 0; i < cursor.getNumberOfArguments(); i++) {
    const arg = cursor.getArgument(i)!;
    const param: ParameterDecl = {
      name: arg.getSpelling(),
      type: processCXType(arg.getType()!),
    };

    functionDecl.parameters.push(param);
  }

  metadata.functionDecls.push(functionDecl);
}

export function processStruct(cursor: CXCursor, metadata: Metadata) {
  const structDecl: StructDecl = {
    name: cursor.getSpelling(),
    fields: [],
    size: cursor.getType()?.getSizeOf() || 0,
  };

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

  metadata.structDecls.push(structDecl);
}
