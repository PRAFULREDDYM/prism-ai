"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findProjectRoot = findProjectRoot;
exports.resolveProjectPath = resolveProjectPath;
exports.resolveRuntimePath = resolveRuntimePath;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
let cachedRoot = null;
function hasProjectMarker(candidate) {
    return node_fs_1.default.existsSync(node_path_1.default.join(candidate, "package.json")) && node_fs_1.default.existsSync(node_path_1.default.join(candidate, "rules"));
}
function findProjectRoot(startDir = __dirname) {
    if (cachedRoot) {
        return cachedRoot;
    }
    let current = node_path_1.default.resolve(startDir);
    while (true) {
        if (hasProjectMarker(current)) {
            cachedRoot = current;
            return current;
        }
        const parent = node_path_1.default.dirname(current);
        if (parent === current) {
            throw new Error(`Unable to locate Prism project root from ${startDir}`);
        }
        current = parent;
    }
}
function resolveProjectPath(...segments) {
    return node_path_1.default.join(findProjectRoot(), ...segments);
}
function resolveRuntimePath(...segments) {
    const projectRoot = findProjectRoot();
    const candidate = node_path_1.default.join(projectRoot, ...segments);
    return node_path_1.default.resolve(candidate);
}
//# sourceMappingURL=paths.js.map