# JavaScript Runtime Visualizer

A browser-based educational tool that visually dissects how the JavaScript runtime executes code. The visualizer simulates the JavaScript engine architecture, breaking down code execution into discrete steps across the Call Stack, Web APIs, Microtask Queue, Task Queue, and Event Loop.

## Architecture and Design

Unlike standard execution environments, this tool does not execute user code using standard browser evaluation. Instead, it parses and interprets the code manually to allow step-by-step instrumentation and visualization.

The architecture consists of three primary layers:

1. **Parser**: The acorn library parses the raw JavaScript string into an Abstract Syntax Tree (AST).
2. **Event Generator**: A custom interpreter walks the AST and translates it into a linear timeline of execution events.
3. **Runtime Controller**: A step-based execution engine that processes the generated events, updates the simulated queues, and triggers UI updates.

## Core Engine Details

### Abstract Syntax Tree Traversal
The EventGenerator implements a visitor pattern to evaluate AST nodes. Every node (VariableDeclaration, CallExpression, IfStatement, etc.) yields specific execution events. This allows the visualizer to highlight exactly which expression is currently being evaluated before returning the result.

### True Lexical Scoping and Closures
To accurately reflect how JavaScript handles variables, the engine implements a lexical environment chain. Each block or function call creates a new scope object, prototypically linked to its parent scope. This natively supports closures, allowing functions to retain access to variables declared in their outer environments.

### Asynchronous Execution Simulation
The engine simulates asynchronous behavior by intercepting specific function calls:
- **Timers**: Calls to setTimeout or setInterval are intercepted. The engine registers them in a simulated Web API pool and moves them to the Task Queue when the timer expires.
- **Promises**: The engine implements a custom Promise model. Awaiting a promise or calling .then() suspends the current execution context and pushes a continuation callback to the Microtask Queue.

### Event Loop Simulation
The ExecutionController processes events step-by-step. It strictly follows the JavaScript event loop specification:
1. It executes synchronous code until the Call Stack is empty.
2. It drains the Microtask Queue completely before moving forward.
3. It takes the oldest item from the Task Queue, pushes it to the Call Stack, and repeats the cycle.

## Supported Language Features

The interpreter currently supports a substantial subset of JavaScript designed for demonstrating runtime concepts:
- **Variable Declarations**: let, const (block-scoped).
- **Functions**: Declarations, arrow functions, and asynchronous functions (async / await).
- **Control Flow**: if / else, for loops, while loops, and ternary operators.
- **Logical Operators**: Short-circuit evaluation for &&, ||, and ??.
- **Runtime APIs**: console.log, setTimeout, setInterval, clearTimeout, clearInterval, and Promise.resolve.

## Limitations

Because this is a simulated interpreter built specifically for visualizing the event loop, it omits certain complexities of full JS engines:
- **DOM Access**: The interpreter does not have access to the browser's Document Object Model.
- **Context Binding**: The "this" keyword and prototype chains are simplified and do not mirror strict ECMAScript specifications.
- **Error Handling**: try / catch blocks are not currently supported by the AST visitor. Syntax errors are caught during the parsing phase, but runtime errors will halt the simulated execution.

## Local Development

1. Clone the repository.
2. Run npm install in the root directory to install the acorn parser dependency.
3. Serve the directory using any local HTTP server.
4. Open index.html in the browser.