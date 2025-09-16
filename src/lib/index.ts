/**
 * WebAssembly port of Imath (computer graphics math library) with SIMD optimization
 * Copyright (c) Contributors to the OpenEXR Project
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 */

import {
  type ImathOptions,
  type ImathModuleFunctions,
  type Vec3,
  type Vec4,
  type Matrix44,
  type Quat,
  type Euler,
  type Box3,
  type Color3,
  type BenchmarkResult,
  type FrustumParams,
  type PerspectiveParams,
  type RandomOptions,
  EulerOrder,
  ImathError,
  MatrixError,
  SIMDError,
  isVec3,
  isMatrix44,
  isQuat
} from './types.ts';

/**
 * High-performance WebAssembly port of Imath with SIMD optimizations
 *
 * Features:
 * - SIMD-accelerated vector and matrix operations
 * - Half-float precision support for graphics workflows
 * - Comprehensive 3D math library (vectors, matrices, quaternions, euler angles)
 * - Optimized for real-time graphics and animation
 */
export default class Imath {
  private module: ImathModuleFunctions | null = null;
  private initialized = false;
  private simdSupported = false;

  constructor(private options: ImathOptions = {}) {
    this.options = {
      simdOptimizations: true,
      maxMemoryMB: 128,
      webgpuAcceleration: false,
      ...options
    };
  }

  /**
   * Initialize the Imath WASM module
   * Must be called before using any math operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const wasmBinary = await this.loadWasmBinary();
    const moduleFactory = await this.loadModuleFactory();

    this.module = await moduleFactory({
      wasmBinary,
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return new URL('../../install/wasm/' + path, import.meta.url).href;
        }
        return path;
      }
    });

    this.simdSupported = this.module!._imath_simd_available();
    this.initialized = true;
  }

  private async loadWasmBinary(): Promise<ArrayBuffer> {
    if (typeof globalThis.Deno !== 'undefined') {
      const wasmPath = new URL('../../install/wasm/Imath-main.wasm', import.meta.url).pathname;
      const wasmBuffer = await Deno.readFile(wasmPath);
      return wasmBuffer.buffer;
    }

    // Browser/CDN loading
    const response = await fetch('https://wasm.discere.cloud/npm/@discere-os/Imath.wasm/main.wasm');
    if (!response.ok) throw new ImathError(`Failed to load WASM: ${response.statusText}`);
    return await response.arrayBuffer();
  }

  private async loadModuleFactory(): Promise<any> {
    const modulePath = new URL('../../install/wasm/Imath-main.js', import.meta.url).href;
    const module = await import(modulePath);
    return module.default || module.ImathModule;
  }

  private checkInitialized(): void {
    if (!this.initialized || !this.module) {
      throw new ImathError('Module not initialized. Call initialize() first.');
    }
  }

  // ============================================================================
  // Vector Operations
  // ============================================================================

  /**
   * Add two 3D vectors
   * @param a First vector
   * @param b Second vector
   * @returns Sum of vectors a and b
   */
  vec3Add(a: Vec3, b: Vec3): Vec3 {
    this.checkInitialized();
    if (!isVec3(a) || !isVec3(b)) throw new ImathError('Invalid Vec3 input');

    const aPtr = this.module!._malloc(12); // 3 floats
    const bPtr = this.module!._malloc(12);
    const resultPtr = this.module!._malloc(12);

    try {
      // Copy input data
      this.module!.HEAPF32.set([a.x, a.y, a.z], aPtr / 4);
      this.module!.HEAPF32.set([b.x, b.y, b.z], bPtr / 4);

      // Call WASM function
      this.module!._imath_vec3_add(aPtr, bPtr, resultPtr);

      // Read result
      const result = this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 3);
      return { x: result[0], y: result[1], z: result[2] };
    } finally {
      this.module!._free(aPtr);
      this.module!._free(bPtr);
      this.module!._free(resultPtr);
    }
  }

  /**
   * Calculate dot product of two 3D vectors
   * @param a First vector
   * @param b Second vector
   * @returns Dot product value
   */
  vec3Dot(a: Vec3, b: Vec3): number {
    this.checkInitialized();
    if (!isVec3(a) || !isVec3(b)) throw new ImathError('Invalid Vec3 input');

    const aPtr = this.module!._malloc(12);
    const bPtr = this.module!._malloc(12);

    try {
      this.module!.HEAPF32.set([a.x, a.y, a.z], aPtr / 4);
      this.module!.HEAPF32.set([b.x, b.y, b.z], bPtr / 4);

      return this.module!._imath_vec3_dot(aPtr, bPtr);
    } finally {
      this.module!._free(aPtr);
      this.module!._free(bPtr);
    }
  }

  /**
   * Calculate cross product of two 3D vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cross product vector
   */
  vec3Cross(a: Vec3, b: Vec3): Vec3 {
    this.checkInitialized();
    if (!isVec3(a) || !isVec3(b)) throw new ImathError('Invalid Vec3 input');

    const aPtr = this.module!._malloc(12);
    const bPtr = this.module!._malloc(12);
    const resultPtr = this.module!._malloc(12);

    try {
      this.module!.HEAPF32.set([a.x, a.y, a.z], aPtr / 4);
      this.module!.HEAPF32.set([b.x, b.y, b.z], bPtr / 4);

      this.module!._imath_vec3_cross(aPtr, bPtr, resultPtr);

      const result = this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 3);
      return { x: result[0], y: result[1], z: result[2] };
    } finally {
      this.module!._free(aPtr);
      this.module!._free(bPtr);
      this.module!._free(resultPtr);
    }
  }

  /**
   * Normalize a 3D vector (make unit length)
   * @param vec Vector to normalize
   * @returns Normalized vector
   */
  vec3Normalize(vec: Vec3): Vec3 {
    this.checkInitialized();
    if (!isVec3(vec)) throw new ImathError('Invalid Vec3 input');

    const vecPtr = this.module!._malloc(12);

    try {
      this.module!.HEAPF32.set([vec.x, vec.y, vec.z], vecPtr / 4);
      this.module!._imath_vec3_normalize(vecPtr);

      const result = this.module!.HEAPF32.subarray(vecPtr / 4, vecPtr / 4 + 3);
      return { x: result[0], y: result[1], z: result[2] };
    } finally {
      this.module!._free(vecPtr);
    }
  }

  /**
   * SIMD-accelerated batch vector addition
   * Processes multiple vectors simultaneously for higher performance
   * @param vectors1 First array of vectors
   * @param vectors2 Second array of vectors
   * @returns Array of sum vectors
   */
  vec3SIMDAdd(vectors1: Vec3[], vectors2: Vec3[]): Vec3[] {
    this.checkInitialized();
    if (!this.simdSupported) {
      throw new SIMDError('vec3SIMDAdd');
    }
    if (vectors1.length !== vectors2.length) {
      throw new ImathError('Vector arrays must have same length');
    }

    const count = vectors1.length;
    const aPtr = this.module!._malloc(count * 12);
    const bPtr = this.module!._malloc(count * 12);
    const resultPtr = this.module!._malloc(count * 12);

    try {
      // Pack input vectors
      const aArray = this.module!.HEAPF32.subarray(aPtr / 4, aPtr / 4 + count * 3);
      const bArray = this.module!.HEAPF32.subarray(bPtr / 4, bPtr / 4 + count * 3);

      for (let i = 0; i < count; i++) {
        const offset = i * 3;
        aArray[offset] = vectors1[i].x;
        aArray[offset + 1] = vectors1[i].y;
        aArray[offset + 2] = vectors1[i].z;
        bArray[offset] = vectors2[i].x;
        bArray[offset + 1] = vectors2[i].y;
        bArray[offset + 2] = vectors2[i].z;
      }

      // SIMD operation
      this.module!._imath_vec3_simd_add(aPtr, bPtr, resultPtr, count);

      // Unpack results
      const resultArray = this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + count * 3);
      const results: Vec3[] = [];
      for (let i = 0; i < count; i++) {
        const offset = i * 3;
        results.push({
          x: resultArray[offset],
          y: resultArray[offset + 1],
          z: resultArray[offset + 2]
        });
      }

      return results;
    } finally {
      this.module!._free(aPtr);
      this.module!._free(bPtr);
      this.module!._free(resultPtr);
    }
  }

  /**
   * SIMD-accelerated 4D vector dot product
   * @param a First vector (Vec4)
   * @param b Second vector (Vec4)
   * @returns Dot product value
   */
  vec4SIMDDot(a: Vec4, b: Vec4): number {
    this.checkInitialized();
    if (!this.simdSupported) {
      throw new SIMDError('vec4SIMDDot');
    }

    const aPtr = this.module!._malloc(16); // 4 floats
    const bPtr = this.module!._malloc(16);

    try {
      this.module!.HEAPF32.set([a.x, a.y, a.z, a.w], aPtr / 4);
      this.module!.HEAPF32.set([b.x, b.y, b.z, b.w], bPtr / 4);

      return this.module!._imath_vec4_simd_dot(aPtr, bPtr);
    } finally {
      this.module!._free(aPtr);
      this.module!._free(bPtr);
    }
  }

  // ============================================================================
  // Matrix Operations
  // ============================================================================

  /**
   * Multiply two 4x4 matrices
   * @param a First matrix
   * @param b Second matrix
   * @returns Product matrix a * b
   */
  matrix44Multiply(a: Matrix44, b: Matrix44): Matrix44 {
    this.checkInitialized();
    if (!isMatrix44(a) || !isMatrix44(b)) throw new ImathError('Invalid Matrix44 input');

    const aPtr = this.module!._malloc(64); // 16 floats
    const bPtr = this.module!._malloc(64);
    const resultPtr = this.module!._malloc(64);

    try {
      this.module!.HEAPF32.set(a.elements, aPtr / 4);
      this.module!.HEAPF32.set(b.elements, bPtr / 4);

      if (this.simdSupported && this.options.simdOptimizations) {
        this.module!._imath_matrix44_simd_multiply(aPtr, bPtr, resultPtr);
      } else {
        this.module!._imath_matrix44_multiply(aPtr, bPtr, resultPtr);
      }

      const result = new Float32Array(16);
      result.set(this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 16));
      return { elements: result };
    } finally {
      this.module!._free(aPtr);
      this.module!._free(bPtr);
      this.module!._free(resultPtr);
    }
  }

  /**
   * Calculate matrix inverse
   * @param matrix Input matrix
   * @returns Inverse matrix, or throws MatrixError if not invertible
   */
  matrix44Inverse(matrix: Matrix44): Matrix44 {
    this.checkInitialized();
    if (!isMatrix44(matrix)) throw new ImathError('Invalid Matrix44 input');

    const matPtr = this.module!._malloc(64);
    const resultPtr = this.module!._malloc(64);

    try {
      this.module!.HEAPF32.set(matrix.elements, matPtr / 4);

      const success = this.module!._imath_matrix44_inverse(matPtr, resultPtr);
      if (!success) {
        throw new MatrixError('inverse', 'matrix is not invertible');
      }

      const result = new Float32Array(16);
      result.set(this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 16));
      return { elements: result };
    } finally {
      this.module!._free(matPtr);
      this.module!._free(resultPtr);
    }
  }

  /**
   * Calculate matrix transpose
   * @param matrix Input matrix
   * @returns Transposed matrix
   */
  matrix44Transpose(matrix: Matrix44): Matrix44 {
    this.checkInitialized();
    if (!isMatrix44(matrix)) throw new ImathError('Invalid Matrix44 input');

    const matPtr = this.module!._malloc(64);
    const resultPtr = this.module!._malloc(64);

    try {
      this.module!.HEAPF32.set(matrix.elements, matPtr / 4);
      this.module!._imath_matrix44_transpose(matPtr, resultPtr);

      const result = new Float32Array(16);
      result.set(this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 16));
      return { elements: result };
    } finally {
      this.module!._free(matPtr);
      this.module!._free(resultPtr);
    }
  }

  // ============================================================================
  // Quaternion Operations
  // ============================================================================

  /**
   * Spherical linear interpolation between two quaternions
   * @param q1 First quaternion
   * @param q2 Second quaternion
   * @param t Interpolation parameter (0.0 to 1.0)
   * @returns Interpolated quaternion
   */
  quatSlerp(q1: Quat, q2: Quat, t: number): Quat {
    this.checkInitialized();
    if (!isQuat(q1) || !isQuat(q2)) throw new ImathError('Invalid Quat input');

    const q1Ptr = this.module!._malloc(16);
    const q2Ptr = this.module!._malloc(16);
    const resultPtr = this.module!._malloc(16);

    try {
      this.module!.HEAPF32.set([q1.x, q1.y, q1.z, q1.w], q1Ptr / 4);
      this.module!.HEAPF32.set([q2.x, q2.y, q2.z, q2.w], q2Ptr / 4);

      this.module!._imath_quat_slerp(q1Ptr, q2Ptr, t, resultPtr);

      const result = this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 4);
      return { x: result[0], y: result[1], z: result[2], w: result[3] };
    } finally {
      this.module!._free(q1Ptr);
      this.module!._free(q2Ptr);
      this.module!._free(resultPtr);
    }
  }

  /**
   * Normalize quaternion to unit length
   * @param quat Input quaternion
   * @returns Normalized quaternion
   */
  quatNormalize(quat: Quat): Quat {
    this.checkInitialized();
    if (!isQuat(quat)) throw new ImathError('Invalid Quat input');

    const quatPtr = this.module!._malloc(16);

    try {
      this.module!.HEAPF32.set([quat.x, quat.y, quat.z, quat.w], quatPtr / 4);
      this.module!._imath_quat_normalize(quatPtr);

      const result = this.module!.HEAPF32.subarray(quatPtr / 4, quatPtr / 4 + 4);
      return { x: result[0], y: result[1], z: result[2], w: result[3] };
    } finally {
      this.module!._free(quatPtr);
    }
  }

  // ============================================================================
  // Projection Operations
  // ============================================================================

  /**
   * Create frustum projection matrix
   * @param params Frustum parameters
   * @returns Projection matrix
   */
  frustumProjection(params: FrustumParams): Matrix44 {
    this.checkInitialized();

    const resultPtr = this.module!._malloc(64);

    try {
      this.module!._imath_frustum_projection(
        params.left, params.right,
        params.bottom, params.top,
        params.near, params.far,
        resultPtr
      );

      const result = new Float32Array(16);
      result.set(this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 16));
      return { elements: result };
    } finally {
      this.module!._free(resultPtr);
    }
  }

  /**
   * Create perspective projection matrix
   * @param params Perspective parameters
   * @returns Projection matrix
   */
  perspectiveProjection(params: PerspectiveParams): Matrix44 {
    this.checkInitialized();

    const resultPtr = this.module!._malloc(64);

    try {
      this.module!._imath_perspective_projection(
        params.fovy, params.aspect, params.near, params.far, resultPtr
      );

      const result = new Float32Array(16);
      result.set(this.module!.HEAPF32.subarray(resultPtr / 4, resultPtr / 4 + 16));
      return { elements: result };
    } finally {
      this.module!._free(resultPtr);
    }
  }

  // ============================================================================
  // Half-float Conversions
  // ============================================================================

  /**
   * Convert half-precision float to regular float
   * @param halfBits Half-precision bits (uint16)
   * @returns Full-precision float
   */
  halfToFloat(halfBits: number): number {
    this.checkInitialized();
    return this.module!._half_to_float(halfBits);
  }

  /**
   * Convert regular float to half-precision float
   * @param value Full-precision float
   * @returns Half-precision bits (uint16)
   */
  floatToHalf(value: number): number {
    this.checkInitialized();
    return this.module!._float_to_half(value);
  }

  /**
   * Batch convert half-precision array to float array
   * @param halfArray Array of half-precision values (uint16)
   * @returns Array of full-precision floats
   */
  halfToFloatArray(halfArray: Uint16Array): Float32Array {
    this.checkInitialized();

    const inputPtr = this.module!._malloc(halfArray.length * 2);
    const outputPtr = this.module!._malloc(halfArray.length * 4);

    try {
      // Copy input data
      const inputView = new Uint16Array(this.module!.HEAPU8.buffer, inputPtr, halfArray.length);
      inputView.set(halfArray);

      // Convert
      this.module!._half_to_float_array(inputPtr, outputPtr, halfArray.length);

      // Copy result
      const result = new Float32Array(halfArray.length);
      const outputView = new Float32Array(this.module!.HEAPU8.buffer, outputPtr, halfArray.length);
      result.set(outputView);

      return result;
    } finally {
      this.module!._free(inputPtr);
      this.module!._free(outputPtr);
    }
  }

  // ============================================================================
  // Benchmarking and Performance
  // ============================================================================

  /**
   * Run comprehensive performance benchmarks
   * @param iterations Number of iterations per test (default: 100000)
   * @returns Array of benchmark results
   */
  benchmark(iterations = 100000): BenchmarkResult[] {
    this.checkInitialized();

    const results: BenchmarkResult[] = [];

    // Vector operations benchmark
    const vec3Time = (this.module as any)._benchmark_vec3_operations(iterations);
    results.push({
      operation: 'Vec3 Operations',
      opsPerSecond: Math.round(iterations / (vec3Time / 1000)),
      avgTimeUs: (vec3Time * 1000) / iterations,
      simdAccelerated: this.simdSupported,
      iterations
    });

    // Matrix multiplication benchmark
    const matrixTime = (this.module as any)._benchmark_matrix_multiply(iterations);
    results.push({
      operation: 'Matrix Multiply',
      opsPerSecond: Math.round(iterations / (matrixTime / 1000)),
      avgTimeUs: (matrixTime * 1000) / iterations,
      simdAccelerated: this.simdSupported,
      iterations
    });

    // Half-float conversion benchmark
    const halfTime = (this.module as any)._benchmark_half_conversions(iterations);
    results.push({
      operation: 'Half Conversions',
      opsPerSecond: Math.round(iterations / (halfTime / 1000)),
      avgTimeUs: (halfTime * 1000) / iterations,
      simdAccelerated: false, // Half conversion doesn't use SIMD
      iterations
    });

    return results;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if SIMD optimizations are available and enabled
   * @returns True if SIMD is supported and enabled
   */
  simdAvailable(): boolean {
    return this.simdSupported && (this.options.simdOptimizations !== false);
  }

  /**
   * Get library version string
   * @returns Version string
   */
  version(): string {
    this.checkInitialized();
    const ptr = this.module!._imath_version();
    return this.module!.UTF8ToString(ptr);
  }

  /**
   * Check if module is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clean up WASM resources
   * Call this when done using the library
   */
  cleanup(): void {
    if (this.module) {
      // WASM cleanup handled automatically
      this.module = null;
      this.initialized = false;
    }
  }

  // ============================================================================
  // Helper Functions for Common Operations
  // ============================================================================

  /**
   * Create identity 4x4 matrix
   * @returns Identity matrix
   */
  static identityMatrix44(): Matrix44 {
    const elements = new Float32Array(16);
    elements[0] = elements[5] = elements[10] = elements[15] = 1.0; // Diagonal = 1
    return { elements };
  }

  /**
   * Create zero 3D vector
   * @returns Zero vector (0, 0, 0)
   */
  static zeroVec3(): Vec3 {
    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Create unit 3D vector along axis
   * @param axis Axis ('x', 'y', or 'z')
   * @returns Unit vector along specified axis
   */
  static unitVec3(axis: 'x' | 'y' | 'z'): Vec3 {
    switch (axis) {
      case 'x': return { x: 1, y: 0, z: 0 };
      case 'y': return { x: 0, y: 1, z: 0 };
      case 'z': return { x: 0, y: 0, z: 1 };
      default: throw new ImathError(`Invalid axis: ${axis}`);
    }
  }

  /**
   * Create identity quaternion (no rotation)
   * @returns Identity quaternion (0, 0, 0, 1)
   */
  static identityQuat(): Quat {
    return { x: 0, y: 0, z: 0, w: 1 };
  }
}

// Re-export types for convenience
export * from './types.ts';