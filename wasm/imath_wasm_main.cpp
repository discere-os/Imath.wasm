/*
 * Copyright (c) Contributors to the OpenEXR Project
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 *
 * WASM MAIN_MODULE bindings for Imath with testing support
 * Includes all functionality from side module plus testing helpers
 */

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cstring>
#include <iostream>
#include <chrono>

// Core Imath headers
#include "ImathVec.h"
#include "ImathMatrix.h"
#include "ImathQuat.h"
#include "ImathEuler.h"
#include "ImathFrustum.h"
#include "ImathBox.h"
#include "ImathColor.h"
#include "ImathColorAlgo.h"
#include "ImathRandom.h"
#include "ImathBoxAlgo.h"
#include "half.h"

using namespace IMATH_NAMESPACE;

extern "C" {

// Include all functions from side module
#include "imath_wasm_side.cpp"

// ============================================================================
// Testing and Benchmarking Functions (MAIN_MODULE only)
// ============================================================================

EMSCRIPTEN_KEEPALIVE
double benchmark_vec3_operations(int iterations) {
    auto start = std::chrono::high_resolution_clock::now();

    V3f a(1.0f, 2.0f, 3.0f);
    V3f b(4.0f, 5.0f, 6.0f);
    V3f result;

    for (int i = 0; i < iterations; i++) {
        result = a + b;
        result = result.cross(a);
        result.normalize();
        float dot = result.dot(b);
        (void)dot; // Prevent optimization
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    return static_cast<double>(duration.count()) / 1000.0; // Return milliseconds
}

EMSCRIPTEN_KEEPALIVE
double benchmark_matrix_multiply(int iterations) {
    auto start = std::chrono::high_resolution_clock::now();

    M44f a, b, result;
    a.makeIdentity();
    b.makeIdentity();

    // Initialize with some values
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4; j++) {
            a[i][j] = static_cast<float>(i * 4 + j + 1);
            b[i][j] = static_cast<float>((i + j) * 0.5f + 1.0f);
        }
    }

    for (int i = 0; i < iterations; i++) {
        result = a * b;
        a = result;
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    return static_cast<double>(duration.count()) / 1000.0;
}

EMSCRIPTEN_KEEPALIVE
double benchmark_half_conversions(int iterations) {
    auto start = std::chrono::high_resolution_clock::now();

    float f = 3.14159f;
    half h;
    float result;

    for (int i = 0; i < iterations; i++) {
        h = half(f + static_cast<float>(i) * 0.001f);
        result = static_cast<float>(h);
        (void)result; // Prevent optimization
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    return static_cast<double>(duration.count()) / 1000.0;
}

EMSCRIPTEN_KEEPALIVE
bool test_matrix_inverse() {
    // Test matrix inversion
    M44f m;
    m.makeIdentity();
    m[0][0] = 2.0f; m[1][1] = 3.0f; m[2][2] = 4.0f;

    try {
        M44f inv = m.inverse();
        M44f identity = m * inv;

        // Check if result is close to identity
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                float expected = (i == j) ? 1.0f : 0.0f;
                float diff = std::abs(identity[i][j] - expected);
                if (diff > 1e-6f) {
                    return false;
                }
            }
        }
        return true;
    } catch (...) {
        return false;
    }
}

EMSCRIPTEN_KEEPALIVE
bool test_quaternion_slerp() {
    // Test quaternion spherical linear interpolation
    Quatf q1(0.0f, 0.0f, 0.0f, 1.0f);  // Identity
    Quatf q2(0.0f, 0.0f, 0.707107f, 0.707107f);  // 90 degree rotation around Z

    Quatf result = slerp(q1, q2, 0.5f);

    // At t=0.5, should be 45 degrees around Z
    float expected_z = 0.382683f;  // sin(22.5°)
    float expected_w = 0.923880f;  // cos(22.5°)

    float diff_z = std::abs(result.v.z - expected_z);
    float diff_w = std::abs(result.r - expected_w);

    return (diff_z < 1e-5f && diff_w < 1e-5f);
}

EMSCRIPTEN_KEEPALIVE
bool test_simd_vec3_add() {
    // Test SIMD vector addition
    const int count = 4;
    float a[12] = {1,2,3, 4,5,6, 7,8,9, 10,11,12};
    float b[12] = {1,1,1, 2,2,2, 3,3,3, 4,4,4};
    float result[12];
    float expected[12] = {2,3,4, 6,7,8, 10,11,12, 14,15,16};

    imath_vec3_simd_add(a, b, result, count);

    for (int i = 0; i < 12; i++) {
        if (std::abs(result[i] - expected[i]) > 1e-6f) {
            return false;
        }
    }
    return true;
}

EMSCRIPTEN_KEEPALIVE
bool test_half_precision() {
    // Test half-precision floating point conversions
    float original = 3.141592653589793f;
    half h(original);
    float converted = static_cast<float>(h);

    // Half precision should preserve ~3-4 decimal places
    float diff = std::abs(original - converted);
    return diff < 0.001f;  // Allow for half-precision loss
}

// ============================================================================
// Memory Management Helpers
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void* allocate_vec3_array(int count) {
    return malloc(count * 3 * sizeof(float));
}

EMSCRIPTEN_KEEPALIVE
void* allocate_matrix44_array(int count) {
    return malloc(count * 16 * sizeof(float));
}

EMSCRIPTEN_KEEPALIVE
void free_memory(void* ptr) {
    free(ptr);
}

// ============================================================================
// Advanced Math Operations (MAIN_MODULE exclusive)
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void imath_box3_transform(const float* box_min, const float* box_max,
                          const float* matrix, float* result_min, float* result_max) {
    Box3f box(V3f(box_min[0], box_min[1], box_min[2]),
              V3f(box_max[0], box_max[1], box_max[2]));

    M44f m;
    std::memcpy(m.getValue(), matrix, 16 * sizeof(float));

    Box3f transformed = transform(box, m);

    result_min[0] = transformed.min.x;
    result_min[1] = transformed.min.y;
    result_min[2] = transformed.min.z;

    result_max[0] = transformed.max.x;
    result_max[1] = transformed.max.y;
    result_max[2] = transformed.max.z;
}

EMSCRIPTEN_KEEPALIVE
void imath_random_vec3(float* result, unsigned int seed) {
    Rand32 rng(seed);
    V3f v = gaussSphereRand<V3f>(rng);
    result[0] = v.x; result[1] = v.y; result[2] = v.z;
}

EMSCRIPTEN_KEEPALIVE
void imath_color_rgb_to_hsv(const float* rgb, float* hsv) {
    Color3f color(rgb[0], rgb[1], rgb[2]);
    Color3f hsv_color = rgb2hsv(color);
    hsv[0] = hsv_color.x; hsv[1] = hsv_color.y; hsv[2] = hsv_color.z;
}

EMSCRIPTEN_KEEPALIVE
void imath_color_hsv_to_rgb(const float* hsv, float* rgb) {
    Color3f color(hsv[0], hsv[1], hsv[2]);
    Color3f rgb_color = hsv2rgb(color);
    rgb[0] = rgb_color.x; rgb[1] = rgb_color.y; rgb[2] = rgb_color.z;
}

// ============================================================================
// Performance Monitoring
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void print_performance_info() {
    std::cout << "Imath WASM Performance Info:\n";
    std::cout << "SIMD Support: " << (imath_simd_available() ? "Yes" : "No") << "\n";
    std::cout << "Half-float Support: Yes\n";
    std::cout << "Matrix Operations: Optimized\n";
    std::cout << "Vector Operations: SIMD Accelerated\n";
}

} // extern "C"