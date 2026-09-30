import { evaluateExpression } from "./expression-evaluator.js";


export function generateTimeline() {

    const variables = {};

    const timeline = [];


    timeline.push({
        type: "CALL_START",
        name: "global"
    });


    const x = evaluateExpression(10, variables);

    variables.x = x;

    timeline.push({
        type: "VARIABLE_DECLARE",
        name: "x",
        value: x
    });


    const y = evaluateExpression(20, variables);

    variables.y = y;

    timeline.push({
        type: "VARIABLE_DECLARE",
        name: "y",
        value: y
    });


    const z = evaluateExpression(
        {
            type: "BINARY_EXPRESSION",
            left: "x",
            operator: "+",
            right: "y"
        },
        variables
    );

    variables.z = z;

    timeline.push({
        type: "VARIABLE_DECLARE",
        name: "z",
        value: z
    });


    timeline.push({
        type: "CALL_END",
        name: "global"
    });


    return timeline;
}