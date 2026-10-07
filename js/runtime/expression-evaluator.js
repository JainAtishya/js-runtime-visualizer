export function evaluateExpression(expression, variables) {

    if (typeof expression === "number") {
        return expression;
    }


    if (typeof expression === "string") {

        if (Object.hasOwn(variables, expression)) {
            return variables[expression];
        }

        return expression;
    }


    if (expression.type === "BINARY_EXPRESSION") {

        const left = evaluateExpression(
            expression.left,
            variables
        );

        const right = evaluateExpression(
            expression.right,
            variables
        );


        switch (expression.operator) {

            case "+":
                return left + right;

            case "-":
                return left - right;

            case "*":
                return left * right;

            case "/":
                return left / right;

            case "===":
                return left === right;

            case "!==":
                return left !== right;

            case "<":
                return left < right;

            case ">":
                return left > right;

            case "<=":
                return left <= right;

            case ">=":
                return left >= right;

            default:
                throw new Error(
                    `Unsupported operator: ${expression.operator}`
                );
        }
    }


    throw new Error("Unsupported expression");
}