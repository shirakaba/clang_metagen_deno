import { CXType } from "../deps.ts";

export interface TypeMetadata {
  name: string;
  kind: string;
  canonical: string;
  canonicalKind: string;
  size: number;
  elementType?: TypeMetadata;
  pointeeType?: TypeMetadata;
  arraySize?: number;
  block?: {
    returnType?: TypeMetadata;
    parameters: TypeMetadata[];
  };
}

export function processCXType(type: CXType): TypeMetadata {
  const canonicalType = type.getCanonicalType();
  const canonicalKind = canonicalType.getKindSpelling();
  const elementType = type.getArrayElementType();
  const pointeeType = type.getPointeeType();
  const arraySize = type.getArraySize();

  return {
    name: type.getSpelling(),
    kind: type.getKindSpelling(),
    canonical: canonicalType.getSpelling(),
    canonicalKind,
    size: type.getSizeOf(),
    elementType: elementType ? processCXType(elementType) : undefined,
    pointeeType: pointeeType ? processCXType(pointeeType) : undefined,
    arraySize: arraySize < 0 ? undefined : arraySize,
    block: canonicalKind === "BlockPointer" && pointeeType
      ? {
        returnType: pointeeType.getResultType()
          ? processCXType(pointeeType.getResultType()!)
          : undefined,
        parameters: Array.from(
          { length: pointeeType.getNumberOfArgumentTypes() },
          (_, i) => processCXType(pointeeType.getArgumentType(i)!),
        ),
      }
      : undefined,
  };
}
