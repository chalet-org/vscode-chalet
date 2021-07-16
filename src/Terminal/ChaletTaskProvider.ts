import * as vscode from "vscode";

import { Optional } from "../Types";
import { TerminalProcessOptions, TerminalProcess } from "./TerminalProcess";
import { CustomPsuedoTerminal } from "./CustomPsuedoTerminal";

class ChaletTaskProvider {
    private view: Optional<vscode.Terminal> = null;
    private pseudoTerminal: Optional<CustomPsuedoTerminal> = null;
    private process: Optional<TerminalProcess> = null;

    dispose = () => {
        this.process?.dispose();
        this.process = null;

        this.view?.dispose();
        this.view = null;

        this.pseudoTerminal?.dispose();
        this.pseudoTerminal = null;
    };

    private fetchOrMakeTerminal = (name: string): vscode.Terminal => {
        let terminal: vscode.Terminal | undefined;
        if (name && typeof name === "string") {
            terminal = vscode.window.terminals.find((term) => term.name === name);
        } else {
            terminal = vscode.window.activeTerminal;
        }

        if (terminal) {
            terminal.show();
        } else {
            const pty = this.createPseudoTerminal();
            terminal = vscode.window.createTerminal({
                name,
                pty,
            });
        }

        return terminal;
    };

    private createPseudoTerminal = (): CustomPsuedoTerminal => {
        if (this.pseudoTerminal === null) {
            this.pseudoTerminal = new CustomPsuedoTerminal(
                this.onTerminalOpen,
                this.onTerminalClose,
                this.onTerminalInterrupt
            );
        }
        return this.pseudoTerminal;
    };
    private onTerminalCreate = (name: string) => {
        if (this.view === null) {
            this.view = this.fetchOrMakeTerminal(name);
        }
    };
    private onTerminalOpen = () => {};
    private onTerminalClose = this.dispose;
    private onTerminalInterrupt = () => this.process?.terminate();
    private onTerminalWrite = (text: string) => this.view?.sendText(text, false);
    private onTerminalAutoClear = (): Thenable<void> => {
        return vscode.commands.executeCommand("workbench.action.terminal.clear");
    };

    execute = (options: TerminalProcessOptions) => {
        if (this.process === null) {
            this.process = new TerminalProcess(this.onTerminalWrite);
        }
        let promise = this.process.execute(
            options,
            () => this.onTerminalCreate(options.name),
            this.onTerminalAutoClear
        );
        if (this.view !== null && this.view !== vscode.window.activeTerminal) {
            this.view.show();
        }
        return promise;
    };
}

export { ChaletTaskProvider };
