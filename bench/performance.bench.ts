import Imath from "../src/lib/index.ts";
import type { Vec3, Matrix44 } from "../src/lib/types.ts";

// Type declaration for benchmark results
declare global {
  var benchmarkResult: any;
}

let imath: Imath;
let simdImath: Imath;

// Setup before benchmarks
await (async () => {
  console.log("Setting up Imath benchmarks...");

  imath = new Imath({ simdOptimizations: false });
  await imath.initialize();

  simdImath = new Imath({ simdOptimizations: true });
  await simdImath.initialize();

  console.log(`SIMD Support: ${simdImath.simdAvailable() ? 'Available' : 'Not available'}`);
  console.log(`Library Version: ${imath.version()}`);
})();

// ============================================================================
// Vector Operations Benchmarks
// ============================================================================

Deno.bench("Vec3 Addition - Scalar", () => {
  const a: Vec3 = { x: 1.5, y: 2.7, z: 3.14 };
  const b: Vec3 = { x: 4.2, y: 5.8, z: 6.9 };

  const result = imath.vec3Add(a, b);
  // Prevent optimization
  globalThis.benchmarkResult = result;
});

Deno.bench("Vec3 Addition - SIMD (if available)", () => {
  const a: Vec3 = { x: 1.5, y: 2.7, z: 3.14 };
  const b: Vec3 = { x: 4.2, y: 5.8, z: 6.9 };

  const result = simdImath.vec3Add(a, b);
  globalThis.benchmarkResult = result;
});

Deno.bench("Vec3 Dot Product", () => {
  const a: Vec3 = { x: 1.5, y: 2.7, z: 3.14 };
  const b: Vec3 = { x: 4.2, y: 5.8, z: 6.9 };

  const result = imath.vec3Dot(a, b);
  globalThis.benchmarkResult = result;
});

Deno.bench("Vec3 Cross Product", () => {
  const a: Vec3 = { x: 1.5, y: 2.7, z: 3.14 };
  const b: Vec3 = { x: 4.2, y: 5.8, z: 6.9 };

  const result = imath.vec3Cross(a, b);
  globalThis.benchmarkResult = result;
});

Deno.bench("Vec3 Normalize", () => {
  const vec: Vec3 = { x: 3.0, y: 4.0, z: 5.0 };

  const result = imath.vec3Normalize(vec);
  globalThis.benchmarkResult = result;
});

Deno.bench("Vec3 SIMD Batch Addition (4 vectors)", () => {
  if (!simdImath.simdAvailable()) return;

  const vectors1: Vec3[] = [
    { x: 1, y: 2, z: 3 },
    { x: 4, y: 5, z: 6 },
    { x: 7, y: 8, z: 9 },
    { x: 10, y: 11, z: 12 }
  ];

  const vectors2: Vec3[] = [
    { x: 1, y: 1, z: 1 },
    { x: 2, y: 2, z: 2 },
    { x: 3, y: 3, z: 3 },
    { x: 4, y: 4, z: 4 }
  ];

  const result = simdImath.vec3SIMDAdd(vectors1, vectors2);
  globalThis.benchmarkResult = result;
});

Deno.bench("Vec4 SIMD Dot Product", () => {
  if (!simdImath.simdAvailable()) return;

  const a = { x: 1.5, y: 2.7, z: 3.14, w: 4.9 };
  const b = { x: 4.2, y: 5.8, z: 6.9, w: 7.1 };

  const result = simdImath.vec4SIMDDot(a, b);
  globalThis.benchmarkResult = result;
});

// ============================================================================
// Matrix Operations Benchmarks
// ============================================================================

Deno.bench("Matrix44 Multiply - Standard", () => {
  const a: Matrix44 = {
    elements: new Float32Array([
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16
    ])
  };

  const b: Matrix44 = {
    elements: new Float32Array([
      16, 15, 14, 13,
      12, 11, 10, 9,
      8, 7, 6, 5,
      4, 3, 2, 1
    ])
  };

  const result = imath.matrix44Multiply(a, b);
  globalThis.benchmarkResult = result;
});

Deno.bench("Matrix44 Multiply - SIMD", () => {
  const a: Matrix44 = {
    elements: new Float32Array([
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16
    ])
  };

  const b: Matrix44 = {
    elements: new Float32Array([
      16, 15, 14, 13,
      12, 11, 10, 9,
      8, 7, 6, 5,
      4, 3, 2, 1
    ])
  };

  const result = simdImath.matrix44Multiply(a, b);
  globalThis.benchmarkResult = result;
});

Deno.bench("Matrix44 Transpose", () => {
  const matrix: Matrix44 = {
    elements: new Float32Array([
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16
    ])
  };

  const result = imath.matrix44Transpose(matrix);
  globalThis.benchmarkResult = result;
});

Deno.bench("Matrix44 Inverse", () => {
  // Use a well-conditioned matrix for stable benchmarking
  const matrix: Matrix44 = {
    elements: new Float32Array([
      4, 0, 0, 0,
      0, 3, 0, 0,
      0, 0, 2, 0,
      1, 2, 3, 1
    ])
  };

  const result = imath.matrix44Inverse(matrix);
  globalThis.benchmarkResult = result;
});

// ============================================================================
// Quaternion Benchmarks
// ============================================================================

Deno.bench("Quaternion SLERP", () => {
  const q1 = { x: 0, y: 0, z: 0, w: 1 };
  const q2 = { x: 0, y: 0, z: 0.707, w: 0.707 };

  const result = imath.quatSlerp(q1, q2, 0.5);
  globalThis.benchmarkResult = result;
});

Deno.bench("Quaternion Normalize", () => {
  const quat = { x: 1.2, y: 2.3, z: 3.4, w: 4.5 };

  const result = imath.quatNormalize(quat);
  globalThis.benchmarkResult = result;
});

// ============================================================================
// Half-Float Conversion Benchmarks
// ============================================================================

Deno.bench("Single Half-Float Conversion", () => {
  const floatValue = 3.141592653589793;

  const halfBits = imath.floatToHalf(floatValue);
  const backToFloat = imath.halfToFloat(halfBits);

  globalThis.benchmarkResult = backToFloat;
});

Deno.bench("Half-Float Array Conversion (1000 elements)", () => {
  const halfArray = new Uint16Array(1000);

  // Fill with test data
  for (let i = 0; i < 1000; i++) {
    halfArray[i] = imath.floatToHalf(Math.random() * 100);
  }

  const result = imath.halfToFloatArray(halfArray);
  globalThis.benchmarkResult = result;
});

// ============================================================================
// Projection Matrix Benchmarks
// ============================================================================

Deno.bench("Perspective Projection Matrix", () => {
  const result = imath.perspectiveProjection({
    fovy: Math.PI / 4,  // 45 degrees
    aspect: 16/9,       // 16:9 aspect ratio
    near: 0.1,
    far: 1000.0
  });

  globalThis.benchmarkResult = result;
});

Deno.bench("Frustum Projection Matrix", () => {
  const result = imath.frustumProjection({
    left: -1, right: 1,
    bottom: -1, top: 1,
    near: 0.1, far: 1000.0
  });

  globalThis.benchmarkResult = result;
});

// ============================================================================
// Complex Operations Benchmarks
// ============================================================================

Deno.bench("Complex Graphics Pipeline Simulation", () => {
  // Simulate typical graphics pipeline operations
  const vertex: Vec3 = { x: 1.0, y: 2.0, z: 3.0 };
  const transform: Matrix44 = {
    elements: new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      10, 20, 30, 1
    ])
  };

  // Multiple operations in sequence
  let result = imath.vec3Normalize(vertex);
  result = imath.vec3Add(result, { x: 0.1, y: 0.2, z: 0.3 });

  const projection = imath.perspectiveProjection({
    fovy: Math.PI / 3,
    aspect: 1.777,
    near: 0.1,
    far: 100
  });

  const combined = imath.matrix44Multiply(projection, transform);

  globalThis.benchmarkResult = { vertex: result, matrix: combined };
});

// ============================================================================
// Built-in Benchmark Suite
// ============================================================================

Deno.bench("Built-in Benchmark Suite (10000 iterations)", async () => {
  const results = imath.benchmark(10000);

  console.log("\n📊 Built-in Performance Results:");
  for (const result of results) {
    console.log(`  ${result.operation}: ${result.opsPerSecond.toLocaleString()} ops/sec (${result.avgTimeUs.toFixed(2)}μs avg) [SIMD: ${result.simdAccelerated}]`);
  }

  globalThis.benchmarkResult = results;
});

// ============================================================================
// Cleanup
// ============================================================================

globalThis.addEventListener("unload", () => {
  if (imath?.isInitialized()) {
    imath.cleanup();
  }
  if (simdImath?.isInitialized()) {
    simdImath.cleanup();
  }
});