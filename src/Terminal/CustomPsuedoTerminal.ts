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

class CustomPsuedoTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private nameEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    constructor(
        public open: (initialDimensions?: vscode.TerminalDimensions) => void,
        public close: () => void,
        private onInterrupt: () => void,
        private onHandleInput: (data: string) => void
    ) {}

    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidChangeName: vscode.Event<string> = this.nameEmitter.event;
    onDidClose: vscode.Event<number> = this.closeEmitter.event;

    write = (data: string) => {
        data = data.replace(/\r/g, "").replace(/\n/g, "\r\n");
        this.writeEmitter.fire(data);
    };

    handleInput = (data: string) => {
        if (!!data) {
            switch (data) {
                case actions.interrupt: {
                    this.onInterrupt();
                    return;
                }

                default:
                    break;
            }

            this.onHandleInput(data === "\r" ? "\r\n" : data);
        }
    };

    dispose = (): void => {
        this.writeEmitter.dispose();
        this.nameEmitter.dispose();
        this.closeEmitter.dispose();
    };
}

export { CustomPsuedoTerminal };
