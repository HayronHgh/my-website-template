export type FrontmatterData = Record<string, unknown>;

export type ParsedFrontmatter = {
  content: string;
  data: FrontmatterData;
};

const FRONTMATTER_DELIMITER = "---";
const KEY_VALUE_PATTERN = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/;
const LIST_ITEM_PATTERN = /^\s+-\s*(.*)$/;
const NUMBER_PATTERN = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;

function unquoteScalar(value: string) {
  if (value.length < 2) {
    return value;
  }

  const firstCharacter = value[0];
  const lastCharacter = value.at(-1);

  if (firstCharacter === "\"" && lastCharacter === "\"") {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }

  if (firstCharacter === "'" && lastCharacter === "'") {
    return value.slice(1, -1).replaceAll("''", "'");
  }

  return value;
}

function parseInlineList(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("[") || !trimmedValue.endsWith("]")) {
    return undefined;
  }

  const innerValue = trimmedValue.slice(1, -1).trim();

  if (!innerValue) {
    return [];
  }

  return innerValue
    .split(",")
    .map((entry) => parseScalar(entry.trim()))
    .filter((entry) => entry !== "");
}

function parseScalar(value: string): unknown {
  const trimmedValue = value.trim();
  const inlineList = parseInlineList(trimmedValue);

  if (inlineList) {
    return inlineList;
  }

  if (trimmedValue === "true") {
    return true;
  }

  if (trimmedValue === "false") {
    return false;
  }

  if (trimmedValue === "null" || trimmedValue === "~") {
    return null;
  }

  if (NUMBER_PATTERN.test(trimmedValue)) {
    const parsedNumber = Number(trimmedValue);
    return Number.isFinite(parsedNumber) ? parsedNumber : trimmedValue;
  }

  return unquoteScalar(trimmedValue);
}

function parseFrontmatterData(lines: string[]) {
  const data: FrontmatterData = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const keyValueMatch = KEY_VALUE_PATTERN.exec(line);

    if (!keyValueMatch) {
      continue;
    }

    const [, key, rawValue = ""] = keyValueMatch;
    const trimmedValue = rawValue.trim();

    if (trimmedValue) {
      data[key] = parseScalar(trimmedValue);
      continue;
    }

    const listItems: unknown[] = [];

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1];
      const listItemMatch = LIST_ITEM_PATTERN.exec(nextLine);

      if (!listItemMatch) {
        break;
      }

      listItems.push(parseScalar(listItemMatch[1]));
      index += 1;
    }

    data[key] = listItems.length > 0 ? listItems : "";
  }

  return data;
}

export function parseFrontmatter(source: string): ParsedFrontmatter {
  const normalizedSource = source.replace(/^\uFEFF/, "");
  const lines = normalizedSource.split(/\r?\n/);

  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return {
      content: normalizedSource,
      data: {},
    };
  }

  const closingDelimiterIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER,
  );

  if (closingDelimiterIndex === -1) {
    return {
      content: normalizedSource,
      data: {},
    };
  }

  return {
    content: lines.slice(closingDelimiterIndex + 1).join("\n"),
    data: parseFrontmatterData(lines.slice(1, closingDelimiterIndex)),
  };
}
