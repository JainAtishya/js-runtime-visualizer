import { ASTVisitor } from "./ast-visitor.js";
import { evaluateExpression } from "./expression-evaluator.js";


class JSError extends Error {}
class ReturnValue { constructor(value) { this.value = value; } }


export class EventGenerator extends ASTVisitor {

    constructor() {
        super();

        this.reset();
    }


    reset() {

        this.timeline = [];
        this.variables = {};
        this.resolvers = {};
        this.timers = [];
        this.microtasks = [];
        this.promises = [];
        this.now = 0;
        this.nextTimerId = 1;
        this.nextMicrotaskId = 1;
        this.nextPromiseId = 1;
        this.depth = 0;
    }


    generate(ast) {

        this.reset();

        try {
            this.visit(ast);
        } catch (error) {

            if (!(error instanceof JSError)) {
                throw error;
            }

            this.timeline.push({
                type: "ERROR",
                message: `Uncaught ${error.message}`
            });

            return this.timeline;
        }

        this.reportUnhandledRejections();

        this.timeline.push({
            type: "EVENT_LOOP",
            status: "idle, nothing left to run"
        });

        return this.timeline;
    }


    visitProgram(node) {

        this.timeline.push({
            type: "CALL_START",
            name: "global"
        });

        for (const statement of node.body) {
            if (statement.type === "FunctionDeclaration") {
                this.visitFunctionDeclaration(statement);
            }
        }

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
            const name = `${task.label} callback`;

            this.timeline.push({
                type: "MICROTASK_START",
                id: task.id,
                name: name
            });

            const result = this.callFunction(
                task.callback,
                task.args,
                task.scope
            );

            this.timeline.push({
                type: "CALL_END",
                name: name
            });

            task.done(result);
        }
    }


    addMicrotask(label, callback, args, done = () => {}) {

        const task = {
            id: this.nextMicrotaskId++,
            label: label,
            callback: callback,
            args: args,
            scope: { ...this.resolvers },
            done: done
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

            this.callFunction(timer.callback, [], timer.scope);

            this.timeline.push({
                type: "CALL_END",
                name: "setTimeout callback"
            });

            this.runMicrotasks();
        }
    }


    callFunction(fn, args, scope) {

        if (!fn) {
            return args[0];
        }

        if (typeof fn === "function") {
            return fn(...args);
        }

        this.resolvers = { ...scope };

        const outerVariables = this.variables;
        this.variables = { ...outerVariables };

        fn.params.forEach((param, index) => {

            this.variables[param.name] = args[index];

            this.timeline.push({
                type: "VARIABLE_DECLARE",
                name: param.name,
                value: this.show(args[index])
            });
        });

        const result = this.runBody(fn);

        this.variables = outerVariables;

        return result;
    }


    callAsyncUserFunction(name, fn, args) {

        const returnPromise = this.newPromise();
        const label = `${name}()`;

        this.timeline.push({ type: "CALL_START", name: label });
        this.depth++;

        const outerVariables = this.variables;
        this.variables = { ...outerVariables };

        fn.params.forEach((param, index) => {

            this.variables[param.name] = args[index];

            this.timeline.push({
                type: "VARIABLE_DECLARE",
                name: param.name,
                value: this.show(args[index])
            });
        });

        this.runAsyncSegment(
            fn.body.body,
            returnPromise,
            label,
            outerVariables
        );

        return returnPromise;
    }


    runAsyncSegment(statements, returnPromise, label, outerVariables) {

        for (let i = 0; i < statements.length; i++) {

            const stmt = statements[i];
            const info = this.extractAwait(stmt);

            if (info) {

                const awaitedValue = this.evaluateNode(info.expr);
                const awaitedPromise = this.toPromise(awaitedValue);
                awaitedPromise.handled = true;

                this.depth--;
                this.timeline.push({ type: "CALL_END", name: label });

                const remaining = statements.slice(i + 1);
                const savedVars = { ...this.variables };

                const continuation = (resolvedValue) => {

                    this.timeline.push({ type: "CALL_START", name: label });
                    this.depth++;
                    this.variables = { ...savedVars };

                    if (info.varName) {
                        this.variables[info.varName] = resolvedValue;
                        this.timeline.push({
                            type: "VARIABLE_DECLARE",
                            name: info.varName,
                            value: this.show(resolvedValue)
                        });
                    }

                    if (info.isReturn) {
                        this.settle(returnPromise, "fulfilled", resolvedValue);
                        this.depth--;
                        this.timeline.push({ type: "CALL_END", name: label });
                        this.variables = outerVariables;
                        return;
                    }

                    this.runAsyncSegment(
                        remaining,
                        returnPromise,
                        label,
                        outerVariables
                    );
                };

                const reaction = {
                    label: "async/await",
                    onFulfilled: continuation,
                    onRejected: null,
                    child: null
                };

                if (awaitedPromise.state === "pending") {
                    awaitedPromise.reactions.push(reaction);
                } else {
                    this.queueReaction(awaitedPromise, reaction);
                }

                this.variables = outerVariables;
                return;
            }

            try {
                this.visit(stmt);
            } catch (signal) {
                if (signal instanceof ReturnValue) {
                    this.depth--;
                    this.settle(returnPromise, "fulfilled", signal.value);
                    this.timeline.push({ type: "CALL_END", name: label });
                    this.variables = outerVariables;
                    return;
                }
                throw signal;
            }
        }

        this.depth--;
        this.settle(returnPromise, "fulfilled", undefined);
        this.timeline.push({ type: "CALL_END", name: label });
        this.variables = outerVariables;
    }


    extractAwait(stmt) {

        if (
            stmt.type === "VariableDeclaration" &&
            stmt.declarations[0].init &&
            stmt.declarations[0].init.type === "AwaitExpression"
        ) {
            return {
                expr: stmt.declarations[0].init.argument,
                varName: stmt.declarations[0].id.name,
                isReturn: false
            };
        }

        if (
            stmt.type === "ExpressionStatement" &&
            stmt.expression.type === "AwaitExpression"
        ) {
            return {
                expr: stmt.expression.argument,
                varName: null,
                isReturn: false
            };
        }

        if (
            stmt.type === "ReturnStatement" &&
            stmt.argument &&
            stmt.argument.type === "AwaitExpression"
        ) {
            return {
                expr: stmt.argument.argument,
                varName: null,
                isReturn: true
            };
        }

        return null;
    }


    toPromise(value) {

        if (value && value.isPromise) {
            return value;
        }

        const p = this.newPromise();
        this.settle(p, "fulfilled", value);
        return p;
    }


    runBody(fn) {

        if (fn.body.type !== "BlockStatement") {
            return this.evaluateNode(fn.body);
        }

        try {
            this.runStatements(fn.body.body);
        } catch (signal) {
            if (signal instanceof ReturnValue) {
                return signal.value;
            }
            throw signal;
        }
    }


    runStatements(statements) {

        for (const statement of statements) {

            if (statement.type === "ReturnStatement") {
                throw new ReturnValue(this.evaluateNode(statement.argument));
            }

            this.visit(statement);
        }
    }


    visitFunctionDeclaration(node) {

        this.variables[node.id.name] = node;
    }


    visitIfStatement(node) {

        const test = this.evaluateNode(node.test);

        if (test) {
            this.visit(node.consequent);
        } else if (node.alternate) {
            this.visit(node.alternate);
        }
    }


    visitBlockStatement(node) {

        this.runStatements(node.body);
    }


    visitExpressionStatement(node) {

        this.evaluateNode(node.expression);
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
            value: this.show(value)
        });
    }


    visitCallExpression(node) {

        this.evaluateCall(node);
    }


    evaluateCall(node) {

        const callee = node.callee;

        if (callee.type === "Identifier") {

            if (callee.name === "setTimeout") {
                this.addTimer(node);
                return;
            }

            if (callee.name === "queueMicrotask") {
                this.addMicrotask(
                    "queueMicrotask",
                    this.resolveFunction(node.arguments[0]),
                    []
                );
                return;
            }

            if (this.resolvers[callee.name]) {
                this.callResolver(callee.name, node);
                return;
            }

            const target = this.variables[callee.name];

            if (this.isFunction(target)) {
                return this.callUserFunction(callee.name, target, node);
            }
        }

        if (callee.type === "MemberExpression") {

            const object = callee.object.name;
            const method = callee.property.name;

            if (object === "console" && method === "log") {
                this.consoleLog(node);
                return;
            }

            if (object === "Promise" && method === "resolve") {
                return this.settledPromise(node, "fulfilled");
            }

            if (object === "Promise" && method === "reject") {
                return this.settledPromise(node, "rejected");
            }

            if (method === "then" || method === "catch") {
                return this.addReaction(node);
            }
        }

        throw new JSError("TypeError: unsupported function call");
    }


    consoleLog(node) {

        const values = node.arguments.map(
            (argument) => this.show(this.evaluateNode(argument))
        );

        this.timeline.push({
            type: "CONSOLE_OUTPUT",
            value: values.join(" ")
        });
    }


    newPromise() {

        const promise = {
            isPromise: true,
            id: this.nextPromiseId++,
            state: "pending",
            value: undefined,
            reactions: [],
            handled: false
        };

        this.promises.push(promise);

        this.timeline.push({
            type: "PROMISE_UPDATE",
            id: promise.id,
            state: promise.state
        });

        return promise;
    }


    settle(promise, state, value) {

        if (promise.state !== "pending") {
            return;
        }

        promise.state = state;
        promise.value = value;

        this.timeline.push({
            type: "PROMISE_UPDATE",
            id: promise.id,
            state: state,
            value: this.show(value)
        });

        for (const reaction of promise.reactions) {
            this.queueReaction(promise, reaction);
        }

        promise.reactions = [];
    }


    settledPromise(node, state) {

        const promise = this.newPromise();

        const value = node.arguments[0]
            ? this.evaluateNode(node.arguments[0])
            : undefined;

        this.settle(promise, state, value);

        return promise;
    }


    createPromise(node) {

        if (node.callee.name !== "Promise") {
            throw new JSError("TypeError: only new Promise(...) is supported");
        }

        const promise = this.newPromise();
        const executor = node.arguments[0];

        const outerResolvers = this.resolvers;
        const outerVariables = this.variables;

        this.resolvers = { ...outerResolvers };
        this.variables = { ...outerVariables };

        const [resolveParam, rejectParam] = executor.params;

        if (resolveParam) {
            this.resolvers[resolveParam.name] = {
                promise: promise,
                state: "fulfilled"
            };
        }

        if (rejectParam) {
            this.resolvers[rejectParam.name] = {
                promise: promise,
                state: "rejected"
            };
        }

        this.timeline.push({
            type: "CALL_START",
            name: "Promise executor"
        });

        this.runBody(executor);

        this.timeline.push({
            type: "CALL_END",
            name: "Promise executor"
        });

        this.resolvers = outerResolvers;
        this.variables = outerVariables;

        return promise;
    }


    callResolver(name, node) {

        const resolver = this.resolvers[name];

        const value = node.arguments[0]
            ? this.evaluateNode(node.arguments[0])
            : undefined;

        this.settle(resolver.promise, resolver.state, value);
    }


    addReaction(node) {

        const parent = this.evaluateNode(node.callee.object);

        if (!parent || !parent.isPromise) {
            throw new JSError("TypeError: .then and .catch only work on promises");
        }

        const isCatch = node.callee.property.name === "catch";
        const first = this.resolveFunction(node.arguments[0]);
        const second = this.resolveFunction(node.arguments[1]);

        const reaction = {
            label: isCatch ? "Promise.catch" : "Promise.then",
            onFulfilled: isCatch ? null : first,
            onRejected: isCatch ? first : second || null,
            child: this.newPromise()
        };

        parent.handled = true;

        if (parent.state === "pending") {
            parent.reactions.push(reaction);
        } else {
            this.queueReaction(parent, reaction);
        }

        return reaction.child;
    }


    queueReaction(promise, reaction) {

        const handler = promise.state === "fulfilled"
            ? reaction.onFulfilled
            : reaction.onRejected;

        if (typeof handler === "function") {
            this.addMicrotask(
                reaction.label,
                handler,
                [promise.value],
                () => {}
            );
            return;
        }

        this.addMicrotask(
            reaction.label,
            handler,
            [promise.value],
            (result) => {

                if (handler) {
                    this.settle(reaction.child, "fulfilled", result);
                } else {
                    this.settle(reaction.child, promise.state, promise.value);
                }
            }
        );
    }


    reportUnhandledRejections() {

        for (const promise of this.promises) {

            if (promise.state === "rejected" && !promise.handled) {

                this.timeline.push({
                    type: "CONSOLE_OUTPUT",
                    value: `Uncaught (in promise) ${promise.value}`
                });
            }
        }
    }


    addTimer(node) {

        const callback = this.resolveFunction(node.arguments[0]);
        const delay = node.arguments[1] ? node.arguments[1].value : 0;

        const timer = {
            id: this.nextTimerId++,
            callback: callback,
            time: this.now + delay,
            scope: { ...this.resolvers }
        };

        this.timers.push(timer);

        this.timeline.push({
            type: "TIMER_START",
            id: timer.id,
            label: `setTimeout (${delay}ms)`
        });
    }


    isFunction(value) {

        return Boolean(value) && [
            "ArrowFunctionExpression",
            "FunctionExpression",
            "FunctionDeclaration"
        ].includes(value.type);
    }


    resolveFunction(node) {

        if (!node) {
            return null;
        }

        if (node.type === "Identifier") {

            const target = this.variables[node.name];

            if (!this.isFunction(target)) {
                throw new JSError(`TypeError: ${node.name} is not a function`);
            }

            return target;
        }

        return node;
    }


    callUserFunction(name, fn, node) {

        const args = node.arguments.map(
            (argument) => this.evaluateNode(argument)
        );

        if (this.depth >= 50) {
            throw new JSError(
                "RangeError: Maximum call stack size exceeded"
            );
        }

        if (fn.async) {
            return this.callAsyncUserFunction(name, fn, args);
        }

        const label = `${name}()`;

        this.timeline.push({
            type: "CALL_START",
            name: label
        });

        this.depth++;

        const result = this.callFunction(fn, args, this.resolvers);

        this.depth--;

        this.timeline.push({
            type: "CALL_END",
            name: label
        });

        return result;
    }


    show(value) {

        if (this.isFunction(value)) {
            return "[Function]";
        }

        if (value && value.isPromise) {

            if (value.state === "pending") {
                return "Promise {<pending>}";
            }

            return `Promise {<${value.state}>: ${value.value}}`;
        }

        return value;
    }


    evaluateNode(node) {

        if (!node) {
            return undefined;
        }

        switch (node.type) {

            case "Identifier":

                if (node.name === "undefined") {
                    return undefined;
                }

                if (!Object.hasOwn(this.variables, node.name)) {
                    throw new JSError(
                        `ReferenceError: ${node.name} is not defined`
                    );
                }

                return this.variables[node.name];

            case "Literal":
                return node.value;

            case "BinaryExpression":
                return this.visitBinaryExpression(node);

            case "NewExpression":
                return this.createPromise(node);

            case "ArrowFunctionExpression":
            case "FunctionExpression":
                return node;

            case "UnaryExpression":
                if (node.operator === "-") {
                    return -this.evaluateNode(node.argument);
                }
                if (node.operator === "+") {
                    return +this.evaluateNode(node.argument);
                }
                if (node.operator === "!") {
                    return !this.evaluateNode(node.argument);
                }
                throw new JSError(`TypeError: unsupported unary operator: ${node.operator}`);

            case "CallExpression":
                return this.evaluateCall(node);

            default:
                throw new JSError(
                    `TypeError: ${node.type} is not supported yet`
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
            {}
        );
    }
}