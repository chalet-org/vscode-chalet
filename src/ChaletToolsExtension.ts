import * as fs from "fs";
import * as vscode from "vscode";
import * as CommentJSON from "comment-json";
import {
    BuildArchitecture,
    BuildConfigurations,
    ChaletCommands,
    ChaletVersion,
    CommandId,
    VSCodePlatform,
} from "./Types/Enums";
import { getTerminalEnv } from "./Functions";
import { Optional } from "./Types";
import { SpawnError } from "./Terminal/TerminalProcess";
import { ChaletTaskProvider } from "./Terminal/ChaletTaskProvider";
import { BuildConfigurationCommand } from "./Commands/BuildConfigurationCommand";
import { BuildArchitectureCommand } from "./Commands/BuildArchitectureCommand";
import { ChaletStatusBarCommand } from "./Commands/ChaletStatusBarCommand";

class ChaletToolsExtension {
    chaletCommand: ChaletStatusBarCommand;
    buildConfiguration: BuildConfigurationCommand;
    buildArchitecture: BuildArchitectureCommand;

    runProjects: string[] = [];
    statusBarDoAction: vscode.StatusBarItem;

    taskProvider: ChaletTaskProvider;

    workspaceState: vscode.Memento;

    useDebugChalet: boolean = false;
    enabled: boolean = false;
    cwd: string = "";
    inputFile: string = "chalet.json";
    settingsFile: string = "";
    rootDir: string = "";
    outputDir: string = "build";
    envFile: string = ".env";

    private addStatusBarCommand = (
        { subscriptions }: vscode.ExtensionContext,
        statusBarItem: vscode.StatusBarItem,
        id: CommandId,
        onClick: () => Promise<void>
    ) => {
        const command: string = `chalet-tools.${id}`;
        subscriptions.push(vscode.commands.registerCommand(command, onClick));

        statusBarItem.command = command;
        statusBarItem.show();
        subscriptions.push(statusBarItem);
    };

    constructor(context: vscode.ExtensionContext, public platform: VSCodePlatform) {
        this.taskProvider = new ChaletTaskProvider();
        this.workspaceState = context.workspaceState;

        {
            const command: string = `chalet-tools.${CommandId.MakeDebugBuild}`;
            context.subscriptions.push(vscode.commands.registerCommand(command, this.actionMakeDebugBuild));
        }

        this.chaletCommand = new ChaletStatusBarCommand(context, 4);
        this.chaletCommand.setOnClickCallback(this.updateStatusBarItems);

        this.buildConfiguration = new BuildConfigurationCommand(context, 3);
        this.buildConfiguration.setOnClickCallback(this.updateStatusBarItems);

        this.buildArchitecture = new BuildArchitectureCommand(context, 2);
        this.buildArchitecture.setOnClickCallback(this.updateStatusBarItems);

        this.statusBarDoAction = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        this.addStatusBarCommand(context, this.statusBarDoAction, CommandId.Run, this.actionRunChalet);
    }

    activate = async () => {
        try {
            await this.chaletCommand.initialize();
            await this.buildConfiguration.initialize();
            await this.buildArchitecture.initialize();
        } catch (err) {
            console.error(err.message);
        }
    };

    deactivate = () => {
        this.taskProvider.dispose();

        this.chaletCommand.dispose();
        this.buildConfiguration.dispose();
        this.buildArchitecture.dispose();

        this.statusBarDoAction.dispose();
    };

    setEnabled = (enabled: boolean) => {
        if (this.enabled === enabled) return;

        this.enabled = enabled;

        this.updateStatusBarItems();
    };

    setWorkingDirectory = (cwd: string) => {
        this.cwd = cwd;
    };

    setInputFile = (path: string) => {
        this.inputFile = path;
    };

    getExtensionSettings = () => {
        const workbenchConfig = vscode.workspace.getConfiguration("chalet-tools");
        const useDebugChalet = workbenchConfig.get<boolean>("useDebugChalet");

        if (useDebugChalet) {
            if (this.useDebugChalet === useDebugChalet) return;

            this.useDebugChalet = useDebugChalet;
        }

        // const targetArchitectures = workbenchConfig.get<string[]>("targetArchitectures");
        // if (targetArchitectures) {
        //     this.targetArchitectures = targetArchitectures;

        // this.buildArchitectureMenu = [...this.defaultArchitecture, ...this.targetArchitectures];
        // }
    };

    handleBuildJsonChange = (): void => {
        try {
            const rawData = fs.readFileSync(this.inputFile, "utf8");
            const chaletJson = CommentJSON.parse(rawData, undefined, true);
            let configurations: any = chaletJson["configurations"];
            if (configurations) {
                if (Array.isArray(configurations)) {
                    this.buildConfiguration.setMenu(
                        configurations.reduce((out: string[], item) => {
                            if (typeof item === "string") {
                                if (this.buildConfiguration.valid(item)) {
                                    out.push(item);
                                }
                            }
                            return out;
                        }, [] as string[])
                    );
                } else if (typeof configurations === "object") {
                    this.buildConfiguration.resetMenu();
                    for (const [key, value] of Object.entries(configurations)) {
                        let item: any = value;
                        if (item && typeof item === "object") {
                            this.buildConfiguration.addToMenu(key);
                        }
                    }
                } else {
                    return;
                }

                this.buildConfiguration.refreshMenuAndValue();

                this.setRunProjectName(chaletJson);
                return;
            }

            this.setRunProjectName(chaletJson);

            this.buildConfiguration.setDefaults();
        } catch {
            return;
        }
    };

    private setRunProjectName = (chaletJson: any): void => {
        this.runProjects = [];
        let projects: any = chaletJson["projects"];
        if (projects && typeof projects === "object") {
            this.runProjects = [];
            for (const [key, value] of Object.entries(projects)) {
                let item: any = value;
                if (item && typeof item === "object") {
                    if (item.kind && (item.kind === "desktopApplication" || item.kind === "consoleApplication")) {
                        if (!!item.runProject) this.runProjects.push(key);
                    }
                }
            }

            this.updateStatusBarItems();
        }
    };

    private onTerminalStart = (): void => {
        // console.log("chalet started");
    };

    private onTerminalSuccess = (): void => {
        // console.log("chalet finished");
    };

    private onTerminalFailure = (err?: SpawnError): void => {
        // console.log("chalet errored!");
    };

    private runChalet = async (command: Optional<ChaletCommands>, buildConfig: Optional<string>): Promise<void> => {
        try {
            if (command === null) return;

            let shellArgs: string[] = [];

            shellArgs.push("--input-file");
            shellArgs.push(this.inputFile);

            if (this.settingsFile.length > 0) {
                shellArgs.push("--settings-file");
                shellArgs.push(this.settingsFile);
            }

            if (this.rootDir.length > 0) {
                shellArgs.push("--root-dir");
                shellArgs.push(this.inputFile);
            }

            shellArgs.push("--output-dir");
            shellArgs.push(this.outputDir);

            shellArgs.push("--env-file");
            shellArgs.push(this.envFile);

            /*if (this.buildArchitecture.length > 0 && this.buildArchitecture != BuildArchitecture.Auto) {
                shellArgs.push("--arch");
                if (this.buildArchitecture === BuildArchitecture.x64 && this.platform !== VSCodePlatform.Windows) {
                    shellArgs.push(BuildArchitecture.Auto);
                } else {
                    shellArgs.push(this.buildArchitecture);
                }
            }*/

            shellArgs.push(this.chaletCommand.getCliSubCommand(command));

            if (this.buildConfiguration.required(command)) {
                if (buildConfig) {
                    shellArgs.push(buildConfig);
                }
            }

            const env = getTerminalEnv(this.platform);
            await this.taskProvider.execute({
                name: "Chalet" + (this.useDebugChalet ? " (Debug)" : ""),
                cwd: this.cwd,
                env,
                autoClear: false,
                shellPath: this.useDebugChalet ? ChaletVersion.Debug : ChaletVersion.Release,
                shellArgs,
                onStart: this.onTerminalStart,
                onSuccess: this.onTerminalSuccess,
                // onFailure: this.onTerminalFailure,
            });
        } catch (err) {
            console.error(err);
        }
    };

    private actionRunChalet = () => this.runChalet(this.chaletCommand.getValue(), this.buildConfiguration.getValue());

    private actionMakeDebugBuild = () => this.runChalet(ChaletCommands.Build, BuildConfigurations.Debug);

    updateStatusBarItems = (): void => {
        if (!this.enabled) {
            this.chaletCommand.setVisible(false);
            this.buildConfiguration.setVisible(false);
            this.buildArchitecture.setVisible(false);
            this.statusBarDoAction.hide();
            return;
        }

        this.chaletCommand.setVisible(true);
        const chaletCommand = this.chaletCommand.getValue();
        if (chaletCommand !== null) {
            this.buildConfiguration.updateAndSetVisibility(chaletCommand);
        }
        this.buildArchitecture.setVisible(true);

        this.statusBarDoAction.show();

        const icon: string = this.chaletCommand.getIcon();
        if (this.runProjects.length > 0 && this.chaletCommand.willRun()) {
            this.updateStatusBarItem(this.statusBarDoAction, `${icon} ${this.runProjects[0]}`);
        } else {
            this.updateStatusBarItem(this.statusBarDoAction, icon);
        }
    };

    private updateStatusBarItem = (item: vscode.StatusBarItem, text: string): void => {
        item.text = text;
        item.show();
    };
}

export { ChaletToolsExtension };
