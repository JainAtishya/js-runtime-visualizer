import { RuntimeEngine } from "./runtime/runtime.js";
import { ExecutionController } from "./runtime/execution.js";
import { renderRuntime } from "./ui/renderer.js";

import { parseCode } from "./runtime/parser.js";
import { EventGenerator } from "./runtime/event-generator.js";


const runtime = new RuntimeEngine();

const execution = new ExecutionController(
    runtime,
    () => {
        renderRuntime(runtime.state);
    }
);


const codeEditor = document.getElementById("code-editor");

const runButton = document.getElementById("run-btn");
const stepButton = document.getElementById("step-btn");
const pauseButton = document.getElementById("pause-btn");
const resetButton = document.getElementById("reset-btn");


function prepareExecution() {

    const code = codeEditor.value;

    const ast = parseCode(code);

    const eventGenerator = new EventGenerator();

    const timeline = eventGenerator.generate(ast);

    execution.load(timeline);
}


runButton.addEventListener("click", () => {

    prepareExecution();

    execution.run();
});


stepButton.addEventListener("click", () => {

    if (execution.currentStep === 0) {
        prepareExecution();
    }

    execution.step();

    console.log(runtime.state);
});


pauseButton.addEventListener("click", () => {
    execution.pause();
});


resetButton.addEventListener("click", () => {
    execution.reset();
});


renderRuntime(runtime.state);