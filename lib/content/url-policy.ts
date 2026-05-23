export type MarkdownUrlKind = "link" | "image";

const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const IMAGE_PROTOCOLS = new Set(["http:", "https:"]);

function hasUnsafeRelativeSegment(value: string) {
  const pathOnly = value.split(/[?#]/, 1)[0] ?? "";

  return pathOnly
    .split(/[\\/]+/)
    .filter(Boolean)
    .some((segment) => segment === "." || segment === "..");
}

export function isSafeMarkdownUrl(value: string, kind: MarkdownUrlKind) {
  const trimmedValue = value.trim();

  if (!trimmedValue || CONTROL_CHARACTER_PATTERN.test(trimmedValue)) {
    return false;
  }

  if (kind === "link" && trimmedValue.startsWith("#")) {
    return true;
  }

  if (trimmedValue.startsWith("//")) {
    return false;
  }

  if (URL_SCHEME_PATTERN.test(trimmedValue)) {
    try {
      const protocol = new URL(trimmedValue).protocol;
      return kind === "link"
        ? LINK_PROTOCOLS.has(protocol)
        : IMAGE_PROTOCOLS.has(protocol);
    } catch {
      return false;
    }
  }

  return !hasUnsafeRelativeSegment(trimmedValue);
}

export function sanitizeMarkdownUrl(value: string, kind: MarkdownUrlKind) {
  return isSafeMarkdownUrl(value, kind) ? value.trim() : "#";
}
