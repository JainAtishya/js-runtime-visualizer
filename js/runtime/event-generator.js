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
    }


    generate(ast) {

        this.timeline = [];
        this.variables = {};
        this.timers = [];
        this.nextTimerId = 1;
        this.now = 0;

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

        this.runTimers();
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