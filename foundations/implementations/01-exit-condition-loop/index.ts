type Observation = "too low" | "too high" | "correct";
const MAX_ATTEMPTS = 10;

function findSecretNumber(
    secretNumber: number,
    minimum: number = 1,
    maximum: number = 100,
): number {
    let attempts: number = 0;
    let guess: number = getRandonNuberInclusive(minimum, maximum);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const observation: Observation = getObservation(guess, secretNumber);
        console.log(`Iteration ${attempts}: guess ${guess} is ${observation}`);
        console.log(`Current range: ${minimum} to ${maximum}`);
        if(observation === "correct") {
            return guess;
        }
        if (observation === "too high") {
            maximum = guess - 1;
        }
        if (observation === "too low") {
            minimum = guess + 1;
        }
        guess = getRandonNuberInclusive(minimum, maximum);
        attempts++;
    }

    throw new Error(`Failed to find the secret number ${secretNumber} within ${MAX_ATTEMPTS} attempts.`);
}

function getObservation(guess: number, secretNumber: number): Observation {
    if (guess < secretNumber) {
        return "too low";
    }
    if (guess > secretNumber) {
        return "too high";
    }
    return "correct";
}

function getRandonNuberInclusive(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export { findSecretNumber };
