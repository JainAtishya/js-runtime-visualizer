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
    renderList("call-stack", callStack, true);
}

export function renderWebApis(webApis) {
    renderList("web-apis", webApis);
}

export function renderMicrotaskQueue(microtaskQueue) {
    renderList("microtask-queue", microtaskQueue);
}

export function renderTaskQueue(taskQueue) {
    renderList("task-queue", taskQueue);
}

export function renderEventLoop(eventLoop) {
    const eventLoopElement = document.getElementById("event-loop");

    eventLoopElement.textContent = eventLoop.status;
}