type Observation = "too low" | "too high" | "correct";

const MAX_ATTEMPTS = 10;

function findSecretNumber(
    secretNumber: number,
    minimum: number = 1,
    maximum: number = 100,
): number {
    validateRange(secretNumber, minimum, maximum);

    let lowerBound = minimum;
    let upperBound = maximum;

    for (let iteration = 1; iteration <= MAX_ATTEMPTS; iteration++) {
        const guess = Math.floor((lowerBound + upperBound) / 2);
        const observation = observeGuess(guess, secretNumber);

        console.log(
            `Iteration ${iteration}: guess ${guess} - ${observation}`,
        );

        if (observation === "correct") {
            console.log(`Stopped: success. Correct guess: ${guess}`);
            return guess;
        }

        if (observation === "too low") {
            lowerBound = guess + 1;
        } else {
            upperBound = guess - 1;
        }
    }

    console.log(`Stopped: safety limit of ${MAX_ATTEMPTS} guesses reached.`);
    return -1;
}

function observeGuess(guess: number, secretNumber: number): Observation {
    if (guess === secretNumber) {
        return "correct";
    }

    return guess < secretNumber ? "too low" : "too high";
}

function validateRange(
    secretNumber: number,
    minimum: number,
    maximum: number,
): void {
    if (![secretNumber, minimum, maximum].every(Number.isInteger)) {
        throw new TypeError("The secret number and bounds must be whole numbers.");
    }

    if (minimum > maximum) {
        throw new RangeError("The minimum cannot be greater than the maximum.");
    }

    if (secretNumber < minimum || secretNumber > maximum) {
        throw new RangeError("The secret number must be within the search range.");
    }
}

export { findSecretNumber };
