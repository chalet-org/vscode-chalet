import * as fsp from "fs/promises";
import * as fs from "fs";
import * as vscode from "vscode";

import { getTerminalEnv } from "./Functions";
import {
    ChaletCommands,
    CommandId,
    VSCodePlatform,
    Optional,
    Dictionary,
    BuildArchitecture,
    // IconDictionary,
} from "./Types";
import { SpawnError } from "./Terminal/TerminalProcess";
import { ChaletTerminal } from "./Terminal/ChaletTerminal";
import {
    BuildToolchainCommandMenu,
    BuildConfigurationCommandMenu,
    ChaletCmdCommandMenu,
    RunChaletCommandButton,
    BuildArchitectureCommandMenu,
    BuildTargetsCommandMenu,
} from "./Commands";
import { getCommandID } from "./Functions";
import { OutputChannel } from "./OutputChannel";
import { getProcessOutput } from "./Functions/GetProcessOutput";
import { ChaletToolsExtensionSettings } from "./ChaletToolsExtensionSettings";
import { BuildStrategyCommandMenu } from "./Commands/BuildStrategyCommandMenu";
import { BuildPathStyleCommandMenu } from "./Commands/BuildPathStyleCommandMenu";
import { UNSET } from "./Constants";

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
    private buildStrategy: BuildStrategyCommandMenu;
    private buildPathStyle: BuildPathStyleCommandMenu;
    private buildTargets: BuildTargetsCommandMenu;
    private runChaletButton: RunChaletCommandButton;

    private chaletTerminal: ChaletTerminal;

    settings: ChaletToolsExtensionSettings;
    // resources: IconDictionary;

    enabled: boolean = false;
    private canUpdate: boolean = true;
    private uiChaletJsonInitialized: boolean = false;
    private uiSettingsJsonInitialized: boolean = false;

    private cli: ChaletCliSettings;
    private globalSettingsFile: string = "";

    toolchainPresets: string[] = [];
    userToolchains: string[] = [];
    configurations: string[] = [];
    architectures: string[] = [];
    targets: string[] = [];
    runTargets: string[] = [];
    buildStrategies: string[] = [];
    buildPathStyles: string[] = [];
    private currentToolchain: string = "";
    private currentArchitecture: string = "";
    private currentConfiguration: string = "";
    private currentRunTarget: string = "";
    private currentBuildStrategy: Optional<string> = null;
    private currentBuildPathStyle: Optional<string> = null;

    private onRunChalet = () =>
        this.runChalet(this.chaletCommand.getLabel(), this.buildConfiguration.getLabel(), this.cli);
    private onTestTerminal = () => this.runChalet(ChaletCommands.TestTerminal, null, this.cli);

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
        this.settings = new ChaletToolsExtensionSettings();

        context.subscriptions.push(
            vscode.commands.registerCommand(getCommandID(CommandId.InitializeProject), this.onInitializeProject)
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                getCommandID(CommandId.InitializeCMakeProject),
                this.onInitializeCMakeProject
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(getCommandID(CommandId.TestTerminal), this.onTestTerminal)
        );

        // Note: Assignment order = reverse visible order
        this.runChaletButton = new RunChaletCommandButton(context, this.onRunChalet);
        this.buildTargets = new BuildTargetsCommandMenu(context, this.updateStatusBarItems);
        this.buildArchitecture = new BuildArchitectureCommandMenu(context, this.updateStatusBarItems);
        this.buildToolchain = new BuildToolchainCommandMenu(context, this.updateStatusBarItems);
        this.buildConfiguration = new BuildConfigurationCommandMenu(context, this.updateStatusBarItems);
        this.buildStrategy = new BuildStrategyCommandMenu(context, this.updateStatusBarItems);
        this.buildPathStyle = new BuildPathStyleCommandMenu(context, this.updateStatusBarItems);
        this.chaletCommand = new ChaletCmdCommandMenu(context, this.updateStatusBarItems);

        OutputChannel.log("Yes fuck");

        /*this.resources = {
            home: {
                dark: vscode.Uri.file(context.asAbsolutePath("resources/dark/chalet.svg")),
                light: vscode.Uri.file(context.asAbsolutePath("resources/light/chalet.svg")),
            },
        };*/
    }

    activate = () =>
        Promise.all([
            this.chaletCommand.initialize(),
            this.buildTargets.initialize(),
            this.buildConfiguration.initialize(),
            this.buildToolchain.initialize(),
            this.buildStrategy.initialize(),
            this.buildPathStyle.initialize(),
            this.buildArchitecture.initialize(),
        ]);

    private fetchAttempts: number = 0;
    private getChaletState = async (
        type: "state-chalet-json" | "state-settings-json" | "architectures",
        ...data: string[]
    ): Promise<void> => {
        try {
            if (this.fetchAttempts === 5) return;

            const chalet = this.settings.getChaletExecutable();
            const env = getTerminalEnv(this.platform);
            const output = await getProcessOutput(chalet, ["query", type, ...data], env, this.cwd);

            if (output.startsWith("Chalet") || (this.fetchAttempts === 5 && output.length === 0)) {
                throw new Error(`There was a problem querying Chalet for '${type}'`);
            }

            if (output.length === 0) {
                this.fetchAttempts++;
                return await this.getChaletState(type, ...data);
            }

            if (type == "architectures" && data.length > 0) {
                const toolchain = data[0];
                this.archCache[toolchain] = output.split("\t");
            } else {
                if (type == "state-chalet-json") {
                    const res = JSON.parse(output);
                    this.configurations = res?.["configurations"] ?? [];
                    this.targets = res?.["targets"] ?? [];
                    this.runTargets = res?.["runTargets"] ?? [];
                    this.currentRunTarget = res?.["defaultRunTarget"] ?? "";
                } else {
                    const res = JSON.parse(output);
                    this.toolchainPresets = res?.["toolchainPresets"] ?? [];
                    this.userToolchains = res?.["userToolchains"] ?? [];
                    this.buildStrategies = res?.["buildStrategies"] ?? [];
                    this.buildPathStyles = res?.["buildPathStyles"] ?? [];
                    this.currentArchitecture = res?.["architecture"] ?? BuildArchitecture.Auto;
                    this.currentConfiguration = res?.["configuration"] ?? "";
                    this.currentToolchain = res?.["toolchain"] ?? "";
                    // this.currentBuildStrategy = res?.["buildStrategy"] ?? null;
                    // this.currentBuildPathStyle = res?.["buildPathStyle"] ?? null;
                    this.currentBuildStrategy = null;
                    this.currentBuildPathStyle = null;
                }
            }
            this.fetchAttempts = 0;
        } catch (err) {
            console.error(err);
            err = new Error(
                `Chalet ran into a problem getting details about this workspace. Check Problems panel or Chalet installation.`
            );
            this.handleError(err);
            this.fetchAttempts = 0;
            throw err;
        }
    };

    private getChaletJsonState = () => this.getChaletState("state-chalet-json");
    private getSettingsJsonState = () => this.getChaletState("state-settings-json");

    archCache: Dictionary<string[]> = {};

    private getChaletArchitectures = async (toolchain: string) => {
        try {
            if (toolchain.length === 0) {
                throw new Error("no toolchain");
            }

            if (!this.archCache[toolchain]) {
                await this.getChaletState("architectures", toolchain);
            }

            return this.archCache[toolchain];
        } catch {
            return [BuildArchitecture.Auto];
        }
    };

    deactivate = () => {
        this.chaletTerminal.dispose();

        this.chaletCommand.dispose();
        this.buildTargets.dispose();
        this.buildConfiguration.dispose();
        this.buildToolchain.dispose();
        this.buildArchitecture.dispose();
        this.buildStrategy.dispose();
        this.buildPathStyle.dispose();
        this.runChaletButton.dispose();
    };

    private checkForVisibility = async () => {
        try {
            if (this.uiSettingsJsonInitialized && this.uiChaletJsonInitialized) {
                if (this.enabled && this.settings.canShowStatusBarButtons()) {
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
        this.buildTargets.setVisible(value);
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

    setGlobalSettingsFile = (inPath: string) => {
        this.globalSettingsFile = inPath;
    };

    setUpdateable = (inValue: boolean) => {
        this.canUpdate = inValue;
    };

    private chaletJsonCache: string = "<initial>";

    handleChaletJsonChange = async (): Promise<void> => {
        if (!this.canUpdate) return;
        let rawData: string = "";
        try {
            rawData = await fsp.readFile(this.cli.inputFile, "utf8");
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
        this.buildTargets.setRunTarget(this.currentRunTarget);

        this.uiChaletJsonInitialized = true;
        await this.checkForVisibility();
    };

    private settingsJsonCache: string = "<initial>";

    handleSettingsJsonChange = async (): Promise<void> => {
        if (!this.canUpdate) return;
        let rawData: string = "";
        try {
            rawData = await fsp.readFile(this.cli.settingsFile, "utf8");
        } catch {
            try {
                rawData = await fsp.readFile(this.globalSettingsFile, "utf8");
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
            await Promise.all([
                this.buildToolchain.setDefaultMenu(),
                this.buildArchitecture.setDefaultMenu(),
                this.buildStrategy.setDefaultMenu(),
                this.buildPathStyle.setDefaultMenu(),
                this.buildTargets.setDefaultMenu(),
            ]);

            this.settingsJsonCache = "";
        }

        await Promise.all([
            this.buildToolchain.setValueFromString(this.currentToolchain),
            this.buildArchitecture.setValueFromString(this.currentArchitecture),
            this.buildConfiguration.setValueFromString(this.currentConfiguration),
            this.buildStrategy.setValueFromString(this.currentBuildStrategy),
            this.buildPathStyle.setValueFromString(this.currentBuildPathStyle),
        ]);

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
            } else if (command === ChaletCommands.TestTerminal) {
                //
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

                const buildStrategy = this.buildStrategy.getLabel();
                if (!!buildStrategy && buildStrategy !== UNSET) {
                    shellArgs.push("--build-strategy");
                    shellArgs.push(buildStrategy);
                }

                const buildPathStyle = this.buildPathStyle.getLabel();
                if (!!buildPathStyle && buildPathStyle !== UNSET) {
                    shellArgs.push("--build-path-style");
                    shellArgs.push(buildPathStyle);
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

            const runTarget = this.buildTargets.getLabel();
            if (!!runTarget) {
                if (command === ChaletCommands.BuildRun || command === ChaletCommands.Run) {
                    shellArgs.push(runTarget);
                }
            }

            const shellPath = this.settings.getChaletExecutable();
            const label = this.settings.getChaletTabLabel();
            const env = getTerminalEnv(this.platform);
            const icon = this.chaletCommand.getIcon();

            // OutputChannel.logCommand(`env: ${JSON.stringify(env, undefined, 3)}`);
            OutputChannel.logCommand(`cwd: ${this.cwd}`);
            OutputChannel.logCommand(`${shellPath} ${shellArgs.join(" ")}`);

            await this.chaletTerminal.execute({
                label,
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
            if (!this.enabled) {
                this.setVisible(false);
                return;
            }

            this.buildStrategy.setVisible(false);
            this.buildPathStyle.setVisible(false);
            await Promise.all([this.buildStrategy.setDefaultMenu(), this.buildPathStyle.setDefaultMenu()]);
            const toolchain = this.buildToolchain.getLabel();
            if (toolchain) {
                this.architectures = await this.getChaletArchitectures(toolchain);
            }

            await this.buildConfiguration.updateVisibility(this.chaletCommand.getLabel());
            // const isConfigure = this.chaletCommand.isConfigure();
            await this.buildArchitecture.updateVisibility(toolchain);
            await this.buildTargets.updateVisibility(this.chaletCommand);
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
