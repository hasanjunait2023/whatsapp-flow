/**
 * Client-side spintax + merge-field renderer — PREVIEW ONLY.
 *
 * Mirrors the backend's render so the user can see the variation a recipient
 * gets. The real per-recipient render happens server-side in `send-bulk-reminder`.
 *
 * Supported syntax:
 *   - Spintax:      {a|b|c}        → one option picked at random
 *   - Merge fields: {first_name}, {name}, {phone}
 */

const SPINTAX_GROUP = /\{([^{}]*\|[^{}]*)\}/; // innermost group containing a pipe

export interface MergeContext {
  name?: string | null;
  phone?: string | null;
}

/** Replace innermost {a|b} groups by a random choice until none remain. */
function resolveSpintax(input: string): string {
  let text = input;
  let guard = 0;
  // Resolve from the inside out so nested groups work; cap iterations.
  while (SPINTAX_GROUP.test(text) && guard < 100) {
    text = text.replace(SPINTAX_GROUP, (_match, body: string) => {
      const options = body.split('|');
      return options[Math.floor(Math.random() * options.length)];
    });
    guard += 1;
  }
  return text;
}

/** Fill merge fields from a contact. {first_name} = first token of name. */
function fillMergeFields(input: string, ctx: MergeContext): string {
  const fullName = (ctx.name || '').trim();
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const phone = (ctx.phone || '').trim();

  return input
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{name\}/g, fullName || firstName)
    .replace(/\{phone\}/g, phone);
}

/** Render a message as one recipient would see it (preview). */
export function renderPreview(content: string, ctx: MergeContext): string {
  return fillMergeFields(resolveSpintax(content), ctx);
}

/** True if the content has at least one spintax group or merge field. */
export function hasVariation(content: string): boolean {
  return SPINTAX_GROUP.test(content) || /\{(first_name|name|phone)\}/.test(content);
}
