import * as vscode from "vscode";

class CustomPsuedoTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private nameEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    constructor(
        public open: (initialDimensions?: vscode.TerminalDimensions) => void,
        public close: () => void,
        private onHandleInput: (data: string) => void,
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
