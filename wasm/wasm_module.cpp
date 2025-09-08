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

using namespace Imath;
using namespace emscripten;

// Export core vector operations
EMSCRIPTEN_KEEPALIVE
extern "C" {
    // Vec3f operations
    void* vec3f_create(float x, float y, float z) {
        return new V3f(x, y, z);
    }
    
    void vec3f_delete(V3f* vec) {
        delete vec;
    }
    
    float vec3f_dot(V3f* a, V3f* b) {
        return a->dot(*b);
    }
    
    void* vec3f_cross(V3f* a, V3f* b) {
        return new V3f(a->cross(*b));
    }
    
    float vec3f_length(V3f* vec) {
        return vec->length();
    }
    
    void vec3f_normalize(V3f* vec) {
        vec->normalize();
    }
    
    void vec3f_get_components(V3f* vec, float* x, float* y, float* z) {
        *x = vec->x;
        *y = vec->y;
        *z = vec->z;
    }
    
    // Matrix44f operations
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
    
    // Quaternion operations
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
    
    // Box3f operations
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
    
    // Color operations
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
    
    // Random number generation
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
}

// Embind interface for more natural JavaScript usage
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
}