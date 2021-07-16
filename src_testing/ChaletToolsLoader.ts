import * as vscode from "vscode";
import { CustomTerminal } from "./CustomTerminal";
import { Optional } from "../src/Types";

const definition: vscode.TaskDefinition = {
    type: "chalet",
};

class ChaletToolsLoader {
    taskExecution: Optional<vscode.TaskExecution> = null;

    constructor(context: vscode.ExtensionContext) {
        this.activate(context);
    }

    executeBuildTask = async (task: vscode.Task) => {
        try {
            await vscode.tasks.executeTask(task);

            return new Promise<void>((resolve) => {
                let disposable = vscode.tasks.onDidEndTask((e) => {
                    if (e.execution.task.group === vscode.TaskGroup.Build) {
                        disposable.dispose();
                        resolve();
                    }
                });
            });
        } catch (err) {
            console.error(err.message);
        }
    };

    getBuildTasks = () => {
        return new Promise<vscode.Task[]>(async (resolve) => {
            try {
                const tasks = await vscode.tasks.fetchTasks();
                return resolve(tasks.filter((task) => task.group === vscode.TaskGroup.Build));
            } catch (err) {
                throw err;
            }
        });
    };

    activate = (context: vscode.ExtensionContext) => {
        const command = vscode.commands.registerCommand(
            "chalet-tools.makeDebugBuild",
            async () => {
                try {
                    if (vscode.window.activeTextEditor) {
                        const document = vscode.window.activeTextEditor.document;
                        document.save();
                        // const text = document.getText(range);
                        // console.log(text);

                        const workspace = vscode.workspace.getWorkspaceFolder(document.uri);
                        /*
                    const shellExec = new vscode.ProcessExecution("chalet", ["build", "Debug"], {
                        cwd: workspace?.uri.fsPath ?? undefined,
                        env: {},
                    });
                    */

                        const customExec = new vscode.CustomExecution(
                            async (def: vscode.TaskDefinition): Promise<vscode.Pseudoterminal> => {
                                return new CustomTerminal({
                                    name: "Chalet",
                                    shellPath: "chalet",
                                    shellArgs: ["build", "Debug"],
                                    cwd: workspace?.uri.fsPath ?? undefined,
                                });
                            }
                        );

                        const task = new vscode.Task(
                            definition,
                            vscode.TaskScope.Workspace,
                            "Chalet",
                            "chalet",
                            customExec,
                            "$gcc"
                        );
                        task.group = vscode.TaskGroup.Build;
                        task.presentationOptions = {
                            echo: false,
                            reveal: vscode.TaskRevealKind.Always,
                            focus: true,
                            panel: vscode.TaskPanelKind.Shared,
                            clear: false,
                            showReuseMessage: false,
                        };

                        this.taskExecution = await vscode.tasks.executeTask(task);
                        let disposable = vscode.tasks.onDidEndTask((e) => {
                            disposable.dispose();
                            this.taskExecution?.terminate();
                            this.taskExecution = null;
                        });

                        // const buildTasks = await this.getBuildTasks();
                        // await this.executeBuildTask(task);
                    }
                } catch (err) {
                    console.error(err.message);
                }
            },
            this
        );

        context.subscriptions.push(command);
    };

    deactivate = () => {
        this.taskExecution?.terminate();
        this.taskExecution = null;
    };
}

export { ChaletToolsLoader };
