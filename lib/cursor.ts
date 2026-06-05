// Cursor-pagination helpers.
//
// A cursor is an opaque pointer to "the last item you saw," encoded as
// base64(value::id). For a feed ordered by (orderField DESC, id DESC), the next
// page is everything strictly "after" that point. Because the WHERE uses the
// indexed columns directly, page N is as fast as page 1, and new inserts at the
// top never cause the duplicate/skip problems that OFFSET pagination has.

export function encodeCursor(value: string, id: string): string {
  return Buffer.from(`${value}::${id}`).toString("base64url");
}

export function decodeCursor(cursor?: string | null): { value: string; id: string } | null {
  if (!cursor) return null;
  try {
    const [value, id] = Buffer.from(cursor, "base64url").toString().split("::");
    return value && id ? { value, id } : null;
  } catch {
    return null;
  }
}

// Build the Prisma WHERE fragment for "items after the cursor", for a DESC feed
// ordered by (field, id). isDate converts the stored ISO value back to a Date.
export function cursorWhere(field: string, cursor?: string | null, isDate = true): Record<string, unknown> {
  const c = decodeCursor(cursor);
  if (!c) return {};
  const val: unknown = isDate ? new Date(c.value) : c.value;
  // (field < val) OR (field == val AND id < c.id)
  return {
    OR: [
      { [field]: { lt: val } },
      { AND: [{ [field]: val }, { id: { lt: c.id } }] },
    ],
  };
}
