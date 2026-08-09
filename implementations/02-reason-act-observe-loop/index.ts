type Observation = "too low" | "too high" | "correct";
type Status = "running" | "succeeded";
type Interval = [number, number];

interface Action {
    value: number;
    type: "guess";
}

interface HistoryEntry {
    action: Action;
    observation: Observation;
}

interface State {
    interval: Interval;
    history: HistoryEntry[];
    status: Status;
}

class Agent {
    private state: State;

    constructor(state: State) {
        this.state = state;
    }

    private reason(): number {
        const [low, high] = this.state.interval;
        return Math.floor((low + high) / 2);
    }

    private GetNextAction(): Action {
        const value = this.reason();
        return { value, type: "guess" };
    }

    private UpdateState(action: Action, observation: Observation): void {
        let [low, high] = this.state.interval;
        this.state.history.push({ action, observation });

        if (observation === "correct") {
            this.state.status = "succeeded";
            return;
        }

        switch (observation) {
            case "too low":
                low = action.value + 1;
                break;
            case "too high":
                high = action.value - 1;
                break;
        }

        this.state.interval = [low, high];
    }

    public run(environment: Environment, maxAttempts: number): number {
        let attemptsRemaining = maxAttempts;
        let lastAction: Action | undefined;

        while (this.state.status === "running" && attemptsRemaining > 0) {
            const action = this.GetNextAction();
            lastAction = action;
            const observation = environment.GetObservation(action);
            this.UpdateState(action, observation);
            attemptsRemaining--;
        }

        if (this.state.status === "succeeded" && lastAction) {
            return lastAction.value;
        }

        return -1;
    }
}

class Environment {
    private secretNumber: number;

    constructor(secretNumber: number) {
        this.secretNumber = secretNumber;
    }

    public GetObservation(action: Action): Observation {
        if (action.value < this.secretNumber) {
            return "too low";
        } else if (action.value > this.secretNumber) {
            return "too high";
        } else {
            return "correct";
        }
    }
}

export { Agent, Environment };
