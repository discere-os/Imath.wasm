#!/usr/bin/env -S deno run --allow-all

/**
 * NPM package builder for Imath.wasm
 * Creates NPM-compatible package from Deno project
 */

import { emptyDir, ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { resolve } from "https://deno.land/std@0.208.0/path/mod.ts";

const PKG_VERSION = "3.2.0";

interface PackageJson {
  name: string;
  version: string;
  description: string;
  main: string;
  module: string;
  types: string;
  files: string[];
  scripts: {[key: string]: string};
  keywords: string[];
  author: string;
  license: string;
  homepage: string;
  repository: {
    type: string;
    url: string;
  };
  bugs: {
    url: string;
  };
  engines: {
    node: string;
  };
  exports: {
    ".": {
      import: string;
      require: string;
      types: string;
    };
    "./types": {
      import: string;
      require: string;
      types: string;
    };
  };
}

async function buildNpmPackage() {
  console.log("🏗️  Building NPM package for Imath.wasm...");

  const srcRoot = resolve("./");
  const npmDir = resolve("./npm");

  // Clean and create npm directory
  await emptyDir(npmDir);
  await ensureDir(npmDir);

  // Copy source files
  await copyDirContents(resolve(srcRoot, "src"), resolve(npmDir, "src"));

  // Copy WASM artifacts if they exist
  const installDir = resolve(srcRoot, "install");
  if (await exists(installDir)) {
    await copyDirContents(installDir, resolve(npmDir, "install"));
  }

  // Copy documentation
  const filesToCopy = [
    "README.md",
    "LICENSE.md",
    "CHANGES.md"
  ];

  for (const file of filesToCopy) {
    const srcFile = resolve(srcRoot, file);
    if (await exists(srcFile)) {
      const content = await Deno.readTextFile(srcFile);
      await Deno.writeTextFile(resolve(npmDir, file), content);
    }
  }

  // Create package.json
  const packageJson: PackageJson = {
    name: "@discere-os/Imath.wasm",
    version: PKG_VERSION,
    description: "WebAssembly port of Imath (computer graphics math library) with SIMD optimization",
    main: "dist/index.js",
    module: "dist/index.mjs",
    types: "dist/index.d.ts",
    files: [
      "dist/",
      "install/",
      "src/",
      "README.md",
      "LICENSE.md",
      "CHANGES.md"
    ],
    scripts: {
      "build": "echo 'Built from Deno project'",
      "test": "echo 'Tests run in Deno environment'"
    },
    keywords: [
      "webassembly",
      "wasm",
      "graphics",
      "math",
      "simd",
      "computer-graphics",
      "linear-algebra",
      "matrix",
      "vector",
      "quaternion",
      "imath",
      "openexr",
      "half-float",
      "3d",
      "animation"
    ],
    author: "Discere OS <contact@discere.cloud>",
    license: "BSD-3-Clause",
    homepage: "https://github.com/discere-os/Imath.wasm",
    repository: {
      type: "git",
      url: "git+https://github.com/discere-os/Imath.wasm.git"
    },
    bugs: {
      url: "https://github.com/discere-os/Imath.wasm/issues"
    },
    engines: {
      node: ">=16.0.0"
    },
    exports: {
      ".": {
        import: "./dist/index.mjs",
        require: "./dist/index.js",
        types: "./dist/index.d.ts"
      },
      "./types": {
        import: "./dist/types.mjs",
        require: "./dist/types.js",
        types: "./dist/types.d.ts"
      }
    }
  };

  await Deno.writeTextFile(
    resolve(npmDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // Create simple dist files (placeholder - normally would use a bundler)
  await ensureDir(resolve(npmDir, "dist"));

  const indexJs = `
// NPM compatibility layer for Imath.wasm
const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// Node.js polyfills for browser APIs
if (typeof globalThis.fetch === 'undefined') {
  console.warn('Imath.wasm: fetch polyfill may be required in Node.js environments');
}

// Export the main module
module.exports = require('../src/lib/index.ts');
`;

  const indexMjs = `
// ES module wrapper for Imath.wasm
import Imath from '../src/lib/index.ts';
export default Imath;
export * from '../src/lib/types.ts';
`;

  const indexDts = `
// TypeScript definitions for NPM package
export { default as default } from '../src/lib/index';
export * from '../src/lib/types';
`;

  await Deno.writeTextFile(resolve(npmDir, "dist/index.js"), indexJs.trim());
  await Deno.writeTextFile(resolve(npmDir, "dist/index.mjs"), indexMjs.trim());
  await Deno.writeTextFile(resolve(npmDir, "dist/index.d.ts"), indexDts.trim());

  // Copy types
  const typesSrc = await Deno.readTextFile(resolve(srcRoot, "src/lib/types.ts"));
  await Deno.writeTextFile(resolve(npmDir, "dist/types.js"), "// See types.ts");
  await Deno.writeTextFile(resolve(npmDir, "dist/types.mjs"), "// See types.ts");
  await Deno.writeTextFile(resolve(npmDir, "dist/types.d.ts"), typesSrc);

  console.log("✅ NPM package created successfully!");
  console.log(`📦 Package location: ${npmDir}`);
  console.log(`🚀 Ready to publish: cd npm && npm publish`);
}

// Utility functions
async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function copyDirContents(src: string, dest: string): Promise<void> {
  if (!(await exists(src))) return;

  await ensureDir(dest);

  for await (const entry of Deno.readDir(src)) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);

    if (entry.isDirectory) {
      await copyDirContents(srcPath, destPath);
    } else {
      const content = await Deno.readFile(srcPath);
      await Deno.writeFile(destPath, content);
    }
  }
}

if (import.meta.main) {
  await buildNpmPackage();
}