import type { Card } from "@/scheduler/types";
import type { Deck } from "@/scheduler/types";

export const SAMPLE_DECK_ID = "cs-fundamentals";

function createUnstudiedCard(id: string, front: string, back: string): Card {
    return {
        id,
        deckId: SAMPLE_DECK_ID,
        deletedAt: null,
        front,
        back,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
        dueAt: 0, // 0 = long ago, so new cards are due right away
        reviewCount: 0,
        forgetCount: 0,
        studyPhase: "New",
    };
}

export const sampleDecks: Deck[] = [
    {id: SAMPLE_DECK_ID, name: "CS Fundamentals", parentDeckId: null, deletedAt: null,},
];

export const sampleCards: Card[] = [
    createUnstudiedCard(
        "1",
        "What is the difference between a variable and a constant?",
        "A variable holds a value that can change while the program runs. A constant holds a fixed value that cannot be changed once it is set."
    ),
    createUnstudiedCard(
        "2",
        "What is the main difference between an Array and a List?",
        "An array has a fixed size set when you create it. A list can dynamically grow or shrink in size as you add or remove items."
    ),
    createUnstudiedCard(
        "3",
        "What is an infinite loop, and how do you avoid it?",
        "A loop that never stops running because its exit condition is never met. You avoid it by making sure the loop variable updates properly on every turn."
    ),
    createUnstudiedCard(
        "4",
        "What is the difference between a function parameter and a function argument?",
        "A parameter is the placeholder variable defined in the function definition. An argument is the actual value you pass into the function when you call it."
    ),
    createUnstudiedCard(
        "5",
        "What are the four basic data types used in programming?",
        "Integers (whole numbers), Floats (decimal numbers), Booleans (true/false), and Strings (text)."
    ),
    createUnstudiedCard(
        "6",
        "What does an If-Else statement do in code?",
        "It controls the flow of a program by running one block of code if a condition is true, and a different block of code if it is false."
    ),
    createUnstudiedCard(
        "7",
        "What is the difference between the assignment operator (=) and the comparison operator (==)?",
        "A single equals sign (=) stores a value inside a variable. A double equals sign (==) checks if two values are equal to each other."
    ),
    createUnstudiedCard(
        "8",
        "What is a compiler?",
        "A software tool that translates human-readable source code into machine code (0s and 1s) all at once before the program runs."
    ),
    createUnstudiedCard(
        "9",
        "What is the difference between a For loop and a While loop?",
        "A For loop is best when you know exactly how many times you want to repeat code. A While loop is best when you want to repeat code until a certain condition changes."
    ),
    createUnstudiedCard(
        "10",
        "What is debugging?",
        "The process of finding, tracking down, and fixing errors (bugs) in a software program."
    ),
    createUnstudiedCard(
        "11",
        "What does it mean when an index is out of bounds?",
        "An error that happens when you try to access an element at a position that does not exist in an array or list (like trying to get the 5th item of a 3-item list)."
    ),
    createUnstudiedCard(
        "12",
        "What is the function of the Return keyword in a program?",
        "It exits a function immediately and passes a specific value back to the piece of code that called the function."
    ),
    createUnstudiedCard(
        "13",
        "What is a Null pointer or Null reference error?",
        "An error that happens when your code tries to use or look at an object variable that is currently empty and points to nothing (null)."
    ),
    createUnstudiedCard(
        "14",
        "What is recursion in computer science?",
        "A programming technique where a function solves a problem by calling itself."
    ),
    createUnstudiedCard(
        "15",
        "What is the difference between source code and machine code?",
        "Source code is written by humans in high-level programming languages (like Python or JavaScript). Machine code consists of binary instructions (0s and 1s) directly read by the computer CPU."
    )
];
