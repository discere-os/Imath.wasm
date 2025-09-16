#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Simple Imath.wasm Demo - Quick showcase of core functionality
 */

import Imath from "./src/lib/index.ts";

async function simpleDemo() {
  console.log("🧮 Imath.wasm Simple Demo");
  console.log("=" + "=".repeat(30));

  // Initialize library
  const imath = new Imath();
  await imath.initialize();

  console.log(`✅ Library: ${imath.version()}`);
  console.log(`⚡ SIMD: ${imath.simdAvailable() ? 'Enabled' : 'Disabled'}`);

  // Vector operations
  const a = { x: 3, y: 4, z: 5 };
  const b = { x: 1, y: 2, z: 2 };

  console.log(`\n📐 Vector Math:`);
  console.log(`   A = (${a.x}, ${a.y}, ${a.z})`);
  console.log(`   B = (${b.x}, ${b.y}, ${b.z})`);

  const sum = imath.vec3Add(a, b);
  const dot = imath.vec3Dot(a, b);
  const cross = imath.vec3Cross(a, b);

  console.log(`   A + B = (${sum.x}, ${sum.y}, ${sum.z})`);
  console.log(`   A · B = ${dot}`);
  console.log(`   A × B = (${cross.x}, ${cross.y}, ${cross.z})`);

  // Matrix operations
  const identity = Imath.identityMatrix44();
  const transposed = imath.matrix44Transpose(identity);

  console.log(`\n🔢 Matrix Math:`);
  console.log(`   Identity matrix created and transposed ✅`);

  // Half-float conversion
  const pi = 3.141592653589793;
  const halfBits = imath.floatToHalf(pi);
  const backToFloat = imath.halfToFloat(halfBits);

  console.log(`\n🔄 Half-Float Conversion:`);
  console.log(`   π = ${pi}`);
  console.log(`   Half-precision: ${backToFloat}`);
  console.log(`   Error: ${Math.abs(pi - backToFloat).toExponential(3)}`);

  // Quick benchmark
  console.log(`\n⚡ Performance (10K operations):`);
  const results = imath.benchmark(10000);
  for (const result of results) {
    console.log(`   ${result.operation}: ${(result.opsPerSecond / 1000).toFixed(0)}K ops/sec`);
  }

  imath.cleanup();
  console.log(`\n✨ Demo complete!`);
}

if (import.meta.main) {
  await simpleDemo();
}