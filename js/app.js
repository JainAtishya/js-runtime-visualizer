import { RuntimeEngine } from "./runtime/runtime.js";
import { renderRuntime } from "./ui/renderer.js";

import {
    renderCallStack,
    renderWebApis,
    renderMicrotaskQueue,
    renderTaskQueue,
    renderEventLoop
} from "./ui/renderer.js";


const runtime = new RuntimeEngine();


const codeEditor = document.getElementById("code-editor");
const runButton = document.getElementById("run-btn");
const consoleOutput = document.getElementById("console-output");


runButton.addEventListener("click", () => {
    const code = codeEditor.value;

    runtime.state.status = "running";

    consoleOutput.textContent = `Code received:\n\n${code}`;
});


runtime.processEvent({
    type: "CALL_START",
    name: "global"
});

runtime.processEvent({
    type: "CALL_START",
    name: "main"
});

runtime.processEvent({
    type: "CALL_START",
    name: "foo"
});

runtime.processEvent({
    type: "CALL_END",
    name: "foo"
});


renderRuntime(runtime.state);