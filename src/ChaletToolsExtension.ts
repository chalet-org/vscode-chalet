import * as fs from "fs";
import { window, workspace, commands, StatusBarAlignment, ExtensionContext, StatusBarItem, Memento } from "vscode";
import * as CommentJSON from "comment-json";
import { TerminalController } from "./Commands";
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

    buildArchitecture: BuildArchitecture;
    statusBarBuildArchitecture: StatusBarItem;
    buildArchitectureMenu: BuildArchitecture[] = [BuildArchitecture.x64, BuildArchitecture.x86];

    runProjects: string[] = [];

    doActionIcon: string = "$(play)";
    statusBarDoAction: StatusBarItem;

    terminalController: Optional<TerminalController> = null;

    workspaceState: Memento;

    useDebugChalet: boolean = false;
    enabled: boolean = false;
    cwd: string = "";
    buildJsonPath: string = "build.json";

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
        if (this.terminalController) {
            this.terminalController.haltSubProcess();
        }
        this.terminalController = null;

        this.statusBarChaletCommand.dispose();
        this.statusBarBuildConfiguration.dispose();
        this.statusBarBuildArchitecture.dispose();
        this.statusBarDoAction.dispose();
    };

    setEnabled = (enabled: boolean) => {
        if (this.enabled === enabled) return;

        this.enabled = enabled;

        if (this.enabled) {
            this.statusBarChaletCommand.show();
            this.statusBarBuildConfiguration.show();
            this.statusBarBuildArchitecture.show();
            this.statusBarDoAction.show();
        } else {
            this.statusBarChaletCommand.hide();
            this.statusBarBuildConfiguration.hide();
            this.statusBarBuildArchitecture.hide();
            this.statusBarDoAction.hide();
        }
    };

    setWorkingDirectory = (cwd: string) => {
        this.cwd = cwd;
    };

    setBuildJsonPath = (path: string) => {
        this.buildJsonPath = path;
    };

    getExtensionSettings = () => {
        const workbenchConfig = workspace.getConfiguration("chalet-tools");
        const useDebugChalet = workbenchConfig.get<boolean>("useDebugChalet");

        if (useDebugChalet) {
            if (this.useDebugChalet === useDebugChalet) return;

            this.useDebugChalet = useDebugChalet;
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
        const rawData = fs.readFileSync(this.buildJsonPath, "utf8");
        const buildJson = CommentJSON.parse(rawData, undefined, true);
        let configurations: any = buildJson["configurations"];
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
                    } else {
                        if (item.name) out.push(item.name);
                    }
                    return out;
                }, [] as string[]);

                if (
                    (this.buildConfigurationMenu.length > 0 && this.buildConfiguration === null) ||
                    (this.buildConfiguration !== null && !this.buildConfigurationMenu.includes(this.buildConfiguration))
                ) {
                    this.setBuildConfiguration(this.buildConfigurationMenu[0]);
                }

                if (this.buildConfiguration !== null && this.buildConfigurationMenu.length === 0) {
                    this.setBuildConfiguration(null);
                }

                this.setRunProjectName(buildJson);
                return;
            }
        }

        this.setRunProjectName(buildJson);

        this.setDefaultBuildConfigurations();
    };

    private setRunProjectName = (buildJson: any): void => {
        this.runProjects = [];
        let projects: any = buildJson["projects"];
        if (projects) {
            if (Array.isArray(projects)) {
                this.runProjects = projects.reduce((out: string[], item) => {
                    if (typeof item === "object") {
                        if (item.kind && (item.kind === "desktopApplication" || item.kind === "consoleApplication")) {
                            if (!!item.runProject) out.push(item.name);
                        }
                    }
                    return out;
                }, [] as string[]);
            }

            this.updateStatusBarItems();
        }
    };

    private actionChaletCommandQuickPick = async (): Promise<void> => {
        const result = await window.showQuickPick(this.chaletCommandMenu);
        if (result) {
            this.setChaletCommand(result as ChaletCommands);
        }
        this.updateStatusBarItems();
    };

    private actionBuildConfigurationQuickPick = async (): Promise<void> => {
        if (this.buildConfiguration === null) return;

        const result = await window.showQuickPick(this.buildConfigurationMenu);
        if (result) {
            this.setBuildConfiguration(result);
        }
        this.updateStatusBarItems();
    };

    private actionBuildArchitectureQuickPick = async (): Promise<void> => {
        const result = await window.showQuickPick(this.buildArchitectureMenu);
        if (result) {
            this.setBuildArchitecture(result as BuildArchitecture);
        }
        this.updateStatusBarItems();
    };

    private onTerminalStart = (): void => {
        // console.log("chalet started");
    };

    private onTerminalSuccess = (): void => {
        // console.log("chalet finished");
    };

    private onTerminalFailure = (): void => {
        console.log("chalet errored!");
    };

    private runChalet = async (command: ChaletCommands, buildConfig: Optional<string>): Promise<void> => {
        try {
            let shellArgs: string[] = [];

            shellArgs.push(this.getCommandFromLabel(command));

            if (this.usesBuildConfiguration(command)) {
                if (buildConfig) {
                    shellArgs.push(buildConfig);
                }
            }

            if (this.terminalController) {
                const env = getTerminalEnv(this.platform);
                await this.terminalController.execute({
                    name: this.useDebugChalet ? "Chalet (Debug)" : "Chalet",
                    cwd: this.cwd,
                    env,
                    autoClear: false,
                    shellPath: this.useDebugChalet ? ChaletVersion.Debug : ChaletVersion.Release,
                    shellArgs,
                    onStart: this.onTerminalStart,
                    onSuccess: this.onTerminalSuccess,
                    onFailure: this.onTerminalFailure,
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    private actionRunChalet = () => this.runChalet(this.chaletCommand, this.buildConfiguration);

    private actionMakeDebugBuild = () => this.runChalet(ChaletCommands.Build, BuildConfigurations.Debug);

    updateStatusBarItems = (): void => {
        this.updateStatusBarItem(this.statusBarChaletCommand, this.chaletCommand);

        if (this.usesBuildConfiguration(this.chaletCommand)) {
            this.updateStatusBarItem(
                this.statusBarBuildConfiguration,
                this.buildConfiguration ??
                    (this.buildConfigurationMenu.length > 0
                        ? this.buildConfigurationMenu[0]
                        : BuildConfigurations.Invalid)
            );
            this.updateStatusBarItem(this.statusBarBuildArchitecture, this.buildArchitecture);
        } else {
            this.statusBarBuildConfiguration.hide();
            this.statusBarBuildArchitecture.hide();
        }

        if (
            this.runProjects.length > 0 &&
            (this.chaletCommand === ChaletCommands.Run || this.chaletCommand === ChaletCommands.BuildRun)
        ) {
            this.updateStatusBarItem(this.statusBarDoAction, `${this.doActionIcon} ${this.runProjects[0]}`);
        } else {
            this.updateStatusBarItem(this.statusBarDoAction, this.doActionIcon);
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
