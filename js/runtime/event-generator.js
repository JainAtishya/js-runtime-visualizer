import { ASTVisitor } from "./ast-visitor.js";
import { evaluateExpression } from "./expression-evaluator.js";


export class EventGenerator extends ASTVisitor {

    constructor() {
        super();

        this.timeline = [];
        this.variables = {};
    }


    generate(ast) {

        this.timeline = [];
        this.variables = {};

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