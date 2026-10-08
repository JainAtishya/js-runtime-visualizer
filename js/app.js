import { RuntimeEngine } from "./runtime/runtime.js";
import { ExecutionController } from "./runtime/execution.js";
import { renderRuntime, renderHighlighter } from "./ui/renderer.js";

import { parseCode } from "./runtime/parser.js";
import { EventGenerator } from "./runtime/event-generator.js";


const runtime = new RuntimeEngine();

const execution = new ExecutionController(
    runtime,
    () => {
        renderRuntime(runtime.state);
        renderHighlighter(codeEditor.value, runtime.state.activeLine);
    }
);


const codeEditor = document.getElementById("code-editor");
const codeHighlighter = document.getElementById("code-highlighter");

codeEditor.addEventListener("scroll", () => {
    codeHighlighter.scrollTop = codeEditor.scrollTop;
    codeHighlighter.scrollLeft = codeEditor.scrollLeft;
});

codeEditor.addEventListener("input", () => {
    // If the user starts typing, abort current execution and hide the overlay
    if (runtime.state.activeLine !== null) {
        execution.reset();
        errorMessage.textContent = "";
    }
});

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
setTimeout(() => console.log("slow"), 500);`,

    promise: `const p = new Promise((resolve) => {
    console.log("executor");
    setTimeout(() => resolve("done"), 1000);
});
p.then((value) => console.log(value));
console.log("end");`,

    reject: `Promise.reject("oops")
    .then(() => console.log("skipped"))
    .catch((error) => console.log(error));
console.log("start");`,

    functions: `function greet(name) {
    console.log("Hello, " + name + "!");
}

function main() {
    greet("Alice");
    greet("Bob");
}

main();
setTimeout(() => greet("later"), 0);`,

    async: `async function fetchData() {
    console.log("fetching...");
    const result = await Promise.resolve("data");
    console.log(result);
}

console.log("start");
fetchData();
console.log("end");`,

    asyncchain: `async function run() {
    const a = await Promise.resolve(1);
    const b = await Promise.resolve(a + 1);
    console.log(b);
}

run();
setTimeout(() => console.log("timeout"), 0);
console.log("sync");`,

    loops: `let count = 0;
for (let i = 0; i < 2; i++) {
    console.log("for loop", i);
    count += i;
}

while (count > 0) {
    console.log("while loop", count);
    count--;
}
console.log("done");`
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
        renderHighlighter(codeEditor.value, null);

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