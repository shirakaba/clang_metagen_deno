import { CXCursor, CXEvalResultKind } from "../deps.ts";
import { NamedDecl } from "./common.ts";
import { processCXType, TypeMetadata } from "./type.ts";

/** @see https://clang.llvm.org/doxygen/classclang_1_1VarDecl.html */
export interface VarDecl extends NamedDecl {
  file: string;
  type: TypeMetadata;
  value: string | number | bigint | null;
}

export function processVarDecl(cursor: CXCursor): VarDecl | undefined {
  const initializer = cursor.getVariableDeclarationInitializer();
  if (!initializer) {
    return;
  }

  const evValue = cursor.Evaluate();
  let value: string | number | bigint | null = null;
  switch (evValue.getKind()) {
    case CXEvalResultKind.CXEval_Int:
      value = evValue.getAsInt();
      break;
    case CXEvalResultKind.CXEval_Float:
      value = evValue.getAsDouble();
      break;
    case CXEvalResultKind.CXEval_ObjCStrLiteral:
    case CXEvalResultKind.CXEval_StrLiteral:
      value = evValue.getAsStr();
      break;
    default:
      // ignore
      break;
  }

  return {
    file: cursor.getLocation().getFileLocation().file.getName(),
    name: cursor.getSpelling(),
    type: processCXType(cursor.getType()!),
    value,
  };
}
