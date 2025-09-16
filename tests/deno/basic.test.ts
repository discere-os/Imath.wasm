import { assert, assertEquals, assertExists, assertThrows } from "@std/assert";
import Imath from "../../src/lib/index.ts";
import type { Vec3, Matrix44, Quat } from "../../src/lib/types.ts";

// Helper for floating-point comparison
function assertApproxEquals(actual: number, expected: number, epsilon = 1e-6) {
  assert(Math.abs(actual - expected) < epsilon,
    `Expected ${actual} to be approximately ${expected} (±${epsilon})`)
}

Deno.test("Imath initialization", async () => {
  const imath = new Imath();
  await imath.initialize();

  assertExists(imath);
  assert(imath.isInitialized());

  // Check version
  const version = imath.version();
  assertExists(version);
  assert(version.includes("3.2.0"));

  imath.cleanup();
});

Deno.test("SIMD availability detection", async () => {
  const imath = new Imath({ simdOptimizations: true });
  await imath.initialize();

  const simdSupported = imath.simdAvailable();
  console.log(`SIMD Support: ${simdSupported ? 'Available' : 'Not available'}`);

  // SIMD availability is platform dependent, just ensure function works
  assert(typeof simdSupported === 'boolean');

  imath.cleanup();
});

Deno.test("Vec3 basic operations", async () => {
  const imath = new Imath();
  await imath.initialize();

  const a: Vec3 = { x: 1, y: 2, z: 3 };
  const b: Vec3 = { x: 4, y: 5, z: 6 };

  // Addition
  const sum = imath.vec3Add(a, b);
  assertEquals(sum.x, 5);
  assertEquals(sum.y, 7);
  assertEquals(sum.z, 9);

  // Dot product
  const dot = imath.vec3Dot(a, b);
  assertEquals(dot, 32); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32

  // Cross product
  const cross = imath.vec3Cross(a, b);
  assertEquals(cross.x, -3); // 2*6 - 3*5 = 12 - 15 = -3
  assertEquals(cross.y, 6);  // 3*4 - 1*6 = 12 - 6 = 6
  assertEquals(cross.z, -3); // 1*5 - 2*4 = 5 - 8 = -3

  // Normalize
  const normalized = imath.vec3Normalize({ x: 3, y: 4, z: 0 });
  const length = Math.sqrt(normalized.x * normalized.x + normalized.y * normalized.y + normalized.z * normalized.z);
  assert(Math.abs(length - 1.0) < 1e-6); // Should be unit length

  imath.cleanup();
});

Deno.test("Matrix44 operations", async () => {
  const imath = new Imath();
  await imath.initialize();

  // Create identity matrices
  const identity = Imath.identityMatrix44();
  const identityResult = imath.matrix44Multiply(identity, identity);

  // Should still be identity
  for (let i = 0; i < 16; i++) {
    const expected = (i % 5 === 0) ? 1.0 : 0.0; // Diagonal elements are 1
    assert(Math.abs(identityResult.elements[i] - expected) < 1e-6);
  }

  // Test transpose
  const testMatrix: Matrix44 = {
    elements: new Float32Array([
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16
    ])
  };

  const transposed = imath.matrix44Transpose(testMatrix);

  // Check transpose is correct
  assertEquals(transposed.elements[0], 1);  // (0,0) -> (0,0)
  assertEquals(transposed.elements[4], 2);  // (0,1) -> (1,0)
  assertEquals(transposed.elements[8], 3);  // (0,2) -> (2,0)
  assertEquals(transposed.elements[1], 5);  // (1,0) -> (0,1)

  // Test matrix inversion
  const simpleMatrix: Matrix44 = {
    elements: new Float32Array([
      2, 0, 0, 0,
      0, 3, 0, 0,
      0, 0, 4, 0,
      0, 0, 0, 1
    ])
  };

  const inverse = imath.matrix44Inverse(simpleMatrix);
  assertEquals(inverse.elements[0], 0.5);   // 1/2
  assertApproxEquals(inverse.elements[5], 1/3);   // 1/3
  assertEquals(inverse.elements[10], 0.25); // 1/4
  assertEquals(inverse.elements[15], 1);    // 1/1

  imath.cleanup();
});

Deno.test("Quaternion operations", async () => {
  const imath = new Imath();
  await imath.initialize();

  const q1: Quat = { x: 0, y: 0, z: 0, w: 1 }; // Identity quaternion
  const q2: Quat = { x: 0, y: 0, z: Math.sqrt(0.5), w: Math.sqrt(0.5) }; // 90° rotation around Z

  // Test SLERP at midpoint
  const interpolated = imath.quatSlerp(q1, q2, 0.5);

  // At t=0.5, should be 45° rotation around Z
  assert(Math.abs(interpolated.x) < 1e-6);
  assert(Math.abs(interpolated.y) < 1e-6);
  assert(Math.abs(interpolated.z - 0.382683) < 1e-5); // sin(22.5°)
  assert(Math.abs(interpolated.w - 0.923880) < 1e-5); // cos(22.5°)

  // Test normalization
  const unnormalized: Quat = { x: 1, y: 1, z: 1, w: 1 };
  const normalized = imath.quatNormalize(unnormalized);

  const length = Math.sqrt(normalized.x * normalized.x + normalized.y * normalized.y +
                          normalized.z * normalized.z + normalized.w * normalized.w);
  assert(Math.abs(length - 1.0) < 1e-6);

  imath.cleanup();
});

Deno.test("Half-float conversions", async () => {
  const imath = new Imath();
  await imath.initialize();

  // Test basic conversion
  const originalFloat = 3.141592653589793;
  const halfBits = imath.floatToHalf(originalFloat);
  const convertedFloat = imath.halfToFloat(halfBits);

  // Half precision should preserve ~3-4 decimal places
  assert(Math.abs(originalFloat - convertedFloat) < 0.001);

  // Test array conversion
  const floatArray = new Float32Array([1.0, 2.5, -3.14, 0.5, 100.25]);
  const halfArray = new Uint16Array(floatArray.length);

  // Convert to half
  for (let i = 0; i < floatArray.length; i++) {
    halfArray[i] = imath.floatToHalf(floatArray[i]);
  }

  // Convert back to float
  const roundTripArray = imath.halfToFloatArray(halfArray);

  // Check round-trip conversion
  for (let i = 0; i < floatArray.length; i++) {
    assert(Math.abs(floatArray[i] - roundTripArray[i]) < 0.001);
  }

  imath.cleanup();
});

Deno.test("Projection matrices", async () => {
  const imath = new Imath();
  await imath.initialize();

  // Test perspective projection
  const perspective = imath.perspectiveProjection({
    fovy: Math.PI / 4, // 45 degrees
    aspect: 16/9,      // 16:9 aspect ratio
    near: 0.1,
    far: 100.0
  });

  // Verify it's a valid projection matrix
  assertExists(perspective.elements);
  assertEquals(perspective.elements.length, 16);

  // Check some properties of perspective matrix
  assert(perspective.elements[15] === 0); // Should be 0 for perspective
  assert(perspective.elements[11] === -1); // Should be -1

  // Test frustum projection
  const frustum = imath.frustumProjection({
    left: -1, right: 1,
    bottom: -1, top: 1,
    near: 0.1, far: 100.0
  });

  assertExists(frustum.elements);
  assertEquals(frustum.elements.length, 16);

  imath.cleanup();
});

Deno.test("SIMD vector operations", async () => {
  const imath = new Imath({ simdOptimizations: true });
  await imath.initialize();

  // Only test SIMD if available
  if (!imath.simdAvailable()) {
    console.log("Skipping SIMD tests - not supported");
    imath.cleanup();
    return;
  }

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

  const results = imath.vec3SIMDAdd(vectors1, vectors2);

  assertEquals(results.length, 4);
  assertEquals(results[0].x, 2); assertEquals(results[0].y, 3); assertEquals(results[0].z, 4);
  assertEquals(results[1].x, 6); assertEquals(results[1].y, 7); assertEquals(results[1].z, 8);
  assertEquals(results[2].x, 10); assertEquals(results[2].y, 11); assertEquals(results[2].z, 12);
  assertEquals(results[3].x, 14); assertEquals(results[3].y, 15); assertEquals(results[3].z, 16);

  // Test Vec4 SIMD dot product
  const vec4a = { x: 1, y: 2, z: 3, w: 4 };
  const vec4b = { x: 5, y: 6, z: 7, w: 8 };
  const dot4d = imath.vec4SIMDDot(vec4a, vec4b);
  assertEquals(dot4d, 70); // 1*5 + 2*6 + 3*7 + 4*8 = 5 + 12 + 21 + 32 = 70

  imath.cleanup();
});

Deno.test("Error handling", async () => {
  const imath = new Imath();

  // Test calling functions before initialization
  assertThrows(() => {
    imath.vec3Add({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
  });

  await imath.initialize();

  // Test invalid input types
  assertThrows(() => {
    imath.vec3Add({ x: 1, y: 2 } as any, { x: 4, y: 5, z: 6 });
  });

  assertThrows(() => {
    imath.matrix44Inverse({ elements: new Float32Array(8) } as any); // Wrong size
  });

  // Test non-invertible matrix
  const singularMatrix: Matrix44 = {
    elements: new Float32Array([
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 1
    ])
  };

  assertThrows(() => {
    imath.matrix44Inverse(singularMatrix);
  });

  imath.cleanup();
});

Deno.test("Utility functions", async () => {
  // Test static helper functions
  const identity = Imath.identityMatrix44();
  assertEquals(identity.elements[0], 1);
  assertEquals(identity.elements[5], 1);
  assertEquals(identity.elements[10], 1);
  assertEquals(identity.elements[15], 1);

  const zero = Imath.zeroVec3();
  assertEquals(zero.x, 0);
  assertEquals(zero.y, 0);
  assertEquals(zero.z, 0);

  const unitX = Imath.unitVec3('x');
  assertEquals(unitX.x, 1);
  assertEquals(unitX.y, 0);
  assertEquals(unitX.z, 0);

  const identityQuat = Imath.identityQuat();
  assertEquals(identityQuat.x, 0);
  assertEquals(identityQuat.y, 0);
  assertEquals(identityQuat.z, 0);
  assertEquals(identityQuat.w, 1);
});

Deno.test("Memory management", async () => {
  const imath = new Imath();
  await imath.initialize();

  // Test that multiple operations don't leak memory
  for (let i = 0; i < 1000; i++) {
    const a = { x: Math.random(), y: Math.random(), z: Math.random() };
    const b = { x: Math.random(), y: Math.random(), z: Math.random() };

    const result = imath.vec3Add(a, b);
    assert(typeof result.x === 'number');
    assert(typeof result.y === 'number');
    assert(typeof result.z === 'number');
  }

  imath.cleanup();
  assert(!imath.isInitialized());
});