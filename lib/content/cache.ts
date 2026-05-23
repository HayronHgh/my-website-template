import { promises as fs } from "node:fs";
import path from "node:path";

type CacheEntry<T> = {
  signature: string;
  value: T;
};

const mtimeCache = new Map<string, CacheEntry<unknown>>();

async function getFileSignature(filePath: string) {
  const stats = await fs.stat(filePath);
  return `${stats.mtimeMs}:${stats.size}`;
}

export async function getMtimeCachedValue<T>(
  key: string,
  filePath: string,
  createValue: () => Promise<T>,
) {
  const resolvedPath = path.resolve(filePath);
  const signature = await getFileSignature(resolvedPath);
  const cacheKey = `${key}:${resolvedPath}`;
  const cachedEntry = mtimeCache.get(cacheKey) as CacheEntry<T> | undefined;

  if (cachedEntry?.signature === signature) {
    return cachedEntry.value;
  }

  const value = await createValue();
  mtimeCache.set(cacheKey, { signature, value });
  return value;
}

export async function readTextFileWithMtimeCache(filePath: string) {
  return getMtimeCachedValue(`text:${path.resolve(filePath)}`, filePath, () =>
    fs.readFile(filePath, "utf8").then(stripByteOrderMark),
  );
}

export function stripByteOrderMark(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function clearContentCache() {
  mtimeCache.clear();
}
