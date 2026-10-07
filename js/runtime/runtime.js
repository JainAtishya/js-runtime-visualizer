import { ExecutionContext } from "./execution-context.js";


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

            case "VARIABLE_DECLARE":
                this.variableDeclare(event);
                break;

            case "CONSOLE_OUTPUT":
                this.consoleOutput(event);
                break;

            default:
                console.warn("Unknown event:", event);
        }
    }


    callStackStart(event) {

        const context = new ExecutionContext(
            event.name,
            event.contextType || "function"
        );

        this.state.callStack.push(context);
    }


    callStackEnd(event) {

        this.state.callStack.pop();
    }


    variableDeclare(event) {

        const currentContext = this.getCurrentContext();

        if (!currentContext) {
            console.warn(
                "Cannot declare variable without execution context"
            );

            return;
        }

        currentContext.declareVariable(
            event.name,
            event.value
        );
    }


    getCurrentContext() {

        if (this.state.callStack.length === 0) {
            return null;
        }

        return this.state.callStack[
            this.state.callStack.length - 1
        ];
    }


    getVariable(name) {

        for (
            let i = this.state.callStack.length - 1;
            i >= 0;
            i--
        ) {

            const context = this.state.callStack[i];

            if (context.hasVariable(name)) {
                return context.getVariable(name);
            }
        }

        return undefined;
    }


    consoleOutput(event) {

        this.state.console.push(event.value);
    }


    reset() {

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
}