import { RuntimeEngine } from "./runtime/runtime.js";
import { ExecutionController } from "./runtime/execution.js";
import { renderRuntime } from "./ui/renderer.js";
import { generateTimeline } from "./runtime/event-generator.js";


const runtime = new RuntimeEngine();

const execution = new ExecutionController(
    runtime,
    () => {
        renderRuntime(runtime.state);
    }
);

const timeline = generateTimeline();

execution.load(timeline);


const codeEditor = document.getElementById("code-editor");

const runButton = document.getElementById("run-btn");
const stepButton = document.getElementById("step-btn");
const pauseButton = document.getElementById("pause-btn");
const resetButton = document.getElementById("reset-btn");


execution.load(timeline);


runButton.addEventListener("click", () => {
    execution.run();
});


stepButton.addEventListener("click", () => {
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