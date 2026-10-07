function renderList(elementId, items, reverse = false) {
    const element = document.getElementById(elementId);

    element.innerHTML = "";

    const itemsToRender = reverse ? [...items].reverse() : items;

    for (const item of itemsToRender) {
        const elementItem = document.createElement("div");

        elementItem.textContent = item;

        element.appendChild(elementItem);
    }
}

export function renderCallStack(callStack) {
    const names = callStack.map((context) => context.name);

    renderList("call-stack", names, true);
}

export function renderWebApis(webApis) {
    renderList("web-apis", webApis.map((item) => item.label));
}

export function renderMicrotaskQueue(microtaskQueue) {
    renderList("microtask-queue", microtaskQueue.map((item) => item.label));
}

export function renderTaskQueue(taskQueue) {
    renderList("task-queue", taskQueue.map((item) => item.label));
}

export function renderEventLoop(eventLoop) {
    const eventLoopElement = document.getElementById("event-loop");

    eventLoopElement.textContent = eventLoop.status;
}

export function renderConsole(consoleMessages) {
    const consoleOutput = document.getElementById("console-output");

    consoleOutput.textContent = "";

    for (const message of consoleMessages) {
        consoleOutput.textContent += `${message}\n`;
    }
}

export function renderRuntime(state) {
    renderCallStack(state.callStack);
    renderWebApis(state.webApis);
    renderMicrotaskQueue(state.microtaskQueue);
    renderTaskQueue(state.taskQueue);
    renderEventLoop(state.eventLoop);
    renderConsole(state.console);
}