import * as acorn from "https://cdn.jsdelivr.net/npm/acorn@8.15.0/+esm";

export function parseCode(code) {
    return acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "script",
        locations: true
    });
}