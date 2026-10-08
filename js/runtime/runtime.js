import { ExecutionContext } from "./execution-context.js";


export class RuntimeEngine {

    constructor() {

        this.state = {
            callStack: [],

            webApis: [],

            microtaskQueue: [],

            taskQueue: [],

            promises: [],

            eventLoop: {
                status: "idle"
            },

            console: [],

            status: "idle",

            activeLine: null
        };
    }


    processEvent(event) {

        if (event.line !== undefined) {
            this.state.activeLine = event.line;
        }

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

            case "VARIABLE_UPDATE":
                this.variableUpdate(event);
                break;

            case "CONSOLE_OUTPUT":
                this.consoleOutput(event);
                break;

            case "TIMER_START":
                this.timerStart(event);
                break;

            case "TIMER_DONE":
                this.timerDone(event);
                break;

            case "TASK_START":
                this.taskStart(event);
                break;

            case "MICROTASK_ADD":
                this.microtaskAdd(event);
                break;

            case "MICROTASK_START":
                this.microtaskStart(event);
                break;

            case "PROMISE_UPDATE":
                this.promiseUpdate(event);
                break;

            case "ERROR":
                this.state.console.push(event.message);
                this.state.callStack = [];
                this.state.eventLoop.status = "stopped because of an error";
                break;

            case "EVENT_LOOP":
                this.state.eventLoop.status = event.status;
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

        if (this.state.callStack.length === 0) {
            this.state.eventLoop.status = "running main script";
        }

        this.state.callStack.push(context);
    }


    callStackEnd(event) {

        this.state.callStack.pop();

        if (this.state.callStack.length === 0) {
            this.state.eventLoop.status =
                "call stack empty, checking microtasks, then tasks";
        }
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


    variableUpdate(event) {

        // Find the most recent context that has this variable and update it
        for (let i = this.state.callStack.length - 1; i >= 0; i--) {
            const context = this.state.callStack[i];
            if (context.hasVariable(event.name)) {
                context.updateVariable(event.name, event.value);
                return;
            }
        }
        
        // Fallback if not found in any context
        const currentContext = this.getCurrentContext();
        if (currentContext) {
            currentContext.updateVariable(event.name, event.value);
        }
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


    timerStart(event) {

        this.state.webApis.push({
            id: event.id,
            label: event.label
        });
    }


    timerDone(event) {

        const index = this.state.webApis.findIndex(
            (item) => item.id === event.id
        );

        const [item] = this.state.webApis.splice(index, 1);

        this.state.eventLoop.status = "timer finished, moving callback to task queue";

        this.state.taskQueue.push(item);
    }


    taskStart(event) {

        const index = this.state.taskQueue.findIndex(
            (item) => item.id === event.id
        );

        this.state.taskQueue.splice(index, 1);

        this.state.eventLoop.status = "moving task from task queue to call stack";

        this.state.callStack.push(
            new ExecutionContext(event.name, "callback")
        );
    }


    microtaskAdd(event) {

        this.state.microtaskQueue.push({
            id: event.id,
            label: event.label
        });
    }


    microtaskStart(event) {

        const index = this.state.microtaskQueue.findIndex(
            (item) => item.id === event.id
        );

        this.state.microtaskQueue.splice(index, 1);

        this.state.eventLoop.status = "moving microtask to call stack";

        this.state.callStack.push(
            new ExecutionContext(event.name, "callback")
        );
    }


    promiseUpdate(event) {

        const existing = this.state.promises.find(
            (item) => item.id === event.id
        );

        if (existing) {
            existing.state = event.state;
            existing.value = event.value;
            return;
        }

        this.state.promises.push({
            id: event.id,
            state: event.state,
            value: event.value
        });
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

            promises: [],

            eventLoop: {
                status: "idle"
            },

            console: [],

            status: "idle",

            activeLine: null
        };
    }
}