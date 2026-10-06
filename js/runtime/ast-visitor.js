export class ASTVisitor {

    visit(node) {

        if (!node) {
            return;
        }

        const methodName = `visit${node.type}`;

        if (typeof this[methodName] === "function") {
            return this[methodName](node);
        }

        return this.visitChildren(node);
    }


    visitChildren(node) {

        for (const key in node) {

            if (key === "start" || key === "end") {
                continue;
            }

            const value = node[key];

            if (Array.isArray(value)) {

                for (const child of value) {

                    if (
                        child &&
                        typeof child.type === "string"
                    ) {
                        this.visit(child);
                    }
                }

            } else if (
                value &&
                typeof value === "object" &&
                typeof value.type === "string"
            ) {

                this.visit(value);
            }
        }
    }
}