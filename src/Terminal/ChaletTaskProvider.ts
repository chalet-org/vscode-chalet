import * as vscode from "vscode";

import { Optional } from "../Types";
import { TerminalProcessOptions, TerminalProcess } from "./TerminalProcess";
import { CustomPsuedoTerminal } from "./CustomPsuedoTerminal";

class ChaletTaskProvider implements vscode.TaskProvider {
    static type: string = "chalet";

    private tasks: vscode.Task[] = [];
    private view: Optional<vscode.Terminal> = null;
    private pseudoTerminal: Optional<CustomPsuedoTerminal> = null;
    private process: Optional<TerminalProcess> = null;
    // private taskExecution: Optional<vscode.TaskExecution> = null;

    public async provideTasks(token: vscode.CancellationToken): Promise<vscode.Task[]> {
        return this.tasks;
    }

    public resolveTask(task: vscode.Task): vscode.Task | undefined {
        return task;
    }

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
            // might be useful to do something here
            console.log("found existing terminal");
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

    private executeBuildTask = async (task: vscode.Task) => {
        try {
            console.log("executeBuildTask start");
            let execution = await vscode.tasks.executeTask(task);
            console.log("end?");
            execution.terminate();
            // let disposable = vscode.tasks.onDidEndTask((e) => {
            //     console.log("did the task end?");
            //     if (e.execution.task.group === vscode.TaskGroup.Build) {
            //         e.execution.terminate();
            //         disposable.dispose();
            //     }
            // });
            console.log("executeBuildTask end");
        } catch (err) {
            console.error(err.message);
            throw err;
        }
    };

    executeAsTask = async (options: TerminalProcessOptions) => {
        try {
            const term = this.createPseudoTerminal();
            const customExec = new vscode.CustomExecution(
                async (def: vscode.TaskDefinition): Promise<vscode.Pseudoterminal> => {
                    let falseTerm = {
                        onDidWrite: term.onDidWrite,
                        open: () => {},
                        close: () => {
                            vscode.tasks.taskExecutions.forEach((exec) => {
                                exec.terminate();
                            });
                        },
                        handleInput: (char: string) => {},
                    };
                    return falseTerm;
                }
            );

            const task = new vscode.Task(
                { type: ChaletTaskProvider.type },
                vscode.TaskScope.Workspace,
                "Chalet (Task)",
                "chalet",
                customExec
            );
            task.group = vscode.TaskGroup.Build;
            task.presentationOptions = {
                echo: false,
                reveal: vscode.TaskRevealKind.Silent,
                focus: false,
                panel: vscode.TaskPanelKind.Shared,
                clear: true,
                showReuseMessage: false,
            };

            await this.executeBuildTask(task);

            if (this.process === null) {
                this.process = new TerminalProcess(this.onTerminalWrite);
            }
            await this.process?.execute(
                options,
                () => this.onTerminalCreate(options.name),
                () => {
                    vscode.tasks.taskExecutions.forEach((exec) => {
                        if (exec.task === task) {
                            exec.terminate();
                            this.process?.dispose();
                            this.process = null;
                        }
                    });
                },
                this.onTerminalAutoClear
            );

            if (this.view !== null && this.view !== vscode.window.activeTerminal) {
                this.view.show();
            }

            // this.taskProvider.resolveTask(task);
            // let execution = await vscode.tasks.executeTask(task);
            // execution.terminate();

            // this.taskExecution = await vscode.tasks.executeTask(task);
        } catch (err) {
            console.error(err);
        }
    };

    execute = (options: TerminalProcessOptions) => {
        if (this.process === null) {
            this.process = new TerminalProcess(this.onTerminalWrite);
        }
        let promise = this.process.execute(
            options,
            () => this.onTerminalCreate(options.name),
            () => {},
            this.onTerminalAutoClear
        );
        if (this.view !== null && this.view !== vscode.window.activeTerminal) {
            this.view.show();
        }
        return promise;
    };
}

export { ChaletTaskProvider };
