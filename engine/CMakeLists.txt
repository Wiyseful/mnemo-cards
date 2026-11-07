cmake_minimum_required(VERSION 3.24)
project(mnemo_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# the engine
add_library(fsrs src/fsrs.cpp)
target_include_directories(fsrs PUBLIC include)
target_compile_options(fsrs PRIVATE -Wall -Wextra -Wpedantic)

if(EMSCRIPTEN)
    # web build: turns the engine into fsrs.js + fsrs.wasm for the app
    target_compile_options(fsrs PRIVATE -fwasm-exceptions)

    add_executable(fsrs_wasm src/bindings.cpp)
    target_link_libraries(fsrs_wasm PRIVATE fsrs)
    target_compile_options(fsrs_wasm PRIVATE -fwasm-exceptions)
    target_link_options(fsrs_wasm PRIVATE
        -lembind
        -fwasm-exceptions
        -sMODULARIZE=1
        -sEXPORT_ES6=1
        -sENVIRONMENT=web,node
        -sSINGLE_FILE=1
        --emit-tsd fsrs.d.ts

    )
    set_target_properties(fsrs_wasm PROPERTIES
        OUTPUT_NAME fsrs
        RUNTIME_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/../src/engine/generated
    )
else()
    # normal build: run the tests
    include(FetchContent)
    FetchContent_Declare(
        googletest
        URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.tar.gz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
        FIND_PACKAGE_ARGS NAMES GTest
    )
    FetchContent_MakeAvailable(googletest)

    enable_testing()
    add_executable(fsrs_test tests/fsrs_test.cpp)
    target_link_libraries(fsrs_test PRIVATE fsrs GTest::gtest_main)

    include(GoogleTest)
    gtest_discover_tests(fsrs_test)
endif()