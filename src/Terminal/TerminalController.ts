import * as vscode from "vscode";

import { Optional } from "../Types";
import { TerminalProcessOptions, TerminalProcess } from "./TerminalProcess";
import { CustomPsuedoTerminal } from "./CustomPsuedoTerminal";

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

export class TerminalController {
    writeEmitter: vscode.EventEmitter<string>;
    closeEmitter: vscode.EventEmitter<void | number>;
    terminal: Optional<vscode.Terminal> = null;
    process: Optional<TerminalProcess> = null;

    constructor() {
        this.writeEmitter = new vscode.EventEmitter<string>();
        this.closeEmitter = new vscode.EventEmitter<void | number>();
    }

    dispose = () => {
        this.process?.dispose();
        this.process = null;

        this.terminal?.dispose();
        this.terminal = null;
    };

    private fetchOrMakeTerminal = (name: string): vscode.Terminal => {
        let terminal: vscode.Terminal | undefined;
        if (name && typeof name === "string") {
            terminal = vscode.window.terminals.find((term) => term.name === name);
        } else {
            terminal = vscode.window.activeTerminal;
        }

        if (terminal) {
            // might be useful to do something here
            console.log("found existing terminal");
            terminal.show();
        } else {
            terminal = vscode.window.createTerminal({
                name,
                pty: new CustomPsuedoTerminal(this.onTerminalOpen, this.onTerminalClose, this.onTerminalInterrupt),
            });
        }

        return terminal;
    };

    private onTerminalCreate = (name: string) => {
        if (this.terminal === null) {
            this.terminal = this.fetchOrMakeTerminal(name);
        }
    };
    private onTerminalOpen = () => {};
    private onTerminalClose = this.dispose;
    private onTerminalInterrupt = () => this.process?.terminate();
    private onTerminalWrite = (text: string) => this.terminal?.sendText(text, false);
    private onTerminalAutoClear = (): Thenable<void> => {
        return vscode.commands.executeCommand("workbench.action.terminal.clear");
    };

    execute = async (options: TerminalProcessOptions) => {
        try {
            if (this.process === null) {
                this.process = new TerminalProcess(this.onTerminalWrite);
            }
            this.process.execute(options, () => this.onTerminalCreate(options.name), this.onTerminalAutoClear);

            if (this.terminal !== null && this.terminal !== vscode.window.activeTerminal) {
                this.terminal.show();
            }
        } catch (err) {
            console.error(err);
        }
    };
}
