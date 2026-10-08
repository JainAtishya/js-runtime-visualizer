import { RuntimeEngine } from "./runtime/runtime.js";
import { ExecutionController } from "./runtime/execution.js";
import { renderRuntime, renderHighlighter, renderNarrator } from "./ui/renderer.js";

import { parseCode } from "./runtime/parser.js";
import { EventGenerator } from "./runtime/event-generator.js";


const runtime = new RuntimeEngine();

const execution = new ExecutionController(
    runtime,
    () => {
        const event = execution.timeline[execution.currentStep - 1] || null;
        renderRuntime(runtime.state);
        renderHighlighter(codeEditor.value, runtime.state.activeLine);
        renderNarrator(event);
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
        renderNarrator(null);
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
console.log("done");`,

    interval: `let count = 0;
const id = setInterval(() => {
    count++;
    console.log("tick", count);
    if (count === 3) {
        clearInterval(id);
        console.log("stopped");
    }
}, 500);`,

    logical: `function check(age) {
    const status = age >= 18 ? "Adult" : "Minor";
    console.log("Status:", status);
    
    // Short-circuiting examples
    const isAllowed = age >= 18 && "Yes";
    const defaultName = null || "Guest";
    
    console.log("Allowed?", isAllowed);
    console.log("Name:", defaultName);
}

check(20);
check(16);`
};


function prepareExecution() {

    runtime.reset();
    errorMessage.textContent = "";
    renderNarrator(null);

    try {
        const ast = parseCode(codeEditor.value);

        const eventGenerator = new EventGenerator();

        execution.load(eventGenerator.generate(ast));

        return true;

    } catch (error) {
        errorMessage.textContent = error.message;
        renderRuntime(runtime.state);
        renderHighlighter(codeEditor.value, null);
        renderNarrator({ type: "ERROR", message: error.message });

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
    renderNarrator(null);
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
    renderNarrator(null);
});


codeEditor.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;

        // set textarea value to: text before caret + 4 spaces + text after caret
        this.value = this.value.substring(0, start) +
            "    " + this.value.substring(end);

        // put caret at right position again
        this.selectionStart = this.selectionEnd = start + 4;
    }
});


renderRuntime(runtime.state);