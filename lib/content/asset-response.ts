import { createReadStream } from "node:fs";
import type { Stats } from "node:fs";
import { Readable } from "node:stream";

type AssetResponseOptions = {
  cacheControl: string;
  contentType: string;
  filePath: string;
  request: Request;
  stats: Stats;
};

type ByteRange = {
  end: number;
  start: number;
};

function parseByteRange(value: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());

  if (!match || (!match[1] && !match[2]) || size < 1) {
    return null;
  }

  if (!match[1]) {
    const suffixLength = Number(match[2]);

    if (!Number.isSafeInteger(suffixLength) || suffixLength < 1) {
      return null;
    }

    return {
      end: size - 1,
      start: Math.max(0, size - suffixLength),
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return null;
  }

  return {
    end: Math.min(requestedEnd, size - 1),
    start,
  };
}

export function createAssetFileResponse({
  cacheControl,
  contentType,
  filePath,
  request,
  stats,
}: AssetResponseOptions) {
  const rangeHeader = request.headers.get("range");
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    "Content-Type": contentType,
    "Last-Modified": stats.mtime.toUTCString(),
  });

  if (rangeHeader) {
    const range = parseByteRange(rangeHeader, stats.size);

    if (!range) {
      headers.set("Content-Range", `bytes */${stats.size}`);
      return new Response(null, { headers, status: 416 });
    }

    const contentLength = range.end - range.start + 1;
    headers.set("Content-Length", String(contentLength));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${stats.size}`);
    const stream = Readable.toWeb(
      createReadStream(filePath, { end: range.end, start: range.start }),
    ) as ReadableStream<Uint8Array>;

    return new Response(stream, { headers, status: 206 });
  }

  headers.set("Content-Length", String(stats.size));
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new Response(stream, { headers });
}
