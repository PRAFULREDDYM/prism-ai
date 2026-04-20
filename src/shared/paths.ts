import fs from "node:fs";
import path from "node:path";

let cachedRoot: string | null = null;

function hasProjectMarker(candidate: string): boolean {
  return fs.existsSync(path.join(candidate, "package.json")) && fs.existsSync(path.join(candidate, "rules"));
}

export function findProjectRoot(startDir: string = __dirname): string {
  if (cachedRoot) {
    return cachedRoot;
  }

  let current = path.resolve(startDir);
  while (true) {
    if (hasProjectMarker(current)) {
      cachedRoot = current;
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to locate Prism project root from ${startDir}`);
    }

    current = parent;
  }
}

export function resolveProjectPath(...segments: string[]): string {
  return path.join(findProjectRoot(), ...segments);
}

export function resolveRuntimePath(...segments: string[]): string {
  const projectRoot = findProjectRoot();
  const candidate = path.join(projectRoot, ...segments);
  return path.resolve(candidate);
}
