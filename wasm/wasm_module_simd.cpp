#include <Imath/ImathVec.h>
#include <Imath/ImathMatrix.h>
#include <Imath/ImathQuat.h>
#include <Imath/ImathBox.h>
#include <Imath/ImathColor.h>
#include <Imath/ImathRandom.h>
#include <Imath/ImathRoots.h>
#include <Imath/ImathFrustum.h>
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <string>
#include <cmath>

// SIMD support detection and includes
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#define HAS_SIMD 1
#else
#define HAS_SIMD 0
#endif

using namespace Imath;
using namespace emscripten;

// Runtime SIMD detection
static int simd_available = -1;

EMSCRIPTEN_KEEPALIVE
extern "C" int imath_has_simd(void) {
    if (simd_available == -1) {
        simd_available = HAS_SIMD;
    }
    return simd_available;
}

// SIMD-optimized math operations
#ifdef __wasm_simd128__

// SIMD-optimized Vec3f operations
struct SIMDVec3f {
    union {
        struct { float x, y, z, w; }; // w is padding for SIMD alignment
        v128_t simd;
    };
    
    SIMDVec3f(float x_ = 0.0f, float y_ = 0.0f, float z_ = 0.0f) 
        : x(x_), y(y_), z(z_), w(0.0f) {}
    
    SIMDVec3f(const V3f& v) : x(v.x), y(v.y), z(v.z), w(0.0f) {}
    
    V3f toV3f() const { return V3f(x, y, z); }
    
    // SIMD dot product
    float dot(const SIMDVec3f& other) const {
        v128_t a = simd;
        v128_t b = other.simd;
        v128_t product = wasm_f32x4_mul(a, b);
        
        // Extract components and sum (only x, y, z)
        return wasm_f32x4_extract_lane(product, 0) +
               wasm_f32x4_extract_lane(product, 1) +
               wasm_f32x4_extract_lane(product, 2);
    }
    
    // SIMD cross product
    SIMDVec3f cross(const SIMDVec3f& other) const {
        // Cross product: (a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x)
        SIMDVec3f result;
        result.x = y * other.z - z * other.y;
        result.y = z * other.x - x * other.z;
        result.z = x * other.y - y * other.x;
        result.w = 0.0f;
        return result;
    }
    
    // SIMD vector addition
    SIMDVec3f operator+(const SIMDVec3f& other) const {
        SIMDVec3f result;
        result.simd = wasm_f32x4_add(simd, other.simd);
        result.w = 0.0f; // Ensure w remains 0
        return result;
    }
    
    // SIMD vector subtraction
    SIMDVec3f operator-(const SIMDVec3f& other) const {
        SIMDVec3f result;
        result.simd = wasm_f32x4_sub(simd, other.simd);
        result.w = 0.0f; // Ensure w remains 0
        return result;
    }
    
    // SIMD scalar multiplication
    SIMDVec3f operator*(float scalar) const {
        SIMDVec3f result;
        v128_t scalar_vec = wasm_f32x4_splat(scalar);
        result.simd = wasm_f32x4_mul(simd, scalar_vec);
        result.w = 0.0f; // Ensure w remains 0
        return result;
    }
    
    // SIMD length calculation
    float length() const {
        return std::sqrt(dot(*this));
    }
    
    // SIMD normalize
    SIMDVec3f normalized() const {
        float len = length();
        if (len > 0.0f) {
            return (*this) * (1.0f / len);
        }
        return *this;
    }
};

// SIMD-optimized matrix operations for 4x4 matrices
void simd_matrix44_multiply(const float* a, const float* b, float* result) {
    // Load matrix A rows
    v128_t a_row0 = wasm_v128_load(&a[0]);  // a[0][0-3]
    v128_t a_row1 = wasm_v128_load(&a[4]);  // a[1][0-3]
    v128_t a_row2 = wasm_v128_load(&a[8]);  // a[2][0-3]
    v128_t a_row3 = wasm_v128_load(&a[12]); // a[3][0-3]
    
    // Compute result matrix column by column
    for (int col = 0; col < 4; col++) {
        v128_t b_col = wasm_f32x4_make(b[col], b[col + 4], b[col + 8], b[col + 12]);
        
        v128_t result_col = wasm_f32x4_mul(a_row0, wasm_f32x4_splat(wasm_f32x4_extract_lane(b_col, 0)));
        result_col = wasm_f32x4_add(result_col, wasm_f32x4_mul(a_row1, wasm_f32x4_splat(wasm_f32x4_extract_lane(b_col, 1))));
        result_col = wasm_f32x4_add(result_col, wasm_f32x4_mul(a_row2, wasm_f32x4_splat(wasm_f32x4_extract_lane(b_col, 2))));
        result_col = wasm_f32x4_add(result_col, wasm_f32x4_mul(a_row3, wasm_f32x4_splat(wasm_f32x4_extract_lane(b_col, 3))));
        
        // Store column
        result[col] = wasm_f32x4_extract_lane(result_col, 0);
        result[col + 4] = wasm_f32x4_extract_lane(result_col, 1);
        result[col + 8] = wasm_f32x4_extract_lane(result_col, 2);
        result[col + 12] = wasm_f32x4_extract_lane(result_col, 3);
    }
}

// SIMD-optimized quaternion SLERP
void simd_quat_slerp(float q1_w, float q1_x, float q1_y, float q1_z,
                     float q2_w, float q2_x, float q2_y, float q2_z,
                     float t, float* result_w, float* result_x, float* result_y, float* result_z) {
    // Load quaternions into SIMD vectors
    v128_t q1 = wasm_f32x4_make(q1_w, q1_x, q1_y, q1_z);
    v128_t q2 = wasm_f32x4_make(q2_w, q2_x, q2_y, q2_z);
    
    // Calculate dot product
    v128_t dot_vec = wasm_f32x4_mul(q1, q2);
    float dot = wasm_f32x4_extract_lane(dot_vec, 0) + wasm_f32x4_extract_lane(dot_vec, 1) +
                wasm_f32x4_extract_lane(dot_vec, 2) + wasm_f32x4_extract_lane(dot_vec, 3);
    
    // Handle negative dot product (take shorter path)
    if (dot < 0.0f) {
        q2 = wasm_f32x4_neg(q2);
        dot = -dot;
    }
    
    v128_t result_vec;
    
    if (dot > 0.9995f) {
        // Linear interpolation for very close quaternions
        v128_t t_vec = wasm_f32x4_splat(t);
        v128_t one_minus_t = wasm_f32x4_splat(1.0f - t);
        result_vec = wasm_f32x4_add(wasm_f32x4_mul(q1, one_minus_t), wasm_f32x4_mul(q2, t_vec));
    } else {
        // Spherical linear interpolation
        float theta = std::acos(std::abs(dot));
        float sin_theta = std::sin(theta);
        float weight1 = std::sin((1.0f - t) * theta) / sin_theta;
        float weight2 = std::sin(t * theta) / sin_theta;
        
        v128_t w1_vec = wasm_f32x4_splat(weight1);
        v128_t w2_vec = wasm_f32x4_splat(weight2);
        result_vec = wasm_f32x4_add(wasm_f32x4_mul(q1, w1_vec), wasm_f32x4_mul(q2, w2_vec));
    }
    
    // Normalize the result quaternion
    v128_t norm_sq = wasm_f32x4_mul(result_vec, result_vec);
    float norm = std::sqrt(wasm_f32x4_extract_lane(norm_sq, 0) + wasm_f32x4_extract_lane(norm_sq, 1) +
                          wasm_f32x4_extract_lane(norm_sq, 2) + wasm_f32x4_extract_lane(norm_sq, 3));
    
    if (norm > 0.0f) {
        v128_t norm_vec = wasm_f32x4_splat(1.0f / norm);
        result_vec = wasm_f32x4_mul(result_vec, norm_vec);
    }
    
    // Extract results
    *result_w = wasm_f32x4_extract_lane(result_vec, 0);
    *result_x = wasm_f32x4_extract_lane(result_vec, 1);
    *result_y = wasm_f32x4_extract_lane(result_vec, 2);
    *result_z = wasm_f32x4_extract_lane(result_vec, 3);
}

// SIMD-optimized bulk vector operations
void simd_process_vec3_array(float* vectors, int count, int operation, float scalar_or_x, float y = 0.0f, float z = 0.0f) {
    int i = 0;
    const int simd_count = (count / 4) * 4; // Process 4 vectors at a time
    
    if (operation == 0) { // Scale
        v128_t scalar_vec = wasm_f32x4_splat(scalar_or_x);
        for (i = 0; i < simd_count * 3; i += 12) { // 12 floats = 4 vec3s
            v128_t vec0 = wasm_v128_load(&vectors[i]);     // x0,y0,z0,x1
            v128_t vec1 = wasm_v128_load(&vectors[i + 4]); // y1,z1,x2,y2
            v128_t vec2 = wasm_v128_load(&vectors[i + 8]); // z2,x3,y3,z3
            
            wasm_v128_store(&vectors[i], wasm_f32x4_mul(vec0, scalar_vec));
            wasm_v128_store(&vectors[i + 4], wasm_f32x4_mul(vec1, scalar_vec));
            wasm_v128_store(&vectors[i + 8], wasm_f32x4_mul(vec2, scalar_vec));
        }
    } else if (operation == 1) { // Add vector
        for (i = 0; i < simd_count; i++) {
            int idx = i * 3;
            vectors[idx] += scalar_or_x;     // x
            vectors[idx + 1] += y;           // y
            vectors[idx + 2] += z;           // z
        }
    }
    
    // Handle remaining vectors
    for (i = simd_count; i < count; i++) {
        int idx = i * 3;
        if (operation == 0) { // Scale
            vectors[idx] *= scalar_or_x;
            vectors[idx + 1] *= scalar_or_x;
            vectors[idx + 2] *= scalar_or_x;
        } else if (operation == 1) { // Add vector
            vectors[idx] += scalar_or_x;
            vectors[idx + 1] += y;
            vectors[idx + 2] += z;
        }
    }
}

#endif // __wasm_simd128__

// Enhanced Imath functions with SIMD optimization

// Export core vector operations with SIMD acceleration
EMSCRIPTEN_KEEPALIVE
extern "C" {
    // SIMD-optimized Vec3f operations
    void* vec3f_create(float x, float y, float z) {
        return new V3f(x, y, z);
    }
    
    void vec3f_delete(V3f* vec) {
        delete vec;
    }
    
    float vec3f_dot(V3f* a, V3f* b) {
#ifdef __wasm_simd128__
        if (imath_has_simd()) {
            SIMDVec3f simd_a(*a);
            SIMDVec3f simd_b(*b);
            return simd_a.dot(simd_b);
        }
#endif
        return a->dot(*b);
    }
    
    void* vec3f_cross(V3f* a, V3f* b) {
#ifdef __wasm_simd128__
        if (imath_has_simd()) {
            SIMDVec3f simd_a(*a);
            SIMDVec3f simd_b(*b);
            SIMDVec3f result = simd_a.cross(simd_b);
            return new V3f(result.toV3f());
        }
#endif
        return new V3f(a->cross(*b));
    }
    
    float vec3f_length(V3f* vec) {
#ifdef __wasm_simd128__
        if (imath_has_simd()) {
            SIMDVec3f simd_vec(*vec);
            return simd_vec.length();
        }
#endif
        return vec->length();
    }
    
    void vec3f_normalize(V3f* vec) {
#ifdef __wasm_simd128__
        if (imath_has_simd()) {
            SIMDVec3f simd_vec(*vec);
            SIMDVec3f normalized = simd_vec.normalized();
            *vec = normalized.toV3f();
            return;
        }
#endif
        vec->normalize();
    }
    
    void vec3f_get_components(V3f* vec, float* x, float* y, float* z) {
        *x = vec->x;
        *y = vec->y;
        *z = vec->z;
    }
    
    // SIMD-optimized Matrix44f operations
    void* matrix44f_create() {
        return new M44f();
    }
    
    void* matrix44f_create_identity() {
        return new M44f(1.0f);
    }
    
    void matrix44f_delete(M44f* mat) {
        delete mat;
    }
    
    void* matrix44f_multiply(M44f* a, M44f* b) {
#ifdef __wasm_simd128__
        if (imath_has_simd()) {
            M44f* result = new M44f();
            simd_matrix44_multiply((const float*)a->getValue(), (const float*)b->getValue(), (float*)result->getValue());
            return result;
        }
#endif
        return new M44f(*a * *b);
    }
    
    void* matrix44f_inverse(M44f* mat) {
        return new M44f(mat->inverse());
    }
    
    void* matrix44f_transpose(M44f* mat) {
        return new M44f(mat->transpose());
    }
    
    void* matrix44f_translate(float x, float y, float z) {
        M44f* mat = new M44f();
        mat->translate(V3f(x, y, z));
        return mat;
    }
    
    void* matrix44f_scale(float x, float y, float z) {
        M44f* mat = new M44f();
        mat->scale(V3f(x, y, z));
        return mat;
    }
    
    void* matrix44f_rotate_x(float angle) {
        M44f* mat = new M44f();
        mat->rotate(V3f(angle, 0, 0));
        return mat;
    }
    
    void* matrix44f_rotate_y(float angle) {
        M44f* mat = new M44f();
        mat->rotate(V3f(0, angle, 0));
        return mat;
    }
    
    void* matrix44f_rotate_z(float angle) {
        M44f* mat = new M44f();
        mat->rotate(V3f(0, 0, angle));
        return mat;
    }
    
    void matrix44f_get_element(M44f* mat, int row, int col, float* value) {
        *value = (*mat)[row][col];
    }
    
    void matrix44f_set_element(M44f* mat, int row, int col, float value) {
        (*mat)[row][col] = value;
    }
    
    // SIMD-optimized Quaternion operations
    void* quatf_create(float w, float x, float y, float z) {
        return new Quatf(w, x, y, z);
    }
    
    void quatf_delete(Quatf* quat) {
        delete quat;
    }
    
    void* quatf_multiply(Quatf* a, Quatf* b) {
        return new Quatf(*a * *b);
    }
    
    void* quatf_slerp(Quatf* a, Quatf* b, float t) {
#ifdef __wasm_simd128__
        if (imath_has_simd()) {
            float result_w, result_x, result_y, result_z;
            simd_quat_slerp(a->r, a->v.x, a->v.y, a->v.z,
                           b->r, b->v.x, b->v.y, b->v.z,
                           t, &result_w, &result_x, &result_y, &result_z);
            return new Quatf(result_w, result_x, result_y, result_z);
        }
#endif
        return new Quatf(slerp(*a, *b, t));
    }
    
    void* quatf_to_matrix44(Quatf* quat) {
        return new M44f(quat->toMatrix44());
    }
    
    void quatf_normalize(Quatf* quat) {
        *quat = quat->normalized();
    }
    
    void quatf_get_components(Quatf* quat, float* w, float* x, float* y, float* z) {
        *w = quat->r;
        *x = quat->v.x;
        *y = quat->v.y;
        *z = quat->v.z;
    }
    
    // Box3f operations (unchanged - no significant SIMD benefit)
    void* box3f_create() {
        return new Box3f();
    }
    
    void* box3f_create_bounds(float minX, float minY, float minZ, 
                              float maxX, float maxY, float maxZ) {
        return new Box3f(V3f(minX, minY, minZ), V3f(maxX, maxY, maxZ));
    }
    
    void box3f_delete(Box3f* box) {
        delete box;
    }
    
    void box3f_extend_by_point(Box3f* box, float x, float y, float z) {
        box->extendBy(V3f(x, y, z));
    }
    
    void box3f_extend_by_box(Box3f* box, Box3f* other) {
        box->extendBy(*other);
    }
    
    int box3f_intersects(Box3f* a, Box3f* b) {
        return a->intersects(*b) ? 1 : 0;
    }
    
    int box3f_is_empty(Box3f* box) {
        return box->isEmpty() ? 1 : 0;
    }
    
    void box3f_get_center(Box3f* box, float* x, float* y, float* z) {
        V3f center = box->center();
        *x = center.x;
        *y = center.y;
        *z = center.z;
    }
    
    void box3f_get_size(Box3f* box, float* x, float* y, float* z) {
        V3f size = box->size();
        *x = size.x;
        *y = size.y;
        *z = size.z;
    }
    
    // Color operations (no significant SIMD benefit for individual operations)
    void* color3f_create(float r, float g, float b) {
        return new Color3f(r, g, b);
    }
    
    void color3f_delete(Color3f* color) {
        delete color;
    }
    
    void color3f_get_components(Color3f* color, float* r, float* g, float* b) {
        *r = color->x;
        *g = color->y;
        *b = color->z;
    }
    
    void* color3f_rgb_to_hsv(Color3f* rgb) {
        return new Color3f(rgb2hsv(*rgb));
    }
    
    void* color3f_hsv_to_rgb(Color3f* hsv) {
        return new Color3f(hsv2rgb(*hsv));
    }
    
    // Random number generation (unchanged)
    void* rand48_create(long seed) {
        return new Rand48(seed);
    }
    
    void rand48_delete(Rand48* rng) {
        delete rng;
    }
    
    float rand48_next_float(Rand48* rng) {
        return rng->nextf();
    }
    
    double rand48_next_double(Rand48* rng) {
        return rng->nextf();
    }
    
    // Utility functions
    float degrees_to_radians(float degrees) {
        return degrees * M_PI / 180.0f;
    }
    
    float radians_to_degrees(float radians) {
        return radians * 180.0f / M_PI;
    }
    
    float clamp_float(float value, float min_val, float max_val) {
        return clamp(value, min_val, max_val);
    }
    
    float lerp_float(float a, float b, float t) {
        return lerp(a, b, t);
    }
    
    // Math utilities
    int solve_quadratic(float a, float b, float c, float* x1, float* x2) {
        double dx1, dx2;
        int result = solveQuadratic(a, b, c, dx1, dx2);
        *x1 = (float)dx1;
        *x2 = (float)dx2;
        return result;
    }
    
    int solve_cubic(float a, float b, float c, float d, float* x1, float* x2, float* x3) {
        double dx1, dx2, dx3;
        int result = solveCubic(a, b, c, d, dx1, dx2, dx3);
        *x1 = (float)dx1;
        *x2 = (float)dx2;
        *x3 = (float)dx3;
        return result;
    }
    
    // SIMD-enhanced bulk operations
    void imath_process_vec3_array(float* vectors, int count, int operation, float scalar_or_x, float y, float z) {
#ifdef __wasm_simd128__
        if (imath_has_simd() && count >= 4) {
            simd_process_vec3_array(vectors, count, operation, scalar_or_x, y, z);
            return;
        }
#endif
        
        // Fallback implementation
        for (int i = 0; i < count; i++) {
            int idx = i * 3;
            if (operation == 0) { // Scale
                vectors[idx] *= scalar_or_x;
                vectors[idx + 1] *= scalar_or_x;
                vectors[idx + 2] *= scalar_or_x;
            } else if (operation == 1) { // Add vector
                vectors[idx] += scalar_or_x;
                vectors[idx + 1] += y;
                vectors[idx + 2] += z;
            }
        }
    }
    
    // Performance benchmarking functions
    double imath_benchmark_vec3_ops(int vector_count, int iterations) {
        V3f* vectors = new V3f[vector_count];
        
        // Initialize with random data
        for (int i = 0; i < vector_count; i++) {
            vectors[i] = V3f(float(i), float(i + 1), float(i + 2));
        }
        
        double start_time = emscripten_get_now();
        
        // Benchmark dot product operations
        volatile float result = 0.0f;
        for (int iter = 0; iter < iterations; iter++) {
            for (int i = 0; i < vector_count - 1; i++) {
                result += vec3f_dot(&vectors[i], &vectors[i + 1]);
            }
        }
        
        double end_time = emscripten_get_now();
        delete[] vectors;
        
        // Return operations per second
        double total_time = (end_time - start_time) / 1000.0;
        double total_ops = (double)vector_count * iterations;
        return total_ops / total_time;
    }
    
    double imath_benchmark_matrix_ops(int matrix_count, int iterations) {
        M44f* matrices_a = new M44f[matrix_count];
        M44f* matrices_b = new M44f[matrix_count];
        
        // Initialize with test data
        for (int i = 0; i < matrix_count; i++) {
            matrices_a[i] = M44f();
            matrices_a[i].translate(V3f(float(i), float(i + 1), float(i + 2)));
            matrices_b[i] = M44f();
            matrices_b[i].scale(V3f(2.0f, 2.0f, 2.0f));
        }
        
        double start_time = emscripten_get_now();
        
        // Benchmark matrix multiplication
        for (int iter = 0; iter < iterations; iter++) {
            for (int i = 0; i < matrix_count; i++) {
                M44f* result = (M44f*)matrix44f_multiply(&matrices_a[i], &matrices_b[i]);
                delete result; // Clean up immediately
            }
        }
        
        double end_time = emscripten_get_now();
        delete[] matrices_a;
        delete[] matrices_b;
        
        // Return operations per second
        double total_time = (end_time - start_time) / 1000.0;
        double total_ops = (double)matrix_count * iterations;
        return total_ops / total_time;
    }
    
    // SIMD feature detection
    void imath_get_performance_info(int* has_simd, int* vec3_threshold, int* matrix_threshold) {
        *has_simd = imath_has_simd();
        *vec3_threshold = 4;  // Minimum vector count for SIMD operations
        *matrix_threshold = 1; // Always beneficial for matrix operations
    }
    
    const char* imath_get_version() {
        return imath_has_simd() ? "Imath-WASM-SIMD-3.1" : "Imath-WASM-3.1";
    }
}

// Enhanced Embind interface with SIMD-optimized operations
EMSCRIPTEN_BINDINGS(imath) {
    class_<V3f>("Vec3f")
        .constructor<float, float, float>()
        .property("x", &V3f::x)
        .property("y", &V3f::y)
        .property("z", &V3f::z)
        .function("dot", &V3f::dot)
        .function("cross", &V3f::cross)
        .function("length", &V3f::length)
        .function("normalize", &V3f::normalize)
        .function("normalized", &V3f::normalized);
    
    class_<M44f>("Matrix44f")
        .constructor<>()
        .constructor<float>()
        .function("multiply", optional_override([](const M44f& self, const M44f& other) {
            return self * other;
        }))
        .function("inverse", &M44f::inverse)
        .function("transpose", &M44f::transpose)
        .function("translate", select_overload<M44f&(const V3f&)>(&M44f::translate))
        .function("scale", select_overload<M44f&(const V3f&)>(&M44f::scale))
        .function("rotate", select_overload<M44f&(const V3f&)>(&M44f::rotate));
    
    class_<Quatf>("Quatf")
        .constructor<>()
        .constructor<float, float, float, float>()
        .property("r", &Quatf::r)
        .function("multiply", optional_override([](const Quatf& self, const Quatf& other) {
            return self * other;
        }))
        .function("normalized", &Quatf::normalized)
        .function("toMatrix44", &Quatf::toMatrix44);
    
    class_<Box3f>("Box3f")
        .constructor<>()
        .constructor<const V3f&, const V3f&>()
        .function("extendBy", select_overload<void(const V3f&)>(&Box3f::extendBy))
        .function("intersects", &Box3f::intersects)
        .function("isEmpty", &Box3f::isEmpty)
        .function("center", &Box3f::center)
        .function("size", &Box3f::size);
    
    class_<Color3f>("Color3f")
        .constructor<float, float, float>()
        .property("x", &Color3f::x)
        .property("y", &Color3f::y)
        .property("z", &Color3f::z);
    
    function("degreesToRadians", &degrees_to_radians);
    function("radiansToDegrees", &radians_to_degrees);
    function("clamp", &clamp_float);
    function("lerp", &lerp_float);
    function("rgb2hsv", &rgb2hsv);
    function("hsv2rgb", &hsv2rgb);
    function("slerp", select_overload<Quatf(const Quatf&, const Quatf&, float)>(&slerp));
    
    // SIMD-enhanced functions
    function("hasSIMD", &imath_has_simd);
    function("getVersion", &imath_get_version);
    function("processVec3Array", &imath_process_vec3_array);
    function("benchmarkVec3Ops", &imath_benchmark_vec3_ops);
    function("benchmarkMatrixOps", &imath_benchmark_matrix_ops);
}