export function splitMarkdownBlocks(source: string) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fenceMarker = "";
  let math = false;

  const flush = () => {
    const value = current.join("\n");

    if (value.trim()) {
      blocks.push(value);
    }

    current = [];
  };

  for (const line of lines) {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1] ?? "";

    if (!fenceMarker && marker) {
      fenceMarker = marker;
    } else if (fenceMarker && marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length && /^\s*(`+|~+)\s*$/.test(line)) {
      fenceMarker = "";
    }

    if (!fenceMarker && /^\s*\$\$\s*$/.test(line)) math = !math;

    if (!fenceMarker && !math && !line.trim()) {
      flush();
    } else {
      current.push(line);
    }
  }

  flush();
  return blocks.length ? blocks : [""];
}
