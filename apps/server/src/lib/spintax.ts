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
  // Repeatedly resolve the innermost {…|…} group until none remain. Innermost
  // first (no nested braces inside) so nesting works.
  const group = /\{([^{}]*)\}/;
  let out = template;
  let guard = 0;
  while (group.test(out) && guard < 1000) {
    out = out.replace(group, (_m, body: string) => {
      if (!body.includes("|")) return `{${body}}__KEEP__`; // not a spin group (e.g. {first_name})
      const options = body.split("|");
      return options[Math.floor(rand() * options.length)] ?? "";
    });
    guard += 1;
  }
  return out.replace(/\{([^{}]*)\}__KEEP__/g, "{$1}");
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
