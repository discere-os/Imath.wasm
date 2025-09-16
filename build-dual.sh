#!/bin/bash
# build-dual.sh - Dual build system for Imath.wasm
#
# Copyright (c) Contributors to the OpenEXR Project
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Licensed under BSD-3-Clause

set -euo pipefail

VARIANT="${1:-all}"
BUILD_DIR="${BUILD_DIR:-./build-dual}"
INSTALL_PREFIX="${INSTALL_PREFIX:-$(pwd)/install}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking build prerequisites..."

    if ! command -v emcc &> /dev/null; then
        log_error "Emscripten not found. Please install and activate EMSDK."
        exit 1
    fi

    if ! command -v emcmake &> /dev/null; then
        log_error "emcmake not found. Please activate EMSDK."
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Build SIDE_MODULE (production)
build_side_module() {
    log_info "Building Imath-side.wasm for production..."
    mkdir -p "${BUILD_DIR}-side"
    cd "${BUILD_DIR}-side"

    # Configure CMake for SIDE_MODULE build
    emcmake cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_SIDE_MODULE=ON \
        -DCMAKE_C_FLAGS="-O3 -flto -msimd128 -fPIC" \
        -DCMAKE_CXX_FLAGS="-O3 -flto -msimd128 -fPIC -std=c++17" \
        -DCMAKE_EXE_LINKER_FLAGS="-sSIDE_MODULE=2 -sSTANDALONE_WASM=1" \
        -DCMAKE_INSTALL_PREFIX="${INSTALL_PREFIX}" \
        -DIMATH_INSTALL=OFF \
        -DPYTHON=OFF \
        -DPYBIND11=OFF

    # Build the library
    emmake make -j$(nproc) Imath

    # Create SIDE_MODULE with essential math functions
    emcc $(find . -name "*.o" | grep -E "(half|ImathColorAlgo|ImathMatrixAlgo|ImathRandom|ImathFun|toFloat)" | tr '\n' ' ') \
        ../wasm/imath_wasm_side.cpp \
        -I../src/Imath \
        -I./config \
        -O3 -flto -msimd128 -fPIC \
        -sSIDE_MODULE=2 \
        -sSTANDALONE_WASM=1 \
        -sEXPORTED_FUNCTIONS='["_imath_vec3_add","_imath_vec3_dot","_imath_vec3_cross","_imath_vec3_normalize","_imath_matrix44_multiply","_imath_matrix44_inverse","_imath_matrix44_transpose","_imath_quat_slerp","_imath_quat_normalize","_half_to_float","_float_to_half","_imath_euler_to_matrix","_imath_matrix_to_euler","_imath_frustum_projection","_imath_perspective_projection","_imath_vec3_simd_add","_imath_vec4_simd_dot","_imath_matrix44_simd_multiply"]' \
        -o Imath-side.wasm

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp Imath-side.wasm "${INSTALL_PREFIX}/wasm/"

    log_success "SIDE_MODULE: ${INSTALL_PREFIX}/wasm/Imath-side.wasm"
    log_info "Size: $(stat -c%s "${INSTALL_PREFIX}/wasm/Imath-side.wasm" | numfmt --to=iec)"
    cd ..
}

# Build MAIN_MODULE (testing/NPM)
build_main_module() {
    log_info "Building Imath-main.js for testing..."
    mkdir -p "${BUILD_DIR}-main"
    cd "${BUILD_DIR}-main"

    # Configure CMake for MAIN_MODULE build
    emcmake cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_MAIN_MODULE=ON \
        -DCMAKE_C_FLAGS="-O3 -flto -msimd128" \
        -DCMAKE_CXX_FLAGS="-O3 -flto -msimd128 -std=c++17" \
        -DCMAKE_EXE_LINKER_FLAGS="-sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=ImathModule -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=67108864 -sMAXIMUM_MEMORY=536870912" \
        -DCMAKE_INSTALL_PREFIX="${INSTALL_PREFIX}" \
        -DIMATH_INSTALL=OFF \
        -DPYTHON=OFF \
        -DPYBIND11=OFF

    # Build the library
    emmake make -j$(nproc) Imath

    # Create MAIN_MODULE with all runtime support
    emcc $(find . -name "*.o" | grep -E "(half|ImathColorAlgo|ImathMatrixAlgo|ImathRandom|ImathFun|toFloat)" | tr '\n' ' ') \
        ../wasm/imath_wasm_main.cpp \
        -I../src/Imath \
        -I./config \
        -O3 -flto -msimd128 \
        -sMODULARIZE=1 \
        -sEXPORT_ES6=1 \
        -sEXPORT_NAME="ImathModule" \
        -sEXPORTED_FUNCTIONS='["_malloc","_free","_imath_vec3_add","_imath_vec3_dot","_imath_vec3_cross","_imath_vec3_normalize","_imath_matrix44_multiply","_imath_matrix44_inverse","_imath_matrix44_transpose","_imath_quat_slerp","_imath_quat_normalize","_half_to_float","_float_to_half","_imath_euler_to_matrix","_imath_matrix_to_euler","_imath_frustum_projection","_imath_perspective_projection","_imath_vec3_simd_add","_imath_vec4_simd_dot","_imath_matrix44_simd_multiply"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","HEAPU8","HEAPF32","HEAPF64"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sINITIAL_MEMORY=67108864 \
        -sMAXIMUM_MEMORY=536870912 \
        -o Imath-main.js

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp Imath-main.js "${INSTALL_PREFIX}/wasm/"
    cp Imath-main.wasm "${INSTALL_PREFIX}/wasm/"

    log_success "MAIN_MODULE: ${INSTALL_PREFIX}/wasm/Imath-main.js"
    log_info "JS Size: $(stat -c%s "${INSTALL_PREFIX}/wasm/Imath-main.js" | numfmt --to=iec)"
    log_info "WASM Size: $(stat -c%s "${INSTALL_PREFIX}/wasm/Imath-main.wasm" | numfmt --to=iec)"
    cd ..
}

# Performance report
generate_report() {
    if [ -d "${INSTALL_PREFIX}/wasm" ]; then
        log_info "Build Summary:"
        echo "  SIDE_MODULE: $(stat -c%s "${INSTALL_PREFIX}/wasm/Imath-side.wasm" 2>/dev/null | numfmt --to=iec || echo "N/A")"
        echo "  MAIN_MODULE: $(stat -c%s "${INSTALL_PREFIX}/wasm/Imath-main.wasm" 2>/dev/null | numfmt --to=iec || echo "N/A")"
        echo "  JavaScript: $(stat -c%s "${INSTALL_PREFIX}/wasm/Imath-main.js" 2>/dev/null | numfmt --to=iec || echo "N/A")"
        echo "  Build flags: O3 + LTO + SIMD"
        echo "  Functions: Vector ops, Matrix ops, Quaternions, Half-float"
    fi
}

case "$VARIANT" in
    side) check_prerequisites && build_side_module && generate_report ;;
    main) check_prerequisites && build_main_module && generate_report ;;
    all) check_prerequisites && build_side_module && build_main_module && generate_report ;;
    clean) rm -rf "${BUILD_DIR}"* "${INSTALL_PREFIX}" && log_success "Clean completed" ;;
    *) echo "Usage: $0 [side|main|all|clean]"; exit 1 ;;
esac