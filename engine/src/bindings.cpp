#include <emscripten/bind.h>

#include "fsrs.h"

using namespace emscripten;

// lets the web app call the engine
EMSCRIPTEN_BINDINGS(fsrs) {
    enum_<fsrs::Rating>("Rating")
        .value("Again", fsrs::Rating::Again)
        .value("Hard", fsrs::Rating::Hard)
        .value("Good", fsrs::Rating::Good)
        .value("Easy", fsrs::Rating::Easy);

    value_object<fsrs::MemoryState>("MemoryState")
        .field("stability", &fsrs::MemoryState::stability)
        .field("difficulty", &fsrs::MemoryState::difficulty);

    function("retrievability", &fsrs::retrievability);
    function("nextInterval", &fsrs::nextInterval);
    function("initialState", &fsrs::initialState);
    function("review", &fsrs::review);
}