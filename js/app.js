import {
    renderCallStack,
    renderWebApis,
    renderMicrotaskQueue,
    renderTaskQueue,
    renderEventLoop
} from "./ui/renderer.js";


const runtimeState = {
    callStack: [],
    webApis: [],
    microtaskQueue: [],
    taskQueue: [],
    eventLoop: {
        status: "idle"
    },
    console: [],
    status: "idle"
};


const codeEditor = document.getElementById("code-editor");
const runButton = document.getElementById("run-btn");
const consoleOutput = document.getElementById("console-output");


runButton.addEventListener("click", () => {
    const code = codeEditor.value;

    runtimeState.status = "running";

    consoleOutput.textContent = `Code received:\n\n${code}`;
});


runtimeState.callStack.push("global");
runtimeState.callStack.push("main");

runtimeState.webApis.push("setTimeout");
runtimeState.webApis.push("fetch");

runtimeState.microtaskQueue.push("Promise.then");

runtimeState.taskQueue.push("setTimeout callback");

runtimeState.eventLoop.status = "waiting";


renderCallStack(runtimeState.callStack);
renderWebApis(runtimeState.webApis);
renderMicrotaskQueue(runtimeState.microtaskQueue);
renderTaskQueue(runtimeState.taskQueue);
renderEventLoop(runtimeState.eventLoop);