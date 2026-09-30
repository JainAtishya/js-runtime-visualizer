import { RuntimeEngine } from "./runtime/runtime.js";
import { ExecutionController } from "./runtime/execution.js";
import { renderRuntime } from "./ui/renderer.js";


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


const timeline = [
    {
        type: "CALL_START",
        name: "global"
    },
    {
        type: "CALL_START",
        name: "main"
    },
    {
        type: "CALL_START",
        name: "foo"
    },
    {
        type: "CONSOLE_OUTPUT",
        value: "Hello from foo"
    },
    {
        type: "CALL_END",
        name: "foo"
    },
    {
        type: "CALL_END",
        name: "main"
    },
    {
        type: "CALL_END",
        name: "global"
    }
];


execution.load(timeline);


runButton.addEventListener("click", () => {
    execution.run();
});


stepButton.addEventListener("click", () => {
    execution.step();
});


pauseButton.addEventListener("click", () => {
    execution.pause();
});


resetButton.addEventListener("click", () => {
    execution.reset();
});


renderRuntime(runtime.state);