import * as fs from "fs";
import { window, commands, StatusBarAlignment, ExtensionContext, StatusBarItem, Memento } from "vscode";
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
        ChaletCommands.Install,
        ChaletCommands.Configure,
    ];

    buildConfiguration: Optional<string> = null;
    statusBarBuildConfiguration: StatusBarItem;
    buildConfigurationMenu: (BuildConfigurations | string)[] = [];

    buildArchitecture: BuildArchitecture;
    statusBarBuildArchitecture: StatusBarItem;
    buildArchitectureMenu: BuildArchitecture[] = [BuildArchitecture.x64, BuildArchitecture.x86];

    doActionIcon: string = "$(play)";
    statusBarDoAction: StatusBarItem;

    terminalController: Optional<TerminalController> = null;

    workspaceState: Memento;

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

    private setChaletCommand = async (value: ChaletCommands) => {
        this.chaletCommand = value;
        await this.workspaceState.update(CommandId.ChaletCommand, value);
    };

    private setBuildConfiguration = async (value: Optional<string>) => {
        this.buildConfiguration = value;
        await this.workspaceState.update(CommandId.BuildConfiguration, value);
    };

    private setBuildArchitecture = async (value: BuildArchitecture) => {
        this.buildArchitecture = value;
        await this.workspaceState.update(CommandId.BuildArchitecture, value);
    };

    private setDefaultBuildConfigurations = () => {
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

    handleBuildJsonChange = () => {
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

                return;
            }
        }

        this.setDefaultBuildConfigurations();
    };

    private actionChaletCommandQuickPick = async () => {
        const result = await window.showQuickPick(this.chaletCommandMenu);
        if (result) {
            this.setChaletCommand(result as ChaletCommands);
        }
        this.updateStatusBarItems();
    };

    private actionBuildConfigurationQuickPick = async () => {
        if (this.buildConfiguration === null) return;

        const result = await window.showQuickPick(this.buildConfigurationMenu);
        if (result) {
            this.setBuildConfiguration(result);
        }
        this.updateStatusBarItems();
    };

    private actionBuildArchitectureQuickPick = async () => {
        const result = await window.showQuickPick(this.buildArchitectureMenu);
        if (result) {
            this.setBuildArchitecture(result as BuildArchitecture);
        }
        this.updateStatusBarItems();
    };

    private onTerminalStart = () => {
        // console.log("chalet started");
    };

    private onTerminalSuccess = () => {
        // console.log("chalet finished");
    };

    private onTerminalFailure = () => {
        console.log("chalet errored!");
    };

    private runChalet = async (command: ChaletCommands, buildConfig: Optional<string>) => {
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
                    name: "Chalet",
                    cwd: this.cwd,
                    env,
                    autoClear: false,
                    shellPath: ChaletVersion.Release,
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

    updateStatusBarItems = () => {
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

        this.updateStatusBarItem(this.statusBarDoAction, this.doActionIcon);
    };

    private updateStatusBarItem = (item: StatusBarItem, text: string) => {
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

    private getCommandFromLabel = (label: ChaletCommands) => {
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
            case ChaletCommands.Install:
                return "install";
            case ChaletCommands.Configure:
                return "configure";
            case ChaletCommands.Init:
                return "init";
        }
    };
}

export { ChaletToolsExtension };
