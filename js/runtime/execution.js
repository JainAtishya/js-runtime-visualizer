export class ExecutionController {
    constructor(runtime, onStep) {
        this.runtime = runtime;
        this.timeline = [];
        this.currentStep = 0;
        this.status = "idle";

        this.onStep = onStep;

        this.timer = null;
        this.stepDelay = 1000;
    }

    load(timeline) {
        this.pause();

        this.timeline = timeline;
        this.currentStep = 0;
        this.status = "ready";
    }

    step() {
        if (this.currentStep >= this.timeline.length) {
            this.status = "completed";
            return;
        }

        const event = this.timeline[this.currentStep];

        this.runtime.processEvent(event);

        this.currentStep++;

        if (this.onStep) {
            this.onStep();
        }

        if (this.currentStep >= this.timeline.length) {
            this.status = "completed";
        }
    }

    run() {
        if (this.status === "running") {
            return;
        }

        if (this.currentStep >= this.timeline.length) {
            return;
        }

        this.status = "running";

        const executeNextStep = () => {
            if (this.status !== "running") {
                return;
            }

            this.step();

            if (this.status === "running") {
                this.timer = setTimeout(executeNextStep, this.stepDelay);
            }
        };

        executeNextStep();
    }

    pause() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.status === "running") {
            this.status = "paused";
        }
    }

    reset() {
        this.pause();

        this.runtime.reset();

        this.currentStep = 0;
        this.status = "ready";

        if (this.onStep) {
            this.onStep();
        }
    }

    setSpeed(delay) {
        this.stepDelay = delay;
    }
}