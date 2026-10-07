import { ASTVisitor } from "./ast-visitor.js";
import { evaluateExpression } from "./expression-evaluator.js";


export class EventGenerator extends ASTVisitor {

    constructor() {
        super();

        this.timeline = [];
        this.variables = {};
        this.timers = [];
        this.nextTimerId = 1;
        this.now = 0;
        this.microtasks = [];
        this.nextMicrotaskId = 1;
    }


    generate(ast) {

        this.timeline = [];
        this.variables = {};
        this.timers = [];
        this.nextTimerId = 1;
        this.now = 0;
        this.microtasks = [];
        this.nextMicrotaskId = 1;

        this.visit(ast);

        return this.timeline;
    }


    visitProgram(node) {

        this.timeline.push({
            type: "CALL_START",
            name: "global"
        });

        for (const statement of node.body) {
            this.visit(statement);
        }

        this.timeline.push({
            type: "CALL_END",
            name: "global"
        });

        this.runMicrotasks();
        this.runTimers();
    }


    runMicrotasks() {

        while (this.microtasks.length > 0) {

            const task = this.microtasks.shift();

            this.timeline.push({
                type: "MICROTASK_START",
                id: task.id,
                name: `${task.label} callback`
            });

            this.visitFunctionBody(task.callback);

            this.timeline.push({
                type: "CALL_END",
                name: `${task.label} callback`
            });

            if (task.next.length > 0) {
                this.addMicrotask(task.label, task.next[0], task.next.slice(1));
            }
        }
    }


    addMicrotask(label, callback, next = []) {

        const task = {
            id: this.nextMicrotaskId++,
            label: label,
            callback: callback,
            next: next
        };

        this.microtasks.push(task);

        this.timeline.push({
            type: "MICROTASK_ADD",
            id: task.id,
            label: label
        });
    }


    runTimers() {

        while (this.timers.length > 0) {

            this.timers.sort(
                (a, b) => a.time - b.time || a.id - b.id
            );

            const timer = this.timers.shift();

            this.now = timer.time;

            this.timeline.push({
                type: "TIMER_DONE",
                id: timer.id
            });

            this.timeline.push({
                type: "TASK_START",
                id: timer.id,
                name: "setTimeout callback"
            });

            this.visitFunctionBody(timer.callback);

            this.timeline.push({
                type: "CALL_END",
                name: "setTimeout callback"
            });

            this.runMicrotasks();
        }
    }


    visitFunctionBody(fn) {

        if (fn.body.type === "BlockStatement") {
            for (const statement of fn.body.body) {
                this.visit(statement);
            }
        } else {
            this.visit(fn.body);
        }
    }


    visitVariableDeclaration(node) {

        for (const declaration of node.declarations) {
            this.visit(declaration);
        }
    }


    visitVariableDeclarator(node) {

        const name = node.id.name;

        const value = this.evaluateNode(node.init);

        this.variables[name] = value;

        this.timeline.push({
            type: "VARIABLE_DECLARE",
            name: name,
            value: value
        });
    }


    visitCallExpression(node) {

        const callee = node.callee;

        if (callee.type === "Identifier" && callee.name === "setTimeout") {
            this.addTimer(node);
            return;
        }

        if (callee.type === "Identifier" && callee.name === "queueMicrotask") {
            this.addMicrotask("queueMicrotask", node.arguments[0]);
            return;
        }

        if (callee.type === "MemberExpression" && callee.property.name === "then") {
            this.addPromiseThen(node);
            return;
        }

        const isConsoleLog =
            callee.type === "MemberExpression" &&
            callee.object.name === "console" &&
            callee.property.name === "log";

        if (!isConsoleLog) {
            throw new Error("Only console.log calls are supported");
        }

        const values = node.arguments.map(
            (argument) => this.evaluateNode(argument)
        );

        this.timeline.push({
            type: "CONSOLE_OUTPUT",
            value: values.join(" ")
        });
    }


    addPromiseThen(node) {

        const callbacks = [];
        let current = node;

        while (
            current.type === "CallExpression" &&
            current.callee.type === "MemberExpression" &&
            current.callee.property.name === "then"
        ) {
            callbacks.unshift(current.arguments[0]);
            current = current.callee.object;
        }

        const isPromiseResolve =
            current.type === "CallExpression" &&
            current.callee.type === "MemberExpression" &&
            current.callee.object.name === "Promise" &&
            current.callee.property.name === "resolve";

        if (!isPromiseResolve) {
            throw new Error("Only Promise.resolve().then(...) is supported");
        }

        this.addMicrotask("Promise.then", callbacks[0], callbacks.slice(1));
    }


    addTimer(node) {

        const callback = node.arguments[0];
        const delay = node.arguments[1] ? node.arguments[1].value : 0;

        const timer = {
            id: this.nextTimerId++,
            callback: callback,
            time: this.now + delay
        };

        this.timers.push(timer);

        this.timeline.push({
            type: "TIMER_START",
            id: timer.id,
            label: `setTimeout (${delay}ms)`
        });
    }


    evaluateNode(node) {

        if (!node) {
            return undefined;
        }

        switch (node.type) {

            case "Identifier":
                return this.variables[node.name];

            case "Literal":
                return node.value;

            case "BinaryExpression":
                return this.visitBinaryExpression(node);

            default:
                throw new Error(
                    `Unsupported expression: ${node.type}`
                );
        }
    }


    visitBinaryExpression(node) {

        const left = this.evaluateNode(node.left);
        const right = this.evaluateNode(node.right);

        return evaluateExpression(
            {
                type: "BINARY_EXPRESSION",
                left: left,
                operator: node.operator,
                right: right
            },
            this.variables
        );
    }
}