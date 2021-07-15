import * as fs from "fs";
import { window, workspace, commands, StatusBarAlignment, ExtensionContext, StatusBarItem, Memento } from "vscode";
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
import { TerminalController } from "./Terminal/TerminalController";
import { SpawnError } from "./Terminal/TerminalProcess";

class ChaletToolsExtension {
    chaletCommand: ChaletCommands;
    statusBarChaletCommand: StatusBarItem;
    chaletCommandMenu: ChaletCommands[] = [
        ChaletCommands.BuildRun,
        ChaletCommands.Run,
        ChaletCommands.Build,
        ChaletCommands.Rebuild,
        ChaletCommands.Clean,
        ChaletCommands.Bundle,
        ChaletCommands.Configure,
    ];

    buildConfiguration: Optional<string> = null;
    statusBarBuildConfiguration: StatusBarItem;
    buildConfigurationMenu: (BuildConfigurations | string)[] = [];

    buildArchitecture: string;
    statusBarBuildArchitecture?: StatusBarItem;
    buildArchitectureMenu: (BuildArchitecture | string)[] = [];
    defaultArchitecture: BuildArchitecture[];

    runProjects: string[] = [];
    statusBarDoAction: StatusBarItem;

    terminalController: Optional<TerminalController> = null;

    workspaceState: Memento;

    useDebugChalet: boolean = false;
    enabled: boolean = false;
    cwd: string = "";
    inputFile: string = "chalet.json";
    settingsFile: string = "";
    rootDir: string = "";
    outputDir: string = "build";
    envFile: string = ".env";

    targetArchitectures: string[] = [];

    private addStatusBarCommand = (
        { subscriptions }: ExtensionContext,
        statusBarItem: StatusBarItem,
        id: CommandId,
        onClick: () => Promise<void>
    ) => {
        const command: string = `chalet-tools.${id}`;
        subscriptions.push(commands.registerCommand(command, onClick));

        statusBarItem.command = command;
        statusBarItem.show();
        subscriptions.push(statusBarItem);
    };

    constructor(context: ExtensionContext, public platform: VSCodePlatform) {
        this.terminalController = new TerminalController();
        this.workspaceState = context.workspaceState;

        {
            const command: string = `chalet-tools.${CommandId.MakeDebugBuild}`;
            context.subscriptions.push(commands.registerCommand(command, this.actionMakeDebugBuild));
        }

        this.statusBarChaletCommand = window.createStatusBarItem(StatusBarAlignment.Left, 4);
        this.addStatusBarCommand(
            context,
            this.statusBarChaletCommand,
            CommandId.ChaletCommand,
            this.actionChaletCommandQuickPick
        );

        this.statusBarBuildConfiguration = window.createStatusBarItem(StatusBarAlignment.Left, 3);
        this.addStatusBarCommand(
            context,
            this.statusBarBuildConfiguration,
            CommandId.BuildConfiguration,
            this.actionBuildConfigurationQuickPick
        );

        if (this.platform == VSCodePlatform.Windows) {
            this.defaultArchitecture = [BuildArchitecture.x64, BuildArchitecture.x86];
        } else {
            this.defaultArchitecture = [BuildArchitecture.x64];
        }

        this.statusBarBuildArchitecture = window.createStatusBarItem(StatusBarAlignment.Left, 2);
        this.addStatusBarCommand(
            context,
            this.statusBarBuildArchitecture,
            CommandId.BuildArchitecture,
            this.actionBuildArchitectureQuickPick
        );

        this.statusBarDoAction = window.createStatusBarItem(StatusBarAlignment.Left, 1);
        this.addStatusBarCommand(context, this.statusBarDoAction, CommandId.Run, this.actionRunChalet);

        this.chaletCommand = this.workspaceState.get(CommandId.ChaletCommand, ChaletCommands.BuildRun);
        this.buildArchitecture = this.workspaceState.get(CommandId.BuildArchitecture, BuildArchitecture.x64);

        this.buildConfiguration = this.workspaceState.get(CommandId.BuildConfiguration, null);
    }

    deactivate = () => {
        this.terminalController?.dispose();
        this.terminalController = null;

        this.statusBarChaletCommand.dispose();
        this.statusBarBuildConfiguration.dispose();
        this.statusBarBuildArchitecture?.dispose();
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
        const workbenchConfig = workspace.getConfiguration("chalet-tools");
        const useDebugChalet = workbenchConfig.get<boolean>("useDebugChalet");

        if (useDebugChalet) {
            if (this.useDebugChalet === useDebugChalet) return;

            this.useDebugChalet = useDebugChalet;
        }

        const targetArchitectures = workbenchConfig.get<string[]>("targetArchitectures");
        if (targetArchitectures) {
            this.targetArchitectures = targetArchitectures;

            this.buildArchitectureMenu = [...this.defaultArchitecture, ...this.targetArchitectures];
        }
    };

    private setChaletCommand = async (value: ChaletCommands): Promise<void> => {
        this.chaletCommand = value;
        await this.workspaceState.update(CommandId.ChaletCommand, value);
    };

    private setBuildConfiguration = async (value: Optional<string>): Promise<void> => {
        this.buildConfiguration = value;
        await this.workspaceState.update(CommandId.BuildConfiguration, value);
    };

    private setBuildArchitecture = async (value: BuildArchitecture): Promise<void> => {
        this.buildArchitecture = value;
        await this.workspaceState.update(CommandId.BuildArchitecture, value);
    };

    private setDefaultBuildConfigurations = (): void => {
        this.buildConfigurationMenu = [
            BuildConfigurations.Debug,
            BuildConfigurations.Release,
            BuildConfigurations.RelWithDebInfo,
            BuildConfigurations.MinSizeRel,
            BuildConfigurations.Profile,
        ];

        if (this.buildConfiguration === null || !this.buildConfigurationMenu.includes(this.buildConfiguration)) {
            this.setBuildConfiguration(BuildConfigurations.Debug);
        }
    };

    handleBuildJsonChange = (): void => {
        try {
            const rawData = fs.readFileSync(this.inputFile, "utf8");
            const chaletJson = CommentJSON.parse(rawData, undefined, true);
            let configurations: any = chaletJson["configurations"];
            if (configurations) {
                if (Array.isArray(configurations)) {
                    this.buildConfigurationMenu = configurations.reduce((out: string[], item) => {
                        if (typeof item === "string") {
                            if (
                                item === BuildConfigurations.Debug ||
                                item === BuildConfigurations.Release ||
                                item === BuildConfigurations.RelWithDebInfo ||
                                item === BuildConfigurations.MinSizeRel ||
                                item === BuildConfigurations.Profile
                            )
                                out.push(item);
                        }
                        return out;
                    }, [] as string[]);
                } else if (typeof configurations === "object") {
                    this.buildConfigurationMenu = [];
                    for (const [key, value] of Object.entries(configurations)) {
                        let item: any = value;
                        if (item && typeof item === "object") {
                            this.buildConfigurationMenu.push(key);
                        }
                    }
                } else {
                    return;
                }

                if (
                    (this.buildConfigurationMenu.length > 0 && this.buildConfiguration === null) ||
                    (this.buildConfiguration !== null && !this.buildConfigurationMenu.includes(this.buildConfiguration))
                ) {
                    this.setBuildConfiguration(this.buildConfigurationMenu[0]);
                }

                if (this.buildConfiguration !== null && this.buildConfigurationMenu.length === 0) {
                    this.setBuildConfiguration(null);
                }

                this.setRunProjectName(chaletJson);
                return;
            }

            this.setRunProjectName(chaletJson);

            this.setDefaultBuildConfigurations();
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

    private actionChaletCommandQuickPick = async (): Promise<void> => {
        try {
            const result = await window.showQuickPick(this.chaletCommandMenu);
            if (result) {
                this.setChaletCommand(result as ChaletCommands);
            }
            this.updateStatusBarItems();
        } catch (err) {
            console.error(err);
        }
    };

    private actionBuildConfigurationQuickPick = async (): Promise<void> => {
        try {
            if (this.buildConfiguration === null) return;

            const result = await window.showQuickPick(this.buildConfigurationMenu);
            if (result) {
                this.setBuildConfiguration(result);
            }
            this.updateStatusBarItems();
        } catch (err) {
            console.error(err);
        }
    };

    private actionBuildArchitectureQuickPick = async (): Promise<void> => {
        try {
            const result = await window.showQuickPick(this.buildArchitectureMenu);
            if (result) {
                this.setBuildArchitecture(result as BuildArchitecture);
            }
            this.updateStatusBarItems();
        } catch (err) {
            console.error(err);
        }
    };

    private onTerminalStart = (): void => {
        console.log("chalet started");
    };

    private onTerminalSuccess = (): void => {
        console.log("chalet finished");
    };

    private onTerminalFailure = (err?: SpawnError): void => {
        console.log("chalet errored!");
    };

    private runChalet = async (command: ChaletCommands, buildConfig: Optional<string>): Promise<void> => {
        try {
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

            if (this.buildArchitecture.length > 0 && this.buildArchitecture != BuildArchitecture.Auto) {
                shellArgs.push("--arch");
                if (this.buildArchitecture === BuildArchitecture.x64 && this.platform !== VSCodePlatform.Windows) {
                    shellArgs.push(BuildArchitecture.Auto);
                } else {
                    shellArgs.push(this.buildArchitecture);
                }
            }

            shellArgs.push(this.getCommandFromLabel(command));

            if (this.usesBuildConfiguration(command)) {
                if (buildConfig) {
                    shellArgs.push(buildConfig);
                }
            }

            if (this.terminalController) {
                const env = getTerminalEnv(this.platform);
                await this.terminalController.execute({
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
            }
        } catch (err) {
            console.error(err);
        }
    };

    private actionRunChalet = () => this.runChalet(this.chaletCommand, this.buildConfiguration);

    private actionMakeDebugBuild = () => this.runChalet(ChaletCommands.Build, BuildConfigurations.Debug);

    updateStatusBarItems = (): void => {
        if (!this.enabled) {
            this.statusBarChaletCommand.hide();
            this.statusBarBuildConfiguration.hide();
            this.statusBarBuildArchitecture?.hide();
            this.statusBarDoAction.hide();
            return;
        }

        this.statusBarChaletCommand.show();
        this.statusBarDoAction.show();

        this.updateStatusBarItem(this.statusBarChaletCommand, this.chaletCommand);

        if (this.usesBuildConfiguration(this.chaletCommand)) {
            this.updateStatusBarItem(
                this.statusBarBuildConfiguration,
                this.buildConfiguration ??
                    (this.buildConfigurationMenu.length > 0
                        ? this.buildConfigurationMenu[0]
                        : BuildConfigurations.Invalid)
            );

            this.statusBarBuildConfiguration.show();
        } else {
            this.statusBarBuildConfiguration.hide();
        }

        if (this.statusBarBuildArchitecture) {
            this.updateStatusBarItem(this.statusBarBuildArchitecture, this.buildArchitecture);
        }
        this.statusBarBuildArchitecture?.show();

        let icon: string = this.getIcon();

        if (
            this.runProjects.length > 0 &&
            (this.chaletCommand === ChaletCommands.Run || this.chaletCommand === ChaletCommands.BuildRun)
        ) {
            this.updateStatusBarItem(this.statusBarDoAction, `${icon} ${this.runProjects[0]}`);
        } else {
            this.updateStatusBarItem(this.statusBarDoAction, icon);
        }
    };

    private getIcon = (): string => {
        switch (this.chaletCommand) {
            case ChaletCommands.Build:
            case ChaletCommands.Rebuild:
                return "$(tools)";
            case ChaletCommands.Clean:
                return "$(trash)";
            case ChaletCommands.Bundle:
                return "$(package)";
            case ChaletCommands.Configure:
                return "$(circuit-board)";
            case ChaletCommands.Init:
                return "$(rocket)";

            case ChaletCommands.Run:
            case ChaletCommands.BuildRun:
            default:
                return "$(play)";
        }
    };

    private updateStatusBarItem = (item: StatusBarItem, text: string): void => {
        item.text = text;
        item.show();
    };

    private usesBuildConfiguration = (command: ChaletCommands): boolean => {
        return (
            command === ChaletCommands.Build ||
            command === ChaletCommands.Run ||
            command === ChaletCommands.BuildRun ||
            command === ChaletCommands.Rebuild ||
            command === ChaletCommands.Clean
        );
    };

    private getCommandFromLabel = (label: ChaletCommands): string => {
        switch (label) {
            case ChaletCommands.BuildRun:
                return "buildrun";
            case ChaletCommands.Run:
                return "run";
            case ChaletCommands.Build:
                return "build";
            case ChaletCommands.Rebuild:
                return "rebuild";
            case ChaletCommands.Clean:
                return "clean";
            case ChaletCommands.Bundle:
                return "bundle";
            case ChaletCommands.Configure:
                return "configure";
            case ChaletCommands.Init:
                return "init";
        }
    };
}

export { ChaletToolsExtension };
