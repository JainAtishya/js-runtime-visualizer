export class ExecutionContext {

    constructor(name, type = "function") {

        this.name = name;
        this.type = type;

        this.variables = {};
    }


    declareVariable(name, value) {

        this.variables[name] = value;
    }


    hasVariable(name) {

        return Object.prototype.hasOwnProperty.call(
            this.variables,
            name
        );
    }


    getVariable(name) {

        return this.variables[name];
    }
}