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
    const names = callStack.map((context) => {
        let label = context.name;
        
        const varKeys = Object.keys(context.variables);
        if (varKeys.length > 0) {
            const vars = varKeys.map(k => `${k}: ${context.variables[k]}`).join(", ");
            label += ` (${vars})`;
        }
        
        return label;
    });

    renderList("call-stack", names, true);
}

export function renderWebApis(webApis) {
    renderList("web-apis", webApis.map((item) => item.label));
}

export function renderPromises(promises) {
    const labels = promises.map((promise) => {
        const value = promise.value === undefined ? "" : ` (${promise.value})`;

        return `Promise ${promise.id}: ${promise.state}${value}`;
    });

    renderList("promises", labels);
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

export function renderHighlighter(code, activeLine) {
    const highlighter = document.getElementById("code-highlighter");
    const editor = document.getElementById("code-editor");
    
    if (activeLine === null) {
        highlighter.classList.add("hidden");
        editor.style.color = "var(--t1)";
        return;
    }
    
    // Hide editor text by making it transparent so we still have the cursor/selection if they edit
    editor.style.color = "transparent";
    highlighter.classList.remove("hidden");
    
    const lines = code.split('\n');
    let html = "";
    
    for (let i = 0; i < lines.length; i++) {
        let lineText = lines[i] || " "; // keep empty lines taking up space
        lineText = lineText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        if (i + 1 === activeLine) {
            html += `<div class="highlight-line">${lineText}</div>`;
        } else {
            html += `<div>${lineText}</div>`;
        }
    }
    highlighter.innerHTML = html;
    
    // sync scroll position
    highlighter.scrollTop = editor.scrollTop;
    highlighter.scrollLeft = editor.scrollLeft;
}

export function renderRuntime(state) {
    renderCallStack(state.callStack);
    renderWebApis(state.webApis);
    renderPromises(state.promises);
    renderMicrotaskQueue(state.microtaskQueue);
    renderTaskQueue(state.taskQueue);
    renderEventLoop(state.eventLoop);
    renderConsole(state.console);
}

export function renderNarrator(event) {
    const narratorBox = document.getElementById("narrator-box");
    
    if (!event) {
        narratorBox.textContent = "Ready to run. Click Run or Step to begin.";
        return;
    }
    
    let text = "";
    switch (event.type) {
        case "CALL_START":
            if (event.name === "global") {
                text = `Created the Global Execution Context and pushed it to the Call Stack.`;
            } else {
                text = `Function called. Pushed execution context '${event.name}' to the Call Stack.`;
            }
            break;
        case "CALL_END":
            if (event.name === "global") {
                text = `Global script execution finished.`;
            } else {
                text = `Execution finished. Popped '${event.name}' off the Call Stack.`;
            }
            break;
        case "VARIABLE_DECLARE":
            text = `Memory allocation: declared variable '${event.name}' with value ${event.value}.`;
            break;
        case "VARIABLE_UPDATE":
            text = `Memory update: assigned value ${event.value} to variable '${event.name}'.`;
            break;
        case "PROMISE_UPDATE":
            if (event.state === "pending") {
                text = `Created new Promise (ID: ${event.id}) in pending state.`;
            } else {
                text = `Promise ${event.id} resolved to ${event.state} with value ${event.value || "undefined"}.`;
            }
            break;
        case "MICROTASK_ADD":
            text = `Queued microtask '${event.label}' into the Microtask Queue.`;
            break;
        case "MICROTASK_START":
            text = `Event Loop moving microtask '${event.name}' to the Call Stack.`;
            break;
        case "TIMER_START":
            text = `Web API started a timer: ${event.label}.`;
            break;
        case "TIMER_DONE":
            text = `Timer ${event.id} completed. Callback moved to the Task Queue.`;
            break;
        case "TASK_START":
            text = `Event Loop moving task '${event.name}' to the Call Stack.`;
            break;
        case "CONSOLE_OUTPUT":
            text = `Outputting to console: ${event.value}`;
            break;
        case "ERROR":
            text = `Execution halted due to error: ${event.message}`;
            break;
        case "EVENT_LOOP":
            text = `Event Loop: ${event.status}`;
            break;
        default:
            text = `Executing step...`;
    }
    
    narratorBox.textContent = text;
}