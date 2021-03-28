"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaletToolsExtension = void 0;
const fs = require("fs");
const vscode_1 = require("vscode");
const CommentJSON = require("comment-json");
const Commands_1 = require("./Commands");
const Enums_1 = require("./Types/Enums");
const Functions_1 = require("./Functions");
class ChaletToolsExtension {
    constructor(context, platform) {
        this.platform = platform;
        this.chaletCommandMenu = [
            Enums_1.ChaletCommands.BuildRun,
            Enums_1.ChaletCommands.Run,
            Enums_1.ChaletCommands.Build,
            Enums_1.ChaletCommands.Rebuild,
            Enums_1.ChaletCommands.Clean,
            Enums_1.ChaletCommands.Bundle,
            Enums_1.ChaletCommands.Install,
            Enums_1.ChaletCommands.Configure,
        ];
        this.buildConfiguration = null;
        this.buildConfigurationMenu = [];
        this.buildArchitectureMenu = [Enums_1.BuildArchitecture.x64, Enums_1.BuildArchitecture.x86];
        this.doActionIcon = "$(play)";
        this.terminalController = null;
        this.useDebugChalet = false;
        this.enabled = false;
        this.cwd = "";
        this.buildJsonPath = "build.json";
        this.addStatusBarCommand = ({ subscriptions }, statusBarItem, id, onClick) => {
            const command = `chalet-tools.${id}`;
            subscriptions.push(vscode_1.commands.registerCommand(command, onClick));
            statusBarItem.command = command;
            statusBarItem.show();
            subscriptions.push(statusBarItem);
        };
        this.deactivate = () => {
            if (this.terminalController) {
                this.terminalController.haltSubProcess();
            }
            this.terminalController = null;
            this.statusBarChaletCommand.dispose();
            this.statusBarBuildConfiguration.dispose();
            this.statusBarBuildArchitecture.dispose();
            this.statusBarDoAction.dispose();
        };
        this.setEnabled = (enabled) => {
            if (this.enabled === enabled)
                return;
            this.enabled = enabled;
            if (this.enabled) {
                this.statusBarChaletCommand.show();
                this.statusBarBuildConfiguration.show();
                this.statusBarBuildArchitecture.show();
                this.statusBarDoAction.show();
            }
            else {
                this.statusBarChaletCommand.hide();
                this.statusBarBuildConfiguration.hide();
                this.statusBarBuildArchitecture.hide();
                this.statusBarDoAction.hide();
            }
        };
        this.setWorkingDirectory = (cwd) => {
            this.cwd = cwd;
        };
        this.setBuildJsonPath = (path) => {
            this.buildJsonPath = path;
        };
        this.getExtensionSettings = () => {
            const workbenchConfig = vscode_1.workspace.getConfiguration("chalet-tools");
            const useDebugChalet = workbenchConfig.get("useDebugChalet");
            if (useDebugChalet) {
                if (this.useDebugChalet === useDebugChalet)
                    return;
                this.useDebugChalet = useDebugChalet;
            }
        };
        this.setChaletCommand = async (value) => {
            this.chaletCommand = value;
            await this.workspaceState.update(Enums_1.CommandId.ChaletCommand, value);
        };
        this.setBuildConfiguration = async (value) => {
            this.buildConfiguration = value;
            await this.workspaceState.update(Enums_1.CommandId.BuildConfiguration, value);
        };
        this.setBuildArchitecture = async (value) => {
            this.buildArchitecture = value;
            await this.workspaceState.update(Enums_1.CommandId.BuildArchitecture, value);
        };
        this.setDefaultBuildConfigurations = () => {
            this.buildConfigurationMenu = [
                Enums_1.BuildConfigurations.Debug,
                Enums_1.BuildConfigurations.Release,
                Enums_1.BuildConfigurations.RelWithDebInfo,
                Enums_1.BuildConfigurations.MinSizeRel,
                Enums_1.BuildConfigurations.Profile,
            ];
            if (this.buildConfiguration === null || !this.buildConfigurationMenu.includes(this.buildConfiguration)) {
                this.setBuildConfiguration(Enums_1.BuildConfigurations.Debug);
            }
        };
        this.handleBuildJsonChange = () => {
            const rawData = fs.readFileSync(this.buildJsonPath, "utf8");
            const buildJson = CommentJSON.parse(rawData, undefined, true);
            let configurations = buildJson["configurations"];
            if (configurations) {
                if (Array.isArray(configurations)) {
                    this.buildConfigurationMenu = configurations.reduce((out, item) => {
                        if (typeof item === "string") {
                            if (item === Enums_1.BuildConfigurations.Debug ||
                                item === Enums_1.BuildConfigurations.Release ||
                                item === Enums_1.BuildConfigurations.RelWithDebInfo ||
                                item === Enums_1.BuildConfigurations.MinSizeRel ||
                                item === Enums_1.BuildConfigurations.Profile)
                                out.push(item);
                        }
                        else {
                            if (item.name)
                                out.push(item.name);
                        }
                        return out;
                    }, []);
                    if ((this.buildConfigurationMenu.length > 0 && this.buildConfiguration === null) ||
                        (this.buildConfiguration !== null && !this.buildConfigurationMenu.includes(this.buildConfiguration))) {
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
        this.actionChaletCommandQuickPick = async () => {
            const result = await vscode_1.window.showQuickPick(this.chaletCommandMenu);
            if (result) {
                this.setChaletCommand(result);
            }
            this.updateStatusBarItems();
        };
        this.actionBuildConfigurationQuickPick = async () => {
            if (this.buildConfiguration === null)
                return;
            const result = await vscode_1.window.showQuickPick(this.buildConfigurationMenu);
            if (result) {
                this.setBuildConfiguration(result);
            }
            this.updateStatusBarItems();
        };
        this.actionBuildArchitectureQuickPick = async () => {
            const result = await vscode_1.window.showQuickPick(this.buildArchitectureMenu);
            if (result) {
                this.setBuildArchitecture(result);
            }
            this.updateStatusBarItems();
        };
        this.onTerminalStart = () => {
            // console.log("chalet started");
        };
        this.onTerminalSuccess = () => {
            // console.log("chalet finished");
        };
        this.onTerminalFailure = () => {
            console.log("chalet errored!");
        };
        this.runChalet = async (command, buildConfig) => {
            try {
                let shellArgs = [];
                shellArgs.push(this.getCommandFromLabel(command));
                if (this.usesBuildConfiguration(command)) {
                    if (buildConfig) {
                        shellArgs.push(buildConfig);
                    }
                }
                if (this.terminalController) {
                    const env = Functions_1.getTerminalEnv(this.platform);
                    await this.terminalController.execute({
                        name: this.useDebugChalet ? "Chalet (Debug)" : "Chalet",
                        cwd: this.cwd,
                        env,
                        autoClear: false,
                        shellPath: this.useDebugChalet ? Enums_1.ChaletVersion.Debug : Enums_1.ChaletVersion.Release,
                        shellArgs,
                        onStart: this.onTerminalStart,
                        onSuccess: this.onTerminalSuccess,
                        onFailure: this.onTerminalFailure,
                    });
                }
            }
            catch (err) {
                console.error(err);
            }
        };
        this.actionRunChalet = () => this.runChalet(this.chaletCommand, this.buildConfiguration);
        this.actionMakeDebugBuild = () => this.runChalet(Enums_1.ChaletCommands.Build, Enums_1.BuildConfigurations.Debug);
        this.updateStatusBarItems = () => {
            var _a;
            this.updateStatusBarItem(this.statusBarChaletCommand, this.chaletCommand);
            if (this.usesBuildConfiguration(this.chaletCommand)) {
                this.updateStatusBarItem(this.statusBarBuildConfiguration, (_a = this.buildConfiguration) !== null && _a !== void 0 ? _a : (this.buildConfigurationMenu.length > 0
                    ? this.buildConfigurationMenu[0]
                    : Enums_1.BuildConfigurations.Invalid));
                this.updateStatusBarItem(this.statusBarBuildArchitecture, this.buildArchitecture);
            }
            else {
                this.statusBarBuildConfiguration.hide();
                this.statusBarBuildArchitecture.hide();
            }
            this.updateStatusBarItem(this.statusBarDoAction, this.doActionIcon);
        };
        this.updateStatusBarItem = (item, text) => {
            item.text = text;
            item.show();
        };
        this.usesBuildConfiguration = (command) => {
            return (command === Enums_1.ChaletCommands.Build ||
                command === Enums_1.ChaletCommands.Run ||
                command === Enums_1.ChaletCommands.BuildRun ||
                command === Enums_1.ChaletCommands.Rebuild ||
                command === Enums_1.ChaletCommands.Clean);
        };
        this.getCommandFromLabel = (label) => {
            switch (label) {
                case Enums_1.ChaletCommands.BuildRun:
                    return "buildrun";
                case Enums_1.ChaletCommands.Run:
                    return "run";
                case Enums_1.ChaletCommands.Build:
                    return "build";
                case Enums_1.ChaletCommands.Rebuild:
                    return "rebuild";
                case Enums_1.ChaletCommands.Clean:
                    return "clean";
                case Enums_1.ChaletCommands.Bundle:
                    return "bundle";
                case Enums_1.ChaletCommands.Install:
                    return "install";
                case Enums_1.ChaletCommands.Configure:
                    return "configure";
                case Enums_1.ChaletCommands.Init:
                    return "init";
            }
        };
        this.terminalController = new Commands_1.TerminalController();
        this.workspaceState = context.workspaceState;
        {
            const command = `chalet-tools.${Enums_1.CommandId.MakeDebugBuild}`;
            context.subscriptions.push(vscode_1.commands.registerCommand(command, this.actionMakeDebugBuild));
        }
        this.statusBarChaletCommand = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 4);
        this.addStatusBarCommand(context, this.statusBarChaletCommand, Enums_1.CommandId.ChaletCommand, this.actionChaletCommandQuickPick);
        this.statusBarBuildConfiguration = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 3);
        this.addStatusBarCommand(context, this.statusBarBuildConfiguration, Enums_1.CommandId.BuildConfiguration, this.actionBuildConfigurationQuickPick);
        this.statusBarBuildArchitecture = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 2);
        this.addStatusBarCommand(context, this.statusBarBuildArchitecture, Enums_1.CommandId.BuildArchitecture, this.actionBuildArchitectureQuickPick);
        this.statusBarDoAction = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 1);
        this.addStatusBarCommand(context, this.statusBarDoAction, Enums_1.CommandId.Run, this.actionRunChalet);
        this.chaletCommand = this.workspaceState.get(Enums_1.CommandId.ChaletCommand, Enums_1.ChaletCommands.BuildRun);
        this.buildArchitecture = this.workspaceState.get(Enums_1.CommandId.BuildArchitecture, Enums_1.BuildArchitecture.x64);
        this.buildConfiguration = this.workspaceState.get(Enums_1.CommandId.BuildConfiguration, null);
    }
}
exports.ChaletToolsExtension = ChaletToolsExtension;
//# sourceMappingURL=ChaletToolsExtension.js.map