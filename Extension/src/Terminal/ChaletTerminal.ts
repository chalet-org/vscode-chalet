import * as vscode from "vscode";

import { Optional } from "../Types";
import { TerminalProcessOptions, TerminalProcess } from "./TerminalProcess";
import { CustomPsuedoTerminal } from "./CustomPsuedoTerminal";
import { sleep } from "../Functions";
// import { getChaletToolsInstance } from "../ChaletToolsLoader";

type ExecuteOptions = TerminalProcessOptions & {
    icon: string;
};

class ChaletTerminal {
    private view: Optional<vscode.Terminal> = null;
    private pseudoTerminal: Optional<CustomPsuedoTerminal> = null;
    private process: Optional<TerminalProcess> = null;
    private icon: string = "home";

    dispose = () => {
        this.process?.dispose();
        this.process = null;

        this.view?.dispose();
        this.view = null;

        this.pseudoTerminal?.dispose();
        this.pseudoTerminal = null;
    };

    private fetchOrMakeTerminal = (label: string): vscode.Terminal => {
        let terminal: vscode.Terminal | undefined;
        if (label && typeof label === "string") {
            terminal = vscode.window.terminals.find((term) => term.name === label);
        } else {
            terminal = vscode.window.activeTerminal;
        }

        if (terminal) {
            terminal.show();
        } else {
            // const resources = getChaletToolsInstance()!.resources;
            const iconCtor: any = vscode.ThemeIcon;
            const pty = this.createPseudoTerminal();
            terminal = vscode.window.createTerminal({
                name: label,
                pty,
                iconPath: new iconCtor(this.icon),
                // iconPath: resources.home ?? new vscode.ThemeIcon(this.icon),
            });
        }
        return terminal;
    };

    private createPseudoTerminal = (): CustomPsuedoTerminal => {
        if (this.pseudoTerminal === null) {
            this.pseudoTerminal = new CustomPsuedoTerminal(
                this.onTerminalOpen,
                this.onTerminalClose,
                this.onHandleInput
            );
        }
        return this.pseudoTerminal;
    };
    private onTerminalCreate = (label: string) => {
        if (this.view === null) {
            this.view = this.fetchOrMakeTerminal(label);
        }
    };
    private onTerminalOpen = () => {};
    private onTerminalClose = this.dispose;
    private onTerminalWrite = (text: string) => this.pseudoTerminal?.write(text);
    private onHandleInput = (text: string) => this.process?.write(text);

    private onTerminalAutoClear = (): Thenable<void> => {
        return vscode.commands.executeCommand("workbench.action.terminal.clear");
    };

    execute = async ({ icon, autoClear, ...options }: ExecuteOptions): Promise<number> => {
        try {
            // this.icon = icon;
            this.onTerminalCreate(options.label);
            if (this.view !== null) {
                this.view.show();
            }

            const delay = 250;
            await sleep(delay); // wait until the terminal is ready, otherwise output could be jumbled

            if (this.process === null) {
                this.process = new TerminalProcess(this.onTerminalWrite);
            }

            if (!!autoClear) {
                await this.onTerminalAutoClear();
            }

            const result = await this.process.execute(options);
            return result;
        } catch (err) {
            throw err;
        }
    };
}

export { ChaletTerminal };
