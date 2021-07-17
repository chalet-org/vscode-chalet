import * as fs from "fs";
import * as vscode from "vscode";
import * as CommentJSON from "comment-json";
import * as path from "path";

import { getTerminalEnv } from "./Functions";
import {
    // BuildArchitecture,
    BuildConfigurations,
    ChaletCommands,
    ChaletVersion,
    CommandId,
    VSCodePlatform,
    Optional,
} from "./Types";
import { SpawnError } from "./Terminal/TerminalProcess";
import { ChaletTaskProvider } from "./Terminal/ChaletTaskProvider";
import {
    // BuildArchitectureCommandMenu,
    BuildConfigurationCommandMenu,
    ChaletStatusBarCommandMenu,
    RunChaletCommandButton,
} from "./Commands";
import { getCommandID } from "./Functions";
import { OutputChannel } from "./OutputChannel";
import { EXTENSION_ID } from "./ExtensionID";

class ChaletToolsExtension {
    chaletCommand: ChaletStatusBarCommandMenu;
    buildConfiguration: BuildConfigurationCommandMenu;
    // buildArchitecture: BuildArchitectureCommandMenu;
    runChaletButton: RunChaletCommandButton;

    runProjects: string[] = [];

    taskProvider: ChaletTaskProvider;

    useDebugChalet: boolean = false;
    enabled: boolean = false;
    cwd: string = "";

    inputFile: string = "";
    settingsFile: string = "";
    envFile: string = "";

    rootDir: string = "";
    outputDir: string = "build";

    private onRunChalet = () => this.runChalet(this.chaletCommand.getValue(), this.buildConfiguration.getValue());
    private onMakeDebugBuild = () => this.runChalet(ChaletCommands.Build, BuildConfigurations.Debug);

    constructor(context: vscode.ExtensionContext, public platform: VSCodePlatform) {
        this.taskProvider = new ChaletTaskProvider();

        {
            const command = getCommandID(CommandId.MakeDebugBuild);
            context.subscriptions.push(vscode.commands.registerCommand(command, this.onMakeDebugBuild));
        }

        this.chaletCommand = new ChaletStatusBarCommandMenu(this.updateStatusBarItems, context, 4);
        this.buildConfiguration = new BuildConfigurationCommandMenu(this.updateStatusBarItems, context, 3);
        // this.buildArchitecture = new BuildArchitectureCommandMenu(this.updateStatusBarItems, context, 2);
        this.runChaletButton = new RunChaletCommandButton(this.onRunChalet, context, 1);
    }

    activate = async () => {
        await this.chaletCommand.initialize();
        await this.buildConfiguration.initialize();
        // await this.buildArchitecture.initialize();
        this.updateStatusBarItems();
    };

    deactivate = () => {
        this.taskProvider.dispose();

        this.chaletCommand.dispose();
        this.buildConfiguration.dispose();
        // this.buildArchitecture.dispose();
        this.runChaletButton.dispose();
    };

    setEnabled = (enabled: boolean) => {
        if (this.enabled === enabled) return;

        this.enabled = enabled;
        this.chaletCommand.setVisible(this.enabled);
        this.buildConfiguration.setVisible(this.enabled);
        // this.buildArchitecture.setVisible(this.enabled);
        this.runChaletButton.setVisible(this.enabled);

        this.updateStatusBarItems();
    };

    setWorkingDirectory = (cwd: string) => {
        this.cwd = cwd;

        if (this.settingsFile.length === 0) {
            this.settingsFile = path.join(this.cwd, ".chaletrc");
        }

        if (this.envFile.length === 0) {
            this.envFile = path.join(this.cwd, ".env");
        }
    };

    setInputFile = (inPath: string) => {
        this.inputFile = inPath;
    };

    getExtensionSettings = () => {
        const workbenchConfig = vscode.workspace.getConfiguration(EXTENSION_ID);
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
                                if (this.buildConfiguration.isDefault(item)) {
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

            this.buildConfiguration.setDefaultMenu();
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    private setRunProjectName = (chaletJson: any): void => {
        this.runProjects = [];
        let targets: any = chaletJson["targets"];
        if (targets && typeof targets === "object") {
            this.runProjects = [];
            for (const [key, value] of Object.entries(targets)) {
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
        OutputChannel.logWithName("process started");
    };

    private onTerminalSuccess = (code?: Optional<number>, signal?: Optional<NodeJS.Signals>): void => {
        OutputChannel.logWithName(`process exited with code: ${code}`);
    };

    private onTerminalFailure = (err?: SpawnError): void => {
        OutputChannel.logError(err);
    };

    private stripCwd = (inPath: string): string => {
        const pathSeparator = this.platform === VSCodePlatform.Windows ? "\\" : "/";
        return inPath.replaceAll(`${this.cwd}${pathSeparator}`, "");
    };

    private runChalet = async (command: Optional<ChaletCommands>, buildConfig: Optional<string>): Promise<void> => {
        try {
            if (command === null) return;

            let shellArgs: string[] = [];

            if (this.inputFile.length > 0 && fs.existsSync(this.inputFile)) {
                shellArgs.push("--input-file");
                shellArgs.push(this.stripCwd(this.inputFile));
            }

            if (this.settingsFile.length > 0 && fs.existsSync(this.settingsFile)) {
                shellArgs.push("--settings-file");
                shellArgs.push(this.stripCwd(this.settingsFile));
            }

            if (this.rootDir.length > 0) {
                shellArgs.push("--root-dir");
                shellArgs.push(this.stripCwd(this.rootDir));
            }

            shellArgs.push("--output-dir");
            shellArgs.push(this.stripCwd(this.outputDir));

            if (this.envFile.length > 0 && fs.existsSync(this.envFile)) {
                shellArgs.push("--env-file");
                shellArgs.push(this.stripCwd(this.envFile));
            }

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

            const shellPath = this.useDebugChalet ? ChaletVersion.Debug : ChaletVersion.Release;
            const name = `Chalet${this.useDebugChalet ? " (Debug)" : ""}`;
            const env = getTerminalEnv(this.platform);
            const icon = this.chaletCommand.getIcon();

            OutputChannel.logCommand(`${shellPath} ${shellArgs.join(" ")}`);
            OutputChannel.logCommand(`cwd: ${this.cwd}`);
            // OutputChannel.logCommand(`env: ${JSON.stringify(env, undefined, 3)}`);

            await this.taskProvider.execute({
                name,
                autoClear: false,
                shellPath,
                shellArgs,
                cwd: this.cwd,
                env,
                icon,
                onStart: this.onTerminalStart,
                onSuccess: this.onTerminalSuccess,
                onFailure: this.onTerminalFailure,
            });
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    updateStatusBarItems = async (): Promise<void> => {
        if (!this.enabled) return;

        await this.buildConfiguration.requiredForVisibility(this.chaletCommand.getValue());
        this.runChaletButton.updateLabelFromChaletCommand(this.chaletCommand, this.runProjects[0]);
    };
}

export { ChaletToolsExtension };
