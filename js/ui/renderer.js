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