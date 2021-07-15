import * as vscode from "vscode";

const keys = {
    enter: "\r",
    backspace: "\x7f",
};
const actions = {
    cursorBack: "\x1b[D",
    deleteChar: "\x1b[P",
    clear: "\x1b[2J\x1b[3J\x1b[;H",
    interrupt: "\u0003",
};

export type PseudoTerminalOptions = {
    onOpen: (initialDimensions?: vscode.TerminalDimensions) => void;
    onClose: () => void;
};

class CustomPsuedoTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    onDidWrite: vscode.Event<string> = this.writeEmitter.event;

    private closeEmitter = new vscode.EventEmitter<number>();
    onDidClose: vscode.Event<number> = this.closeEmitter.event;

    handleInput = (data: string) => {
        switch (data) {
            case actions.interrupt:
                this.onInterrupt();
                break;

            default: {
                data = data.replace(/\r/g, "\r\n");
                console.log(data.slice(0, data.length - 1));
                this.writeEmitter.fire(data);
                break;
            }
        }
    };

    constructor(
        public open: (initialDimensions?: vscode.TerminalDimensions) => void,
        public close: () => void,
        private onInterrupt: () => void
    ) {}

    dispose = (): void => {
        this.writeEmitter.dispose();
        this.closeEmitter.dispose();
    };
}

export { CustomPsuedoTerminal };
