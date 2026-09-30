export class RuntimeEngine {
    constructor() {
        this.state = {
            callStack: [],
            webApis: [],
            microtaskQueue: [],
            taskQueue: [],
            eventLoop: {
                status: "idle"
            },
            console: [],
            status: "idle"
        };
    }

    processEvent(event) {
        switch (event.type) {
            case "CALL_START":
                this.callStackStart(event);
                break;

            case "CALL_END":
                this.callStackEnd(event);
                break;

            case "CONSOLE_OUTPUT":
                this.consoleOutput(event);
                break;

            default:
                console.warn("Unknown event:", event);
        }
    }

    callStackStart(event) {
        this.state.callStack.push(event.name);
    }

    callStackEnd(event) {
        this.state.callStack.pop();
    }

    consoleOutput(event) {
        this.state.console.push(event.value);
    }
}