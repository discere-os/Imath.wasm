#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Imath.wasm Demo - Comprehensive showcase of computer graphics math operations
 * Copyright (c) Contributors to the OpenEXR Project
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 */

import Imath from "./src/lib/index.ts";
import type { Vec3, Matrix44, Quat, EulerOrder } from "./src/lib/types.ts";

// ============================================================================
// Demo Configuration
// ============================================================================

interface DemoConfig {
  showPerformanceStats: boolean;
  runSIMDTests: boolean;
  runBenchmarks: boolean;
  benchmarkIterations: number;
}

const config: DemoConfig = {
  showPerformanceStats: true,
  runSIMDTests: true,
  runBenchmarks: true,
  benchmarkIterations: 50000
};

// ============================================================================
// Utility Functions
// ============================================================================

function printHeader(title: string): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧮 ${title}`);
  console.log(`${"=".repeat(60)}`);
}

function printSubHeader(title: string): void {
  console.log(`\n📐 ${title}`);
  console.log(`${"-".repeat(40)}`);
}

function formatNumber(num: number, precision = 6): string {
  return num.toFixed(precision).replace(/\.?0+$/, '');
}

function formatVec3(vec: Vec3): string {
  return `(${formatNumber(vec.x)}, ${formatNumber(vec.y)}, ${formatNumber(vec.z)})`;
}

function formatQuat(quat: Quat): string {
  return `(${formatNumber(quat.x)}, ${formatNumber(quat.y)}, ${formatNumber(quat.z)}, ${formatNumber(quat.w)})`;
}

// ============================================================================
// Demo Functions
// ============================================================================

async function initializeDemo(): Promise<Imath> {
  console.log("🚀 Initializing Imath.wasm...");

  const imath = new Imath({
    simdOptimizations: true,
    maxMemoryMB: 256
  });

  await imath.initialize();

  console.log(`✅ Library initialized successfully`);
  console.log(`   Version: ${imath.version()}`);
  console.log(`   SIMD Support: ${imath.simdAvailable() ? '✅ Enabled' : '❌ Not available'}`);

  return imath;
}

function demonstrateVectorOperations(imath: Imath): void {
  printSubHeader("3D Vector Operations");

  const a: Vec3 = { x: 3, y: 4, z: 5 };
  const b: Vec3 = { x: 1, y: 2, z: 2 };

  console.log(`Vector A: ${formatVec3(a)}`);
  console.log(`Vector B: ${formatVec3(b)}`);

  // Addition
  const sum = imath.vec3Add(a, b);
  console.log(`A + B = ${formatVec3(sum)}`);

  // Dot product
  const dot = imath.vec3Dot(a, b);
  console.log(`A · B = ${formatNumber(dot)}`);

  // Cross product
  const cross = imath.vec3Cross(a, b);
  console.log(`A × B = ${formatVec3(cross)}`);

  // Normalization
  const normalized = imath.vec3Normalize(a);
  const length = Math.sqrt(normalized.x ** 2 + normalized.y ** 2 + normalized.z ** 2);
  console.log(`normalize(A) = ${formatVec3(normalized)} (length: ${formatNumber(length)})`);

  // Vector utilities
  console.log(`\n📏 Vector Utilities:`);
  console.log(`   Zero vector: ${formatVec3(Imath.zeroVec3())}`);
  console.log(`   Unit X: ${formatVec3(Imath.unitVec3('x'))}`);
  console.log(`   Unit Y: ${formatVec3(Imath.unitVec3('y'))}`);
  console.log(`   Unit Z: ${formatVec3(Imath.unitVec3('z'))}`);
}

function demonstrateSIMDOperations(imath: Imath): void {
  if (!imath.simdAvailable()) {
    console.log("⚠️  SIMD operations not available on this platform");
    return;
  }

  printSubHeader("SIMD-Accelerated Batch Operations");

  // Batch vector addition
  const vectors1: Vec3[] = [
    { x: 1, y: 2, z: 3 },
    { x: 4, y: 5, z: 6 },
    { x: 7, y: 8, z: 9 },
    { x: 10, y: 11, z: 12 }
  ];

  const vectors2: Vec3[] = [
    { x: 0.5, y: 1.0, z: 1.5 },
    { x: 2.0, y: 2.5, z: 3.0 },
    { x: 3.5, y: 4.0, z: 4.5 },
    { x: 5.0, y: 5.5, z: 6.0 }
  ];

  console.log(`Processing ${vectors1.length} vectors with SIMD...`);

  const startTime = performance.now();
  const results = imath.vec3SIMDAdd(vectors1, vectors2);
  const endTime = performance.now();

  console.log(`Results (${(endTime - startTime).toFixed(3)}ms):`);
  for (let i = 0; i < results.length; i++) {
    console.log(`   [${i}]: ${formatVec3(vectors1[i])} + ${formatVec3(vectors2[i])} = ${formatVec3(results[i])}`);
  }

  // Vec4 SIMD dot product
  const vec4a = { x: 1, y: 2, z: 3, w: 4 };
  const vec4b = { x: 5, y: 6, z: 7, w: 8 };
  const dot4d = imath.vec4SIMDDot(vec4a, vec4b);
  console.log(`\n4D SIMD Dot Product: ${dot4d}`);
}

function demonstrateMatrixOperations(imath: Imath): void {
  printSubHeader("4x4 Matrix Operations");

  // Create test matrices
  const matrixA: Matrix44 = {
    elements: new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      5, 10, 15, 1  // Translation
    ])
  };

  const matrixB: Matrix44 = {
    elements: new Float32Array([
      2, 0, 0, 0,
      0, 2, 0, 0,
      0, 0, 2, 0,
      0, 0, 0, 1   // Scale by 2
    ])
  };

  console.log("Matrix A (Translation):");
  printMatrix(matrixA);
  console.log("\nMatrix B (Scale by 2):");
  printMatrix(matrixB);

  // Matrix multiplication
  const product = imath.matrix44Multiply(matrixA, matrixB);
  console.log("\nA × B (Combined Transform):");
  printMatrix(product);

  // Matrix transpose
  const transpose = imath.matrix44Transpose(matrixA);
  console.log("\nTranspose of A:");
  printMatrix(transpose);

  // Matrix inverse
  try {
    const inverse = imath.matrix44Inverse(matrixB);
    console.log("\nInverse of B:");
    printMatrix(inverse);

    // Verify inverse
    const identity = imath.matrix44Multiply(matrixB, inverse);
    console.log("\nB × B⁻¹ (Should be Identity):");
    printMatrix(identity);
  } catch (error) {
    console.log(`\nMatrix inversion failed: ${error.message}`);
  }

  // Identity matrix helper
  console.log("\nIdentity Matrix:");
  printMatrix(Imath.identityMatrix44());
}

function printMatrix(matrix: Matrix44): void {
  for (let row = 0; row < 4; row++) {
    const rowValues = [];
    for (let col = 0; col < 4; col++) {
      const value = matrix.elements[col * 4 + row]; // Column-major order
      rowValues.push(formatNumber(value, 3).padStart(8));
    }
    console.log(`   [${rowValues.join(' ')}]`);
  }
}

function demonstrateQuaternionOperations(imath: Imath): void {
  printSubHeader("Quaternion Operations");

  const q1: Quat = Imath.identityQuat(); // No rotation
  const q2: Quat = { x: 0, y: 0, z: Math.sin(Math.PI / 8), w: Math.cos(Math.PI / 8) }; // 45° around Z

  console.log(`Quaternion 1 (Identity): ${formatQuat(q1)}`);
  console.log(`Quaternion 2 (45° Z-rotation): ${formatQuat(q2)}`);

  // Spherical linear interpolation
  console.log("\nSLERP Interpolation:");
  for (let t = 0; t <= 1.0; t += 0.25) {
    const interpolated = imath.quatSlerp(q1, q2, t);
    const angle = Math.acos(interpolated.w) * 2 * (180 / Math.PI);
    console.log(`   t=${t.toFixed(2)}: ${formatQuat(interpolated)} (${formatNumber(angle, 1)}°)`);
  }

  // Quaternion normalization
  const unnormalized: Quat = { x: 1, y: 1, z: 1, w: 1 };
  const normalized = imath.quatNormalize(unnormalized);
  const length = Math.sqrt(normalized.x ** 2 + normalized.y ** 2 + normalized.z ** 2 + normalized.w ** 2);

  console.log(`\nNormalization:`);
  console.log(`   Input: ${formatQuat(unnormalized)}`);
  console.log(`   Output: ${formatQuat(normalized)} (length: ${formatNumber(length)})`);
}

function demonstrateProjectionMatrices(imath: Imath): void {
  printSubHeader("Projection Matrices");

  // Perspective projection
  const perspective = imath.perspectiveProjection({
    fovy: Math.PI / 4,  // 45°
    aspect: 16 / 9,     // 16:9
    near: 0.1,
    far: 1000.0
  });

  console.log("Perspective Projection (45° FOV, 16:9, near=0.1, far=1000):");
  printMatrix(perspective);

  // Frustum projection
  const frustum = imath.frustumProjection({
    left: -2, right: 2,
    bottom: -1.5, top: 1.5,
    near: 1.0, far: 100.0
  });

  console.log("\nFrustum Projection:");
  printMatrix(frustum);
}

function demonstrateHalfFloatConversions(imath: Imath): void {
  printSubHeader("Half-Float Precision");

  const testValues = [0.0, 1.0, -1.0, 3.141592653589793, 65504.0, 0.00006103515625];

  console.log("Float32 ↔ Half-Float Conversions:");
  console.log("Original       Half-Bits  Converted      Error");
  console.log("--------       ---------  ---------      -----");

  for (const original of testValues) {
    const halfBits = imath.floatToHalf(original);
    const converted = imath.halfToFloat(halfBits);
    const error = Math.abs(original - converted);
    const errorPercent = original !== 0 ? (error / Math.abs(original)) * 100 : 0;

    console.log(`${original.toString().padEnd(14)} ${halfBits.toString(16).padStart(4)} ${converted.toString().padEnd(14)} ${errorPercent.toFixed(4)}%`);
  }

  // Batch conversion test
  console.log("\nBatch Conversion Performance:");
  const floatArray = new Float32Array(1000);
  for (let i = 0; i < floatArray.length; i++) {
    floatArray[i] = (Math.random() - 0.5) * 1000;
  }

  const batchStart = performance.now();

  const halfArray = new Uint16Array(floatArray.length);
  for (let i = 0; i < floatArray.length; i++) {
    halfArray[i] = imath.floatToHalf(floatArray[i]);
  }

  const convertedBack = imath.halfToFloatArray(halfArray);
  const batchEnd = performance.now();

  let maxError = 0;
  for (let i = 0; i < floatArray.length; i++) {
    const error = Math.abs(floatArray[i] - convertedBack[i]);
    maxError = Math.max(maxError, error);
  }

  console.log(`   Converted ${floatArray.length} values in ${(batchEnd - batchStart).toFixed(3)}ms`);
  console.log(`   Maximum error: ${maxError.toExponential(3)}`);
}

function demonstrateRealWorldScenario(imath: Imath): void {
  printSubHeader("Real-World Graphics Pipeline Simulation");

  console.log("🎬 Animating a camera around a 3D scene...\n");

  // Scene setup
  const targetPos: Vec3 = { x: 0, y: 0, z: 0 };
  const cameraDistance = 10;
  const animationFrames = 8;

  console.log("Frame | Camera Position    | Look Direction     | Up Vector");
  console.log("------|--------------------|--------------------|--------------------");

  for (let frame = 0; frame < animationFrames; frame++) {
    const t = frame / (animationFrames - 1);
    const angle = t * Math.PI * 2; // Full rotation

    // Camera position (circular orbit)
    const cameraPos: Vec3 = {
      x: Math.cos(angle) * cameraDistance,
      y: 2 + Math.sin(t * Math.PI) * 1, // Slight vertical oscillation
      z: Math.sin(angle) * cameraDistance
    };

    // Look direction (towards target)
    const lookDir = imath.vec3Normalize({
      x: targetPos.x - cameraPos.x,
      y: targetPos.y - cameraPos.y,
      z: targetPos.z - cameraPos.z
    });

    // Up vector (world up, adjusted for camera tilt)
    const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
    const right = imath.vec3Cross(lookDir, worldUp);
    const up = imath.vec3Cross(right, lookDir);

    console.log(`  ${frame.toString().padStart(2)}  | ${formatVec3(cameraPos).padEnd(18)} | ${formatVec3(lookDir).padEnd(18)} | ${formatVec3(up)}`);
  }

  // Create view and projection matrices for final frame
  const finalCameraPos: Vec3 = { x: 10, y: 2, z: 0 };
  console.log(`\n🎥 Creating view and projection matrices for camera at ${formatVec3(finalCameraPos)}:`);

  // View matrix (simplified - normally would use lookAt)
  const viewMatrix: Matrix44 = {
    elements: new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -finalCameraPos.x, -finalCameraPos.y, -finalCameraPos.z, 1
    ])
  };

  const projectionMatrix = imath.perspectiveProjection({
    fovy: Math.PI / 3, // 60°
    aspect: 16/9,
    near: 0.1,
    far: 100.0
  });

  const viewProjection = imath.matrix44Multiply(projectionMatrix, viewMatrix);

  console.log("\nFinal View-Projection Matrix:");
  printMatrix(viewProjection);
}

async function runPerformanceBenchmarks(imath: Imath): Promise<void> {
  if (!config.runBenchmarks) return;

  printSubHeader("Performance Benchmarks");

  console.log(`🏃‍♂️ Running built-in benchmarks (${config.benchmarkIterations.toLocaleString()} iterations)...\n`);

  const results = imath.benchmark(config.benchmarkIterations);

  console.log("Operation              | Ops/Second    | Avg Time (μs) | SIMD");
  console.log("-----------------------|---------------|---------------|------");

  for (const result of results) {
    const opsPerSec = result.opsPerSecond.toLocaleString().padStart(12);
    const avgTime = result.avgTimeUs.toFixed(3).padStart(12);
    const simdStatus = result.simdAccelerated ? "  ✅ " : "  ❌ ";

    console.log(`${result.operation.padEnd(22)} | ${opsPerSec} | ${avgTime} | ${simdStatus}`);
  }

  // Calculate relative performance
  const vecOpsResult = results.find(r => r.operation.includes('Vec3'));
  const matrixResult = results.find(r => r.operation.includes('Matrix'));

  if (vecOpsResult && matrixResult) {
    const ratio = vecOpsResult.opsPerSecond / matrixResult.opsPerSecond;
    console.log(`\n📊 Vector operations are ${ratio.toFixed(1)}x faster than matrix operations`);
  }

  console.log(`\n⚡ Total benchmark time: ${results.reduce((sum, r) => sum + (r.iterations * r.avgTimeUs / 1000), 0).toFixed(1)}ms`);
}

// ============================================================================
// Main Demo Function
// ============================================================================

async function runDemo(): Promise<void> {
  try {
    printHeader("Imath.wasm - Computer Graphics Math Library Demo");

    // Initialize
    const imath = await initializeDemo();

    // Core demonstrations
    demonstrateVectorOperations(imath);

    if (config.runSIMDTests) {
      demonstrateSIMDOperations(imath);
    }

    demonstrateMatrixOperations(imath);
    demonstrateQuaternionOperations(imath);
    demonstrateProjectionMatrices(imath);
    demonstrateHalfFloatConversions(imath);
    demonstrateRealWorldScenario(imath);

    // Performance analysis
    if (config.showPerformanceStats) {
      await runPerformanceBenchmarks(imath);
    }

    // Cleanup
    console.log(`\n${"=".repeat(60)}`);
    console.log("✨ Demo completed successfully!");
    console.log("🧹 Cleaning up resources...");

    imath.cleanup();

    console.log("\n💡 Next Steps:");
    console.log("   • Run tests: deno task test");
    console.log("   • Run benchmarks: deno task bench");
    console.log("   • Build WASM: deno task build:wasm");
    console.log("   • Check out the TypeScript API in src/lib/index.ts");

  } catch (error) {
    console.error(`\n❌ Demo failed: ${error.message}`);
    if (error.stack) {
      console.error(`   ${error.stack}`);
    }
    Deno.exit(1);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

if (import.meta.main) {
  await runDemo();
}