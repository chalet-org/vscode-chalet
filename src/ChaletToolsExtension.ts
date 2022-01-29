import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { getTerminalEnv } from "./Functions";
import {
    // BuildArchitecture,
    BuildConfigurations,
    ChaletCommands,
    ChaletVersion,
    CommandId,
    VSCodePlatform,
    Optional,
    getHomeDirectory,
    Dictionary,
    BuildArchitecture,
} from "./Types";
import { SpawnError } from "./Terminal/TerminalProcess";
import { ChaletTerminal } from "./Terminal/ChaletTerminal";
import {
    BuildToolchainCommandMenu,
    BuildConfigurationCommandMenu,
    ChaletCmdCommandMenu,
    RunChaletCommandButton,
    BuildArchitectureCommandMenu,
} from "./Commands";
import { getCommandID } from "./Functions";
import { OutputChannel } from "./OutputChannel";
import { EXTENSION_ID } from "./ExtensionID";
import { getProcessOutput } from "./Functions/GetProcessOutput";
import { FILE_CHALET_SETTINGS_GLOBAL } from "./Constants";

class ChaletCliSettings {
    inputFile: string = "";
    settingsFile: string = "";
    envFile: string = "";
    rootDir: string = "";
    outputDir: string = "";
}

class ChaletToolsExtension {
    private chaletCommand: ChaletCmdCommandMenu;
    private buildConfiguration: BuildConfigurationCommandMenu;
    private buildArchitecture: BuildArchitectureCommandMenu;
    private buildToolchain: BuildToolchainCommandMenu;
    private runChaletButton: RunChaletCommandButton;

    private chaletTerminal: ChaletTerminal;

    private useDebugChalet: boolean = false;
    enabled: boolean = false;
    private canUpdate: boolean = true;
    private uiChaletJsonInitialized: boolean = false;
    private uiSettingsJsonInitialized: boolean = false;

    private cli: ChaletCliSettings;

    toolchainPresets: string[] = [];
    userToolchains: string[] = [];
    configurations: string[] = [];
    architectures: string[] = [];
    private currentToolchain: string = "";
    private currentArchitecture: string = "";
    private currentConfiguration: string = "";
    private currentRunTarget: string = "";

    private onRunChalet = () =>
        this.runChalet(this.chaletCommand.getLabel(), this.buildConfiguration.getLabel(), this.cli);
    private onMakeDebugBuild = () => this.runChalet(ChaletCommands.Build, BuildConfigurations.Debug, this.cli);

    private onInitializeProject = () => this.runChalet(ChaletCommands.Init, null, this.cli);
    private onInitializeCMakeProject = () => this.runChalet(ChaletCommands.Init, "cmake", this.cli);

    constructor(
        context: vscode.ExtensionContext,
        public platform: VSCodePlatform,
        private cwd: string,
        private handleError: (err: any) => void
    ) {
        this.chaletTerminal = new ChaletTerminal();
        this.cli = new ChaletCliSettings();

        context.subscriptions.push(
            vscode.commands.registerCommand(getCommandID(CommandId.MakeDebugBuild), this.onMakeDebugBuild)
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(getCommandID(CommandId.InitializeProject), this.onInitializeProject)
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                getCommandID(CommandId.InitializeCMakeProject),
                this.onInitializeCMakeProject
            )
        );

        this.chaletCommand = new ChaletCmdCommandMenu(this.updateStatusBarItems, context, 7.75);
        this.buildConfiguration = new BuildConfigurationCommandMenu(this.updateStatusBarItems, context, 7.74);
        this.buildToolchain = new BuildToolchainCommandMenu(this.updateStatusBarItems, context, 7.73);
        this.buildArchitecture = new BuildArchitectureCommandMenu(this.updateStatusBarItems, context, 7.72);
        this.runChaletButton = new RunChaletCommandButton(this.onRunChalet, context, 7.71);
    }

    activate = async () => {
        await this.chaletCommand.initialize();
        await this.buildConfiguration.initialize();
        await this.buildToolchain.initialize();
        await this.buildArchitecture.initialize();
    };

    private fetchAttempts: number = 0;
    private getChaletState = async (type: "state-chalet-json" | "state-settings-json"): Promise<void> => {
        try {
            if (this.fetchAttempts === 3) return;

            const chalet = this.useDebugChalet ? ChaletVersion.Debug : ChaletVersion.Release;
            const env = getTerminalEnv(this.platform);
            const output = await getProcessOutput(chalet, ["query", type], env, this.cwd);

            if (output.startsWith("Chalet") || (this.fetchAttempts === 5 && output.length === 0)) {
                throw new Error(`There was a problem querying Chalet for '${type}'`);
            }
            if (output.length === 0) {
                this.fetchAttempts++;
                return await this.getChaletState(type);
            }

            const res = JSON.parse(output);
            // console.log(res);

            if (type == "state-chalet-json") {
                this.configurations = res?.["configurations"] ?? [];
                this.currentRunTarget = res?.["runTarget"] ?? "";
            } else {
                this.toolchainPresets = res?.["toolchainPresets"] ?? [];
                this.userToolchains = res?.["userToolchains"] ?? [];
                this.currentArchitecture = res?.["architecture"] ?? BuildArchitecture.Auto;
                this.currentConfiguration = res?.["configuration"] ?? "";
                this.currentToolchain = res?.["toolchain"] ?? "";
            }
            this.fetchAttempts = 0;
        } catch (err) {
            console.error(err);
            err = new Error(
                `Chalet ran into a problem getting details about this workspace. Check Problems panel or Chalet installation.`
            );
            this.handleError(err);
            throw err;
        }
    };

    private getChaletJsonState = () => this.getChaletState("state-chalet-json");
    private getSettingsJsonState = () => this.getChaletState("state-settings-json");

    private getChaletList = async (
        type: string,
        failOnEmptyResult: boolean = true,
        ...data: string[]
    ): Promise<string[]> => {
        try {
            const chalet = this.useDebugChalet ? ChaletVersion.Debug : ChaletVersion.Release;
            const env = getTerminalEnv(this.platform);
            const output = await getProcessOutput(chalet, ["query", type, ...data], env, this.cwd);
            OutputChannel.log(`${type} result: ${output}`);

            if (output.startsWith("Chalet") || (failOnEmptyResult && output.length === 0)) {
                throw new Error(`There was a problem querying Chalet for '${type}'`);
            }

            const res = output.split(" ");
            // OutputChannel.log(type, res);
            return res;
        } catch (err) {
            console.error(err);
            err = new Error(
                `Chalet ran into a problem getting details about this workspace. Check Problems panel or Chalet installation.`
            );
            this.handleError(err);
            throw err;
        }
    };

    /*private getChaletValueFromList = async (type: string, ...data: string[]): Promise<string> => {
        const list = await this.getChaletList(type, false, ...data);
        return list.length > 0 ? list[0] : "";
    };*/

    // private getChaletCommands = () => this.getChaletList("commands");
    // private getChaletConfigurations = () => this.getChaletList("configurations");
    // private getChaletToolchainPresets = () => this.getChaletList("toolchain-presets");
    // private getChaletUserToolchains = () => this.getChaletList("user-toolchains", false);
    // private getChaletAllToolchains = () => this.getChaletList("all-toolchains");

    // private getChaletCurrentArchitecture = () => this.getChaletValueFromList("architecture");
    // private getChaletCurrentToolchain = () => this.getChaletValueFromList("toolchain");
    // private getChaletCurrentBuildConfiguration = () => this.getChaletValueFromList("configuration");
    // private getChaletCurrentRunTarget = () => this.getChaletValueFromList("run-target");

    archCache: Dictionary<string[]> = {};

    private getChaletArchitectures = async (toolchain: string) => {
        try {
            if (toolchain.length === 0) {
                throw new Error("no toolchain");
            }

            if (!this.archCache[toolchain]) {
                this.archCache[toolchain] = await this.getChaletList("architectures", true, toolchain);
            }

            return this.archCache[toolchain];
        } catch (err) {
            return [BuildArchitecture.Auto];
        }
    };

    deactivate = () => {
        this.chaletTerminal.dispose();

        this.chaletCommand.dispose();
        this.buildConfiguration.dispose();
        this.buildToolchain.dispose();
        this.buildArchitecture.dispose();
        this.runChaletButton.dispose();
    };

    private checkForVisibility = async () => {
        try {
            if (this.uiSettingsJsonInitialized && this.uiChaletJsonInitialized) {
                if (this.enabled) {
                    // this.setVisible(true);
                    await this.updateStatusBarItems(); // do last
                } else {
                    this.setVisible(false);
                }
            }
        } catch (err) {
            throw err;
        }
    };

    setEnabled = async (enabled: boolean): Promise<void> => {
        try {
            if (this.enabled === enabled) return;

            this.enabled = enabled;
            if (this.enabled) {
                await this.handleChaletJsonChange();
                await this.handleSettingsJsonChange();
            }
            await this.checkForVisibility();
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    setVisible = (value: boolean): void => {
        this.chaletCommand.setVisible(value);
        this.buildConfiguration.setVisible(value);
        this.buildToolchain.setVisible(value);
        this.buildArchitecture.setVisible(value);
        this.runChaletButton.setVisible(value);
    };

    setWorkingDirectory = (cwd: string) => {
        this.cwd = cwd;
    };

    setInputFile = (inPath: string) => {
        this.cli.inputFile = inPath;
    };

    setSettingsFile = (inPath: string) => {
        this.cli.settingsFile = inPath;
    };

    setUpdateable = (inValue: boolean) => {
        this.canUpdate = inValue;
    };

    refreshExtensionSettings = () => {
        const workbenchConfig = vscode.workspace.getConfiguration(EXTENSION_ID);
        const useDebugChalet = workbenchConfig.get<boolean>("useDebugChalet");

        if (useDebugChalet) {
            this.useDebugChalet = useDebugChalet;
        }
    };

    private chaletJsonCache: string = "<initial>";

    handleChaletJsonChange = async (): Promise<void> => {
        if (!this.canUpdate) return;
        let rawData: string = "";
        try {
            rawData = fs.readFileSync(this.cli.inputFile, "utf8");
        } catch {}

        const update: boolean = rawData != this.chaletJsonCache;
        if (update) {
            // this.configurations = await this.getChaletConfigurations();
            // this.currentRunTarget = await this.getChaletCurrentRunTarget();
            await this.getChaletJsonState();
        }

        if (rawData.length > 0) {
            if (update) {
                this.chaletJsonCache = rawData;
            }
        } else {
            this.chaletJsonCache = "";
        }

        await this.buildConfiguration.setDefaultMenu();
        this.runChaletButton.setRunTarget(this.currentRunTarget);

        this.uiChaletJsonInitialized = true;
        await this.checkForVisibility();
    };

    private settingsJsonCache: string = "<initial>";

    handleSettingsJsonChange = async (): Promise<void> => {
        if (!this.canUpdate) return;
        let rawData: string = "";
        try {
            rawData = fs.readFileSync(this.cli.settingsFile, "utf8");
        } catch {
            try {
                const globalSettings: string = path.join(getHomeDirectory(), FILE_CHALET_SETTINGS_GLOBAL);
                rawData = fs.readFileSync(globalSettings, "utf8");
            } catch {}
        }

        const update: boolean = rawData != this.settingsJsonCache;
        if (update) {
            // this.toolchainPresets = await this.getChaletToolchainPresets();
            // this.userToolchains = await this.getChaletUserToolchains();
            // this.currentArchitecture = await this.getChaletCurrentArchitecture();
            // this.currentConfiguration = await this.getChaletCurrentBuildConfiguration();
            // this.currentToolchain = await this.getChaletCurrentToolchain();

            await this.getSettingsJsonState();
        }

        if (rawData.length > 0) {
            if (update) {
                await this.buildToolchain.parseJsonToolchains();
                this.settingsJsonCache = rawData;
            }
        } else {
            await this.buildToolchain.setDefaultMenu();
            await this.buildArchitecture.setDefaultMenu();

            this.settingsJsonCache = "";
        }

        await this.buildArchitecture.setValueFromString(this.currentArchitecture);
        await this.buildConfiguration.setValueFromString(this.currentConfiguration);
        await this.buildToolchain.setValueFromString(this.currentToolchain);

        this.uiSettingsJsonInitialized = true;
        await this.checkForVisibility();
    };

    private onTerminalStart = (): void => {
        OutputChannel.logCommand("process started");
    };

    private onTerminalSuccess = (code?: Optional<number>, signal?: Optional<NodeJS.Signals>): void => {
        OutputChannel.logCommand(`process exited with code: ${code}`);
        OutputChannel.log(new String().padStart(80, "-"));
    };

    private onTerminalFailure = (err?: SpawnError): void => {
        OutputChannel.logError(err);
    };

    private stripCwd = (inPath: string): string => {
        const pathSeparator = this.platform === VSCodePlatform.Windows ? "\\" : "/";
        return inPath.replaceAll(`${this.cwd}${pathSeparator}`, "");
    };

    private runChalet = async (
        command: Optional<ChaletCommands>,
        param: Optional<string>,
        settings: ChaletCliSettings
    ): Promise<void> => {
        try {
            if (command === null) return;

            let shellArgs: string[] = [];

            if (command === ChaletCommands.Init) {
                if (!!param) {
                    shellArgs.push("--template");
                    shellArgs.push(param);
                }
            } else {
                if (settings.inputFile.length > 0 && fs.existsSync(settings.inputFile)) {
                    shellArgs.push("--input-file");
                    shellArgs.push(this.stripCwd(settings.inputFile));
                }

                if (settings.settingsFile.length > 0 && fs.existsSync(settings.settingsFile)) {
                    shellArgs.push("--settings-file");
                    shellArgs.push(this.stripCwd(settings.settingsFile));
                }

                if (settings.envFile.length > 0 && fs.existsSync(settings.envFile)) {
                    shellArgs.push("--env-file");
                    shellArgs.push(this.stripCwd(settings.envFile));
                }

                if (settings.rootDir.length > 0) {
                    shellArgs.push("--root-dir");
                    shellArgs.push(this.stripCwd(settings.rootDir));
                }

                if (settings.outputDir.length > 0) {
                    shellArgs.push("--output-dir");
                    shellArgs.push(this.stripCwd(settings.outputDir));
                }

                if (this.buildConfiguration.required(command)) {
                    if (!!param) {
                        shellArgs.push("--configuration");
                        shellArgs.push(param);
                    }
                }

                const toolchain = this.buildToolchain.getLabel();
                if (!!toolchain) {
                    shellArgs.push("--toolchain");
                    shellArgs.push(toolchain);
                }

                const arch = this.buildArchitecture.getLabel();
                if (!!arch) {
                    shellArgs.push("--arch");
                    shellArgs.push(arch);
                }
            }

            shellArgs.push(this.chaletCommand.getCliSubCommand(command));

            const shellPath = this.useDebugChalet ? ChaletVersion.Debug : ChaletVersion.Release;
            const name = `Chalet${this.useDebugChalet ? " (Debug)" : ""}`;
            const env = getTerminalEnv(this.platform);
            const icon = this.chaletCommand.getIcon();

            // OutputChannel.logCommand(`env: ${JSON.stringify(env, undefined, 3)}`);
            OutputChannel.logCommand(`cwd: ${this.cwd}`);
            OutputChannel.logCommand(`${shellPath} ${shellArgs.join(" ")}`);

            await this.chaletTerminal.execute({
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

    private updateStatusBarItems = async (): Promise<void> => {
        try {
            const toolchain = this.buildToolchain.getLabel();
            if (toolchain) {
                this.architectures = await this.getChaletArchitectures(toolchain);
            }

            await this.buildConfiguration.requiredForVisibility(this.chaletCommand.getLabel());
            // const isConfigure = this.chaletCommand.isConfigure();
            await this.buildArchitecture.setToolchainAndVisibility(toolchain);
            this.runChaletButton.updateLabelFromChaletCommand(this.chaletCommand);

            this.chaletCommand.setVisible(true);
            this.buildToolchain.setVisible(true);
            this.runChaletButton.setVisible(true);
        } catch (err) {
            OutputChannel.logError(err);
        }
    };
}

export { ChaletToolsExtension };
