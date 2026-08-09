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

    public isRunning(): boolean {
        return this.state.status === "running";
    }

    public GetNextAction(): Action {
        const value = this.reason();
        return { value, type: "guess" };
    }

    public UpdateState(action: Action, observation: Observation): void {
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

function findSecretNumber(secretNumber: number): number {
    let maxAttempts = 10;
    const initialState: State = {
        interval: [1, 100],
        history: [],
        status: "running"
    };
    const agent = new Agent(initialState);
    const environment = new Environment(secretNumber);
    let lastAction: Action | undefined;

    while(agent.isRunning() && maxAttempts > 0)
    {
        const action = agent.GetNextAction();
        lastAction = action;
        const observation = environment.GetObservation(action);
        agent.UpdateState(action, observation);
        maxAttempts--;
    }

    if (!agent.isRunning() && lastAction) {
        return lastAction.value;
    }

    return -1; // Return -1 if the secret number is not found within the maximum attempts
}

export { findSecretNumber };
