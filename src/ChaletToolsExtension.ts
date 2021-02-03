import * as vscode from "vscode";
import * as fs from "fs";
import { window, commands, StatusBarAlignment, ExtensionContext, StatusBarItem, workspace, Uri, Memento } from "vscode";
import * as CommentJSON from "comment-json";
import { TerminalController } from "./Commands";

// import { helloWorld } from "./Commands";

enum ChaletCommands {
    BuildRun = "Build & Run",
    Run = "Run",
    Build = "Build",
    Rebuild = "Rebuild",
    Clean = "Clean",
    Bundle = "Bundle",
    Install = "Install",
    Configure = "Configure",
    Init = "Init",
}

enum BuildConfigurations {
    Invalid = "[No valid configurations]",
    Debug = "Debug",
    Release = "Release",
    RelWithDebInfo = "RelWithDebInfo",
    MinSizeRel = "MinSizeRel",
}

enum BuildArchitecture {
    x64 = "x64",
    x86 = "x86",
    ARM = "ARM",
    ARM64 = "ARM64",
}

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
        ChaletCommands.Init,
    ];

    buildConfiguration: string | null = null;
    statusBarBuildConfiguration: StatusBarItem;
    buildConfigurationMenu: (BuildConfigurations | string)[] = [];

    buildArchitecture: BuildArchitecture;
    statusBarBuildArchitecture: StatusBarItem;
    buildArchitectureMenu: BuildArchitecture[] = [BuildArchitecture.x64, BuildArchitecture.x86];

    doActionIcon: string = "$(play)";
    statusBarDoAction: StatusBarItem;

    terminalController: TerminalController | null = null;
    // runScriptPath: string;

    workspaceRoot?: Uri;
    workspaceState: Memento;

    private addStatusBarCommand = (
        { subscriptions }: ExtensionContext,
        statusBarItem: StatusBarItem,
        id: string,
        onClick: () => Promise<void>
    ) => {
        id = `chalet-tools.${id}`;
        subscriptions.push(commands.registerCommand(id, onClick));

        statusBarItem.command = id;
        subscriptions.push(statusBarItem);
    };

    constructor(context: ExtensionContext) {
        this.terminalController = new TerminalController();
        this.workspaceState = context.workspaceState;

        this.statusBarChaletCommand = window.createStatusBarItem(StatusBarAlignment.Left, 4);
        this.addStatusBarCommand(
            context,
            this.statusBarChaletCommand,
            "chaletCommand",
            this.actionChaletCommandQuickPick
        );

        this.statusBarBuildConfiguration = window.createStatusBarItem(StatusBarAlignment.Left, 3);
        this.addStatusBarCommand(
            context,
            this.statusBarBuildConfiguration,
            "buildConfiguration",
            this.actionBuildConfigurationQuickPick
        );

        this.statusBarBuildArchitecture = window.createStatusBarItem(StatusBarAlignment.Left, 2);
        this.addStatusBarCommand(
            context,
            this.statusBarBuildArchitecture,
            "buildArchitecture",
            this.actionBuildArchitectureQuickPick
        );

        this.statusBarDoAction = window.createStatusBarItem(StatusBarAlignment.Left, 1);
        this.addStatusBarCommand(context, this.statusBarDoAction, "runChalet", this.actionRunChalet);

        // context.subscriptions.push(window.onDidChangeActiveTextEditor(this.updateStatusBarItems));
        // context.subscriptions.push(window.onDidChangeTextEditorSelection(this.updateStatusBarItems));

        this.chaletCommand = this.workspaceState.get("chaletCommand", ChaletCommands.BuildRun);
        this.buildArchitecture = this.workspaceState.get("buildArchitecture", BuildArchitecture.x64);

        this.buildConfiguration = this.workspaceState.get("buildConfiguration", null);

        if (vscode.window.activeTextEditor) {
            let workspaceFolder = workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
            if (workspaceFolder) {
                this.workspaceRoot = workspaceFolder.uri;
                const buildJsonUri = Uri.joinPath(this.workspaceRoot, "build.json");
                this.handleBuildJsonChange();

                fs.watchFile(buildJsonUri.fsPath, { interval: 2000 }, (_curr, _prev) => {
                    this.handleBuildJsonChange();
                    this.updateStatusBarItems();
                });
            }
        }
        // console.log(this.workspaceRoot);

        // let script = Uri.joinPath(context.extensionUri, "scripts", "run-chalet.sh");
        // this.runScriptPath = script.fsPath;

        // update status bar item once at start
        this.updateStatusBarItems();
    }

    deactivate = () => {
        this.terminalController = null;
    };

    private setChaletCommand = async (value: ChaletCommands) => {
        this.chaletCommand = value;
        await this.workspaceState.update("chaletCommand", value);
    };

    private setBuildConfiguration = async (value: string | null) => {
        this.buildConfiguration = value;
        await this.workspaceState.update("buildConfiguration", value);
    };

    private setBuildArchitecture = async (value: BuildArchitecture) => {
        this.buildArchitecture = value;
        await this.workspaceState.update("buildArchitecture", value);
    };

    private setDefaultBuildConfigurations = () => {
        this.buildConfigurationMenu = [
            BuildConfigurations.Debug,
            BuildConfigurations.Release,
            BuildConfigurations.RelWithDebInfo,
            BuildConfigurations.MinSizeRel,
        ];

        if (this.buildConfiguration === null || !this.buildConfigurationMenu.includes(this.buildConfiguration)) {
            this.setBuildConfiguration(BuildConfigurations.Debug);
        }
    };

    private handleBuildJsonChange = () => {
        if (this.workspaceRoot) {
            const buildJsonUri = Uri.joinPath(this.workspaceRoot, "build.json");
            const rawData = fs.readFileSync(buildJsonUri.fsPath, "utf8");
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
                                item === BuildConfigurations.MinSizeRel
                            )
                                out.push(item);
                        } else {
                            if (item.name) out.push(item.name);
                        }
                        return out;
                    }, [] as string[]);

                    if (
                        (this.buildConfigurationMenu.length > 0 && this.buildConfiguration === null) ||
                        (this.buildConfiguration !== null &&
                            !this.buildConfigurationMenu.includes(this.buildConfiguration))
                    ) {
                        this.setBuildConfiguration(this.buildConfigurationMenu[0]);
                    }

                    if (this.buildConfiguration !== null && this.buildConfigurationMenu.length === 0) {
                        this.setBuildConfiguration(null);
                    }

                    return;
                }
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

    private actionRunChalet = async () => {
        // window.showInformationMessage("Do the thing!");

        let shellArgs: string[] = [];

        shellArgs.push(this.getCommandFromLabel(this.chaletCommand));

        if (this.usesBuildConfiguration()) {
            if (this.buildConfiguration) {
                shellArgs.push(this.buildConfiguration);
            }
        }

        if (this.terminalController) {
            await this.terminalController.execute({
                name: "Chalet",
                cwd: this.workspaceRoot?.fsPath,
                autoClear: true,
                shellPath: "chalet",
                shellArgs,
            });
        }
    };

    private updateStatusBarItems = () => {
        this.updateStatusBarItem(this.statusBarChaletCommand, this.chaletCommand);

        if (this.usesBuildConfiguration()) {
            this.updateStatusBarItem(
                this.statusBarBuildConfiguration,
                this.buildConfiguration ?? BuildConfigurations.Invalid
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

    private usesBuildConfiguration = (): boolean => {
        return (
            this.chaletCommand === ChaletCommands.Build ||
            this.chaletCommand === ChaletCommands.Run ||
            this.chaletCommand === ChaletCommands.BuildRun ||
            this.chaletCommand === ChaletCommands.Rebuild ||
            this.chaletCommand === ChaletCommands.Clean
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
