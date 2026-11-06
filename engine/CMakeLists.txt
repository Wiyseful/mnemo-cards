cmake_minimum_required(VERSION 3.24)
project(mnemo_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# The scheduling engine itself: the code that later compiles to WebAssembly.
add_library(fsrs src/fsrs.cpp)
target_include_directories(fsrs PUBLIC include)
target_compile_options(fsrs PRIVATE -Wall -Wextra -Wpedantic)

# Tests run as normal native C++ (fast, easy to debug).
# GoogleTest is downloaded automatically unless it is already installed.
include(FetchContent)
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.tar.gz
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    FIND_PACKAGE_ARGS NAMES GTest  # use an installed GoogleTest if there is one
)
FetchContent_MakeAvailable(googletest)

enable_testing()
add_executable(fsrs_test tests/fsrs_test.cpp)
target_link_libraries(fsrs_test PRIVATE fsrs GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(fsrs_test)
