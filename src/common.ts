import { AvailabilityEntry, CXCursor } from "../deps.ts";

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

export function getAvailability(
  cursor: CXCursor,
): AvailabilityEntry[] | undefined {
  const avail = cursor.getPlatformAvailability();
  return avail.alwaysUnavailable || avail.alwaysDeprecated
    ? undefined
    : avail.availability;
}
