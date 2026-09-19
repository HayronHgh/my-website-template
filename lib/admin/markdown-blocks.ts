export function splitMarkdownBlocks(source: string) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fenceMarker = "";

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
      fenceMarker = marker[0];
    } else if (fenceMarker && marker.startsWith(fenceMarker)) {
      fenceMarker = "";
    }

    if (!fenceMarker && !line.trim()) {
      flush();
    } else {
      current.push(line);
    }
  }

  flush();
  return blocks.length ? blocks : [""];
}
