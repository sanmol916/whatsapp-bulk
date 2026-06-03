/**
 * Normalize a phone number to the WhatsApp wire format: digits only,
 * E.164 without the leading '+'. e.g. "+1 (415) 555-2671" -> "14155552671".
 * Returns null if the result is not a plausible international number.
 */
export function normalizePhone(input: string | undefined | null): string | null {
  if (!input) return null;
  let digits = String(input).replace(/[^\d+]/g, "");
  digits = digits.replace(/^00/, ""); // 00 international prefix -> drop
  digits = digits.replace(/\+/g, ""); // strip any '+'
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/**
 * Resolve a dotted field path against a contact-like object.
 * Supports top-level fields ("name") and JSON attributes
 * ("attributes.city"). Returns "" when missing.
 */
export function resolveField(
  contact: { name: string | null; attributes: unknown },
  path: string
): string {
  if (!path) return "";
  if (path.startsWith("attributes.")) {
    const key = path.slice("attributes.".length);
    const attrs = (contact.attributes ?? {}) as Record<string, unknown>;
    const val = attrs[key];
    return val == null ? "" : String(val);
  }
  if (path === "name") return contact.name ?? "";
  return "";
}
