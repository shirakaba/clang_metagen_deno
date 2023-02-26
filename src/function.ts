import { AvailabilityEntry, CXCursor } from "../deps.ts";
import { getAvailability, NamedDecl } from "./common.ts";
import { ParameterDecl } from "./interface.ts";
import { processCXType, TypeMetadata } from "./type.ts";

/** @see https://clang.llvm.org/doxygen/classclang_1_1FunctionDecl.html */
export interface FunctionDecl extends NamedDecl {
  file: string;
  parameters: ParameterDecl[];
  result: TypeMetadata;
  availability: AvailabilityEntry[];
}

export function processFunction(cursor: CXCursor): FunctionDecl | undefined {
  let availability;
  if (!(availability = getAvailability(cursor))) return;

  const functionDecl: FunctionDecl = {
    name: cursor.getSpelling(),
    file: cursor.getLocation().getFileLocation().file.getName(),
    parameters: [],
    result: processCXType(cursor.getResultType()!),
    availability,
  };

  for (let i = 0; i < cursor.getNumberOfArguments(); i++) {
    const arg = cursor.getArgument(i)!;
    const param: ParameterDecl = {
      name: arg.getSpelling(),
      type: processCXType(arg.getType()!),
    };

    functionDecl.parameters.push(param);
  }

  return functionDecl;
}
