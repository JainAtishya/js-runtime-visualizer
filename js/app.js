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
const speedSelect = document.getElementById("speed-select");
const exampleSelect = document.getElementById("example-select");
const errorMessage = document.getElementById("error-message");


const examples = {
    order: `console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");`,

    chain: `Promise.resolve()
    .then(() => console.log("first"))
    .then(() => console.log("second"));
queueMicrotask(() => console.log("microtask"));
console.log("sync");`,

    nested: `setTimeout(() => {
    console.log("outer");
    setTimeout(() => console.log("inner"), 0);
}, 0);
setTimeout(() => console.log("slow"), 500);`
};


function prepareExecution() {

    runtime.reset();
    errorMessage.textContent = "";

    try {
        const ast = parseCode(codeEditor.value);

        const eventGenerator = new EventGenerator();

        execution.load(eventGenerator.generate(ast));

        return true;

    } catch (error) {
        errorMessage.textContent = error.message;
        renderRuntime(runtime.state);

        return false;
    }
}


runButton.addEventListener("click", () => {

    if (prepareExecution()) {
        execution.run();
    }
});


stepButton.addEventListener("click", () => {

    if (execution.currentStep === 0 && !prepareExecution()) {
        return;
    }

    execution.step();
});


pauseButton.addEventListener("click", () => {
    execution.pause();
});


resetButton.addEventListener("click", () => {
    errorMessage.textContent = "";
    execution.reset();
});


speedSelect.addEventListener("change", () => {
    execution.setSpeed(Number(speedSelect.value));
});


exampleSelect.addEventListener("change", () => {

    if (!exampleSelect.value) {
        return;
    }

    codeEditor.value = examples[exampleSelect.value];
    execution.reset();
    errorMessage.textContent = "";
});


renderRuntime(runtime.state);