/**
 * TypeScript type definitions for Imath.wasm
 * Copyright (c) Contributors to the OpenEXR Project
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 */

// ============================================================================
// Core Types
// ============================================================================

/** 3D Vector representation */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 4D Vector representation */
export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** 4x4 Matrix representation (column-major order) */
export interface Matrix44 {
  /** Matrix elements as flat array [m00,m10,m20,m30, m01,m11,m21,m31, m02,m12,m22,m32, m03,m13,m23,m33] */
  elements: Float32Array;
}

/** Quaternion representation (x, y, z, w) */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Euler angles (in radians) */
export interface Euler {
  x: number;
  y: number;
  z: number;
  order: EulerOrder;
}

/** 3D Bounding box */
export interface Box3 {
  min: Vec3;
  max: Vec3;
}

/** RGB Color */
export interface Color3 {
  r: number;
  g: number;
  b: number;
}

// ============================================================================
// Enums
// ============================================================================

/** Euler angle rotation orders */
export enum EulerOrder {
  XYZ = 0,
  XZY = 1,
  YXZ = 2,
  YZX = 3,
  ZXY = 4,
  ZYX = 5,
  XYX = 6,
  XZX = 7,
  YXY = 8,
  YZY = 9,
  ZXZ = 10,
  ZYZ = 11
}

// ============================================================================
// Options and Configuration
// ============================================================================

/** Configuration options for Imath library */
export interface ImathOptions {
  /** Enable SIMD optimizations (default: true if supported) */
  simdOptimizations?: boolean;
  /** Maximum memory allocation in MB (default: 128) */
  maxMemoryMB?: number;
  /** Enable WebGPU acceleration for large batch operations (default: false) */
  webgpuAcceleration?: boolean;
}

/** Result from vector operations */
export interface VectorOpResult {
  /** Success status */
  success: boolean;
  /** Result vector */
  result: Vec3;
  /** SIMD optimization used */
  simdUsed: boolean;
  /** Performance timing in milliseconds */
  timing?: number;
}

/** Result from matrix operations */
export interface MatrixOpResult {
  /** Success status */
  success: boolean;
  /** Result matrix */
  result: Matrix44;
  /** SIMD optimization used */
  simdUsed: boolean;
  /** Performance timing in milliseconds */
  timing?: number;
}

/** Performance benchmark result */
export interface BenchmarkResult {
  /** Operation name */
  operation: string;
  /** Operations per second */
  opsPerSecond: number;
  /** Average time per operation in microseconds */
  avgTimeUs: number;
  /** SIMD acceleration used */
  simdAccelerated: boolean;
  /** Number of iterations tested */
  iterations: number;
}

/** Half-float conversion options */
export interface HalfFloatOptions {
  /** Input data type */
  inputType: 'float32' | 'uint16';
  /** Output data type */
  outputType: 'float32' | 'uint16';
  /** Use batch processing for arrays */
  batchMode?: boolean;
}

// ============================================================================
// Advanced Types
// ============================================================================

/** Frustum projection parameters */
export interface FrustumParams {
  left: number;
  right: number;
  bottom: number;
  top: number;
  near: number;
  far: number;
}

/** Perspective projection parameters */
export interface PerspectiveParams {
  /** Field of view in radians */
  fovy: number;
  /** Aspect ratio (width/height) */
  aspect: number;
  /** Near clipping plane distance */
  near: number;
  /** Far clipping plane distance */
  far: number;
}

/** Random number generation options */
export interface RandomOptions {
  /** Random seed (default: current time) */
  seed?: number;
  /** Distribution type */
  distribution: 'uniform' | 'gaussian' | 'sphere';
}

/** Color space conversion options */
export interface ColorConversionOptions {
  /** Source color space */
  source: 'rgb' | 'hsv' | 'xyz' | 'lab';
  /** Target color space */
  target: 'rgb' | 'hsv' | 'xyz' | 'lab';
  /** Color temperature for white point (if applicable) */
  whitePoint?: number;
}

// ============================================================================
// Function Signatures
// ============================================================================

/** WASM module function bindings */
export interface ImathModuleFunctions {
  // Vector operations
  _imath_vec3_add: (a: number, b: number, result: number) => void;
  _imath_vec3_dot: (a: number, b: number) => number;
  _imath_vec3_cross: (a: number, b: number, result: number) => void;
  _imath_vec3_normalize: (vec: number) => void;
  _imath_vec3_simd_add: (a: number, b: number, result: number, count: number) => void;
  _imath_vec4_simd_dot: (a: number, b: number) => number;

  // Matrix operations
  _imath_matrix44_multiply: (a: number, b: number, result: number) => void;
  _imath_matrix44_inverse: (matrix: number, result: number) => boolean;
  _imath_matrix44_transpose: (matrix: number, result: number) => void;
  _imath_matrix44_simd_multiply: (a: number, b: number, result: number) => void;

  // Quaternion operations
  _imath_quat_slerp: (q1: number, q2: number, t: number, result: number) => void;
  _imath_quat_normalize: (quat: number) => void;

  // Euler operations
  _imath_euler_to_matrix: (euler: number, order: number, result: number) => void;
  _imath_matrix_to_euler: (matrix: number, order: number, result: number) => void;

  // Projection operations
  _imath_frustum_projection: (left: number, right: number, bottom: number, top: number, near: number, far: number, result: number) => void;
  _imath_perspective_projection: (fovy: number, aspect: number, near: number, far: number, result: number) => void;

  // Half-float conversions
  _half_to_float: (h: number) => number;
  _float_to_half: (f: number) => number;
  _half_to_float_array: (input: number, output: number, count: number) => void;
  _float_to_half_array: (input: number, output: number, count: number) => void;

  // Utility functions
  _imath_simd_available: () => boolean;
  _imath_version: () => number; // Returns pointer to C string

  // Memory management
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;

  // Runtime methods
  cwrap: (funcName: string, returnType: string, argTypes: string[]) => (...args: any[]) => any;
  ccall: (funcName: string, returnType: string, argTypes: string[], args: any[]) => any;
  UTF8ToString: (ptr: number) => string;
  HEAPU8: Uint8Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
}

// ============================================================================
// Error Types
// ============================================================================

/** Imath-specific errors */
export class ImathError extends Error {
  constructor(message: string) {
    super(`Imath: ${message}`);
    this.name = 'ImathError';
  }
}

/** Matrix operation errors */
export class MatrixError extends ImathError {
  constructor(operation: string, reason: string) {
    super(`Matrix ${operation} failed: ${reason}`);
    this.name = 'MatrixError';
  }
}

/** SIMD operation errors */
export class SIMDError extends ImathError {
  constructor(operation: string) {
    super(`SIMD ${operation} not supported or failed`);
    this.name = 'SIMDError';
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isVec3(obj: any): obj is Vec3 {
  return obj && typeof obj.x === 'number' && typeof obj.y === 'number' && typeof obj.z === 'number';
}

export function isVec4(obj: any): obj is Vec4 {
  return obj && typeof obj.x === 'number' && typeof obj.y === 'number' && typeof obj.z === 'number' && typeof obj.w === 'number';
}

export function isMatrix44(obj: any): obj is Matrix44 {
  return obj && obj.elements && obj.elements instanceof Float32Array && obj.elements.length === 16;
}

export function isQuat(obj: any): obj is Quat {
  return obj && typeof obj.x === 'number' && typeof obj.y === 'number' && typeof obj.z === 'number' && typeof obj.w === 'number';
}