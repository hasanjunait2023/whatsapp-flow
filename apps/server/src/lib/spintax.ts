/**
 * Spintax + personalization for outbound campaigns. WhatsApp content-hashes
 * messages: identical text to many recipients is a spam signal that gets numbers
 * banned. Rendering a unique variant per recipient (spintax + merge fields)
 * breaks that fingerprint. Zero-dependency.
 *
 *   "{Hi|Hello|Hey} {first_name}, ..." → "Hello Rahim, ..."
 */

/** Resolves {a|b|c} groups, picking one option each. Supports nesting. */
export function renderSpintax(template: string, rand: () => number = Math.random): string {
  // Only match innermost groups that contain a pipe — that's what makes them a
  // spin group. Merge fields like {first_name} have no pipe and are left intact
  // for personalize(). Innermost-first (no braces inside) so nesting resolves.
  const group = /\{([^{}]*\|[^{}]*)\}/;
  let out = template;
  let guard = 0;
  while (group.test(out) && guard < 1000) {
    out = out.replace(group, (_m, body: string) => {
      const options = body.split("|");
      return options[Math.floor(rand() * options.length)] ?? "";
    });
    guard += 1;
  }
  return out;
}

export interface PersonalizeFields {
  name?: string | null;
  phone_number?: string | null;
}

/**
 * Replaces merge fields with contact values. {first_name} → first token of name,
 * {name} → full name, {phone} → number. Missing name falls back to "there" for
 * first_name so a message never reads "Hi ,".
 */
export function personalize(template: string, contact: PersonalizeFields): string {
  const fullName = (contact.name ?? "").trim();
  const firstName = fullName.split(/\s+/)[0] || "there";
  return template
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{name\}/gi, fullName || firstName)
    .replace(/\{phone\}/gi, contact.phone_number ?? "");
}

/** Render spintax then fill merge fields — the full per-recipient transform. */
export function renderMessage(
  template: string,
  contact: PersonalizeFields,
  rand: () => number = Math.random,
): string {
  return personalize(renderSpintax(template, rand), contact);
}

/** True if the template has any variability (spin group or merge field). */
export function hasVariation(template: string): boolean {
  return /\{[^{}]*\|[^{}]*\}/.test(template) || /\{(first_name|name|phone)\}/i.test(template);
}
