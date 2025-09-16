/*
 * Copyright (c) Contributors to the OpenEXR Project
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 *
 * WASM SIDE_MODULE bindings for Imath with SIMD optimizations
 */

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cstring>
#include <cmath>

// Core Imath headers
#include "ImathVec.h"
#include "ImathMatrix.h"
#include "ImathQuat.h"
#include "ImathEuler.h"
#include "ImathFrustum.h"
#include "half.h"

using namespace IMATH_NAMESPACE;

extern "C" {

// ============================================================================
// Vector Operations with SIMD acceleration
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void imath_vec3_add(const float* a, const float* b, float* result) {
    V3f va(a[0], a[1], a[2]);
    V3f vb(b[0], b[1], b[2]);
    V3f vr = va + vb;
    result[0] = vr.x; result[1] = vr.y; result[2] = vr.z;
}

EMSCRIPTEN_KEEPALIVE
float imath_vec3_dot(const float* a, const float* b) {
    V3f va(a[0], a[1], a[2]);
    V3f vb(b[0], b[1], b[2]);
    return va.dot(vb);
}

EMSCRIPTEN_KEEPALIVE
void imath_vec3_cross(const float* a, const float* b, float* result) {
    V3f va(a[0], a[1], a[2]);
    V3f vb(b[0], b[1], b[2]);
    V3f vr = va.cross(vb);
    result[0] = vr.x; result[1] = vr.y; result[2] = vr.z;
}

EMSCRIPTEN_KEEPALIVE
void imath_vec3_normalize(float* vec) {
    V3f v(vec[0], vec[1], vec[2]);
    v.normalize();
    vec[0] = v.x; vec[1] = v.y; vec[2] = v.z;
}

// SIMD-optimized vector operations (process multiple vectors at once)
EMSCRIPTEN_KEEPALIVE
void imath_vec3_simd_add(const float* a, const float* b, float* result, int count) {
    // Process 4 Vec3 at a time using SIMD (12 floats = 3 SIMD vectors)
    int simd_count = (count / 4) * 4;

    for (int i = 0; i < simd_count; i += 4) {
        // Load 12 floats (4 Vec3) as 3 SIMD vectors
        v128_t a0 = wasm_v128_load(&a[i * 3]);       // x1,y1,z1,x2
        v128_t a1 = wasm_v128_load(&a[i * 3 + 4]);   // y2,z2,x3,y3
        v128_t a2 = wasm_v128_load(&a[i * 3 + 8]);   // z3,x4,y4,z4

        v128_t b0 = wasm_v128_load(&b[i * 3]);
        v128_t b1 = wasm_v128_load(&b[i * 3 + 4]);
        v128_t b2 = wasm_v128_load(&b[i * 3 + 8]);

        // Add vectors
        v128_t r0 = wasm_f32x4_add(a0, b0);
        v128_t r1 = wasm_f32x4_add(a1, b1);
        v128_t r2 = wasm_f32x4_add(a2, b2);

        // Store results
        wasm_v128_store(&result[i * 3], r0);
        wasm_v128_store(&result[i * 3 + 4], r1);
        wasm_v128_store(&result[i * 3 + 8], r2);
    }

    // Handle remainder with scalar operations
    for (int i = simd_count; i < count; i++) {
        imath_vec3_add(&a[i * 3], &b[i * 3], &result[i * 3]);
    }
}

EMSCRIPTEN_KEEPALIVE
float imath_vec4_simd_dot(const float* a, const float* b) {
    // Use SIMD for Vec4 dot product
    v128_t va = wasm_v128_load(a);
    v128_t vb = wasm_v128_load(b);
    v128_t mult = wasm_f32x4_mul(va, vb);

    // Horizontal sum
    v128_t sum1 = wasm_f32x4_add(mult, wasm_i32x4_shuffle(mult, mult, 2, 3, 0, 1));
    v128_t sum2 = wasm_f32x4_add(sum1, wasm_i32x4_shuffle(sum1, sum1, 1, 0, 3, 2));

    return wasm_f32x4_extract_lane(sum2, 0);
}

// ============================================================================
// Matrix Operations with SIMD acceleration
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void imath_matrix44_multiply(const float* a, const float* b, float* result) {
    M44f ma, mb;
    std::memcpy(ma.getValue(), a, 16 * sizeof(float));
    std::memcpy(mb.getValue(), b, 16 * sizeof(float));

    M44f mr = ma * mb;
    std::memcpy(result, mr.getValue(), 16 * sizeof(float));
}

EMSCRIPTEN_KEEPALIVE
bool imath_matrix44_inverse(const float* matrix, float* result) {
    M44f m;
    std::memcpy(m.getValue(), matrix, 16 * sizeof(float));

    try {
        M44f inv = m.inverse(true);  // Pass true to throw on singular matrix

        // Check for NaN or infinity values indicating singular matrix
        const float* invData = inv.getValue();
        for (int i = 0; i < 16; i++) {
            if (!std::isfinite(invData[i])) {
                return false;  // Matrix not invertible
            }
        }

        std::memcpy(result, invData, 16 * sizeof(float));
        return true;
    } catch (...) {
        return false;  // Matrix not invertible
    }
}

EMSCRIPTEN_KEEPALIVE
void imath_matrix44_transpose(const float* matrix, float* result) {
    M44f m;
    std::memcpy(m.getValue(), matrix, 16 * sizeof(float));
    M44f mt = m.transposed();
    std::memcpy(result, mt.getValue(), 16 * sizeof(float));
}

// SIMD-optimized matrix multiplication
EMSCRIPTEN_KEEPALIVE
void imath_matrix44_simd_multiply(const float* a, const float* b, float* result) {
    // Load matrix B columns
    v128_t b0 = wasm_v128_load(&b[0]);   // b00, b10, b20, b30
    v128_t b1 = wasm_v128_load(&b[4]);   // b01, b11, b21, b31
    v128_t b2 = wasm_v128_load(&b[8]);   // b02, b12, b22, b32
    v128_t b3 = wasm_v128_load(&b[12]);  // b03, b13, b23, b33

    for (int i = 0; i < 4; i++) {
        // Load row i of matrix A
        v128_t a_row = wasm_v128_load(&a[i * 4]);

        // Multiply and accumulate
        v128_t r0 = wasm_f32x4_mul(wasm_f32x4_splat(wasm_f32x4_extract_lane(a_row, 0)), b0);
        v128_t r1 = wasm_f32x4_mul(wasm_f32x4_splat(wasm_f32x4_extract_lane(a_row, 1)), b1);
        v128_t r2 = wasm_f32x4_mul(wasm_f32x4_splat(wasm_f32x4_extract_lane(a_row, 2)), b2);
        v128_t r3 = wasm_f32x4_mul(wasm_f32x4_splat(wasm_f32x4_extract_lane(a_row, 3)), b3);

        v128_t result_row = wasm_f32x4_add(wasm_f32x4_add(r0, r1), wasm_f32x4_add(r2, r3));
        wasm_v128_store(&result[i * 4], result_row);
    }
}

// ============================================================================
// Quaternion Operations
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void imath_quat_slerp(const float* q1, const float* q2, float t, float* result) {
    Quatf qa(q1[3], q1[0], q1[1], q1[2]);  // w, x, y, z
    Quatf qb(q2[3], q2[0], q2[1], q2[2]);

    Quatf qr = slerp(qa, qb, t);
    result[0] = qr.v.x; result[1] = qr.v.y; result[2] = qr.v.z; result[3] = qr.r;
}

EMSCRIPTEN_KEEPALIVE
void imath_quat_normalize(float* quat) {
    Quatf q(quat[3], quat[0], quat[1], quat[2]);
    q.normalize();
    quat[0] = q.v.x; quat[1] = q.v.y; quat[2] = q.v.z; quat[3] = q.r;
}

// ============================================================================
// Euler Angles
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void imath_euler_to_matrix(const float* euler, int order, float* result) {
    Eulerf e(euler[0], euler[1], euler[2], static_cast<Eulerf::Order>(order));
    M44f m = e.toMatrix44();
    std::memcpy(result, m.getValue(), 16 * sizeof(float));
}

EMSCRIPTEN_KEEPALIVE
void imath_matrix_to_euler(const float* matrix, int order, float* result) {
    M44f m;
    std::memcpy(m.getValue(), matrix, 16 * sizeof(float));

    Eulerf e;
    e.extract(m);
    e.setOrder(static_cast<Eulerf::Order>(order));

    result[0] = e.x; result[1] = e.y; result[2] = e.z;
}

// ============================================================================
// Projection Operations
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void imath_frustum_projection(float left, float right, float bottom, float top, float near, float far, float* result) {
    M44f proj;
    proj.makeIdentity();

    float A = (right + left) / (right - left);
    float B = (top + bottom) / (top - bottom);
    float C = -(far + near) / (far - near);
    float D = -2.0f * far * near / (far - near);

    proj[0][0] = 2.0f * near / (right - left);
    proj[1][1] = 2.0f * near / (top - bottom);
    proj[2][0] = A;
    proj[2][1] = B;
    proj[2][2] = C;
    proj[2][3] = -1.0f;
    proj[3][2] = D;
    proj[3][3] = 0.0f;

    std::memcpy(result, proj.getValue(), 16 * sizeof(float));
}

EMSCRIPTEN_KEEPALIVE
void imath_perspective_projection(float fovy, float aspect, float near, float far, float* result) {
    float top = near * tanf(fovy * 0.5f);
    float bottom = -top;
    float right = top * aspect;
    float left = -right;

    imath_frustum_projection(left, right, bottom, top, near, far, result);
}

// ============================================================================
// Half-float Conversions (critical for graphics workflows)
// ============================================================================

EMSCRIPTEN_KEEPALIVE
float half_to_float(uint16_t h) {
    half hf;
    hf.setBits(h);
    return static_cast<float>(hf);
}

EMSCRIPTEN_KEEPALIVE
uint16_t float_to_half(float f) {
    half hf(f);
    return hf.bits();
}

// SIMD batch conversion for arrays
EMSCRIPTEN_KEEPALIVE
void half_to_float_array(const uint16_t* input, float* output, int count) {
    for (int i = 0; i < count; i++) {
        output[i] = half_to_float(input[i]);
    }
}

EMSCRIPTEN_KEEPALIVE
void float_to_half_array(const float* input, uint16_t* output, int count) {
    for (int i = 0; i < count; i++) {
        output[i] = float_to_half(input[i]);
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

EMSCRIPTEN_KEEPALIVE
bool imath_simd_available() {
#ifdef __wasm_simd128__
    return true;
#else
    return false;
#endif
}

EMSCRIPTEN_KEEPALIVE
const char* imath_version() {
    return "3.2.0-wasm";
}

} // extern "C"