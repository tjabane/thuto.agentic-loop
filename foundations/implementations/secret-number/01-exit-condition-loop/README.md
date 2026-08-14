# Exercise 1: A loop with an exit condition

## Objective

Build a small program that repeatedly guesses a hidden number and exits when it
finds the correct number.

The purpose of this exercise is to understand the mechanics that later form an
agentic loop:

1. Choose an action.
2. Perform the action.
3. Observe the result.
4. Decide whether to continue or exit.

Do not use an LLM, agent framework, classes, or external packages for this
exercise.

## The problem

The program has a hidden whole number between 1 and 100.

On each iteration, the program must make a guess. Comparing the guess with the
hidden number produces exactly one observation:

- `too low`
- `too high`
- `correct`

The next guess should use previous observations. It should not simply try random
numbers or enumerate every number from 1 to 100.

## Exit conditions

The loop must stop for one of two reasons:

1. **Success:** the observation is `correct`.
2. **Safety limit:** the program reaches 10 guesses without succeeding.

The program must clearly report which exit condition stopped the loop.

## Required output

For every iteration, print:

- the iteration number;
- the guess;
- the resulting observation.

After the loop, print:

- why the loop stopped;
- the correct guess when the program succeeds.

## Acceptance criteria

- The hidden number can be changed without changing the loop itself.
- No guess falls outside the range 1 through 100.
- Every new guess is informed by earlier observations.
- The loop exits immediately after a correct guess.
- The loop cannot execute more than 10 times.
- Hidden numbers `1`, `50`, `73`, and `100` can all be found successfully.

## Questions to answer after implementing it

1. What information must persist between iterations?
2. Which part chooses the next action?
3. Which part represents the environment's feedback?
4. Should the success condition be checked before or after recording an
   observation? Why?
5. Why is a maximum-iteration condition necessary even when the strategy seems
   guaranteed to succeed?

## Connection to ReAct

Once the exercise works, its pieces can be renamed without changing the basic
control flow:

- choosing a guess becomes **reasoning**;
- making a guess becomes an **action**;
- `too low`, `too high`, or `correct` becomes an **observation**;
- checking success and the safety limit becomes **termination**.

That transformation will be the next exercise. Do not implement it yet.
