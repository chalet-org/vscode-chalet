import * as fsp from "fs/promises";
import * as fs from "fs";
import * as path from "path";
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
import { copyDirectory } from "./Functions/CopyDir";

class ChaletCliSettings {
    inputFile: string = "";
    settingsFile: string = "";
    envFile: string = "";
    rootDir: string = "";
    outputDir: string = "";
}

class ChaletToolsExtension {
    private menuChaletCommand: ChaletCmdCommandMenu;
    private menuBuildConfiguration: BuildConfigurationCommandMenu;
    private menuBuildArchitecture: BuildArchitectureCommandMenu;
    private menuBuildToolchain: BuildToolchainCommandMenu;
    private menuBuildStrategy: BuildStrategyCommandMenu;
    private menuBuildPathStyle: BuildPathStyleCommandMenu;
    private menuBuildTargets: BuildTargetsCommandMenu;
    private buttonRunChalet: RunChaletCommandButton;

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
    buildTargets: string[] = [];
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
        this.runChalet(this.menuChaletCommand.getLabel(), this.menuBuildConfiguration.getLabel(), this.cli);
    private onTestTerminal = () => this.runChalet(ChaletCommands.TestTerminal, null, this.cli);

    private onInitializeProject = () => this.runChalet(ChaletCommands.Init, null, this.cli);
    private onInitializeCMakeProject = () => this.runChalet(ChaletCommands.Init, "cmake", this.cli);

    private generateProjectFiles = async () => {
        await this.runChalet(ChaletCommands.Export, "vscode", this.cli);

        // note: cli.outputDir is blank for now anyway
        const buildDir = this.cli.outputDir.length > 0 ? this.cli.outputDir : "build";
        const buildPath = path.join(this.cwd, buildDir, ".project", ".vscode");
        const outputPath = path.join(this.cwd, ".vscode");

        if (fs.existsSync(buildPath) && !fs.existsSync(outputPath)) {
            await copyDirectory(buildPath, outputPath);
        }
    };

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
            vscode.commands.registerCommand(getCommandID(CommandId.GenerateProjectFiles), this.generateProjectFiles)
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(getCommandID(CommandId.TestTerminal), this.onTestTerminal)
        );

        // Note: Assignment order = reverse visible order
        this.buttonRunChalet = new RunChaletCommandButton(context, this.onRunChalet);
        this.menuBuildTargets = new BuildTargetsCommandMenu(context, this.updateStatusBarItems);
        this.menuBuildConfiguration = new BuildConfigurationCommandMenu(context, this.updateStatusBarItems);
        this.menuBuildStrategy = new BuildStrategyCommandMenu(context, this.updateStatusBarItems);
        this.menuBuildPathStyle = new BuildPathStyleCommandMenu(context, this.updateStatusBarItems);
        this.menuBuildArchitecture = new BuildArchitectureCommandMenu(context, this.updateStatusBarItems);
        this.menuBuildToolchain = new BuildToolchainCommandMenu(context, this.updateStatusBarItems);
        this.menuChaletCommand = new ChaletCmdCommandMenu(context, this.updateStatusBarItems);

        /*this.resources = {
            home: {
                dark: vscode.Uri.file(context.asAbsolutePath("resources/dark/chalet.svg")),
                light: vscode.Uri.file(context.asAbsolutePath("resources/light/chalet.svg")),
            },
        };*/
    }

    activate = () =>
        Promise.all([
            this.menuChaletCommand.initialize(),
            this.menuBuildTargets.initialize(),
            this.menuBuildConfiguration.initialize(),
            this.menuBuildToolchain.initialize(),
            this.menuBuildStrategy.initialize(),
            this.menuBuildPathStyle.initialize(),
            this.menuBuildArchitecture.initialize(),
        ]);

    private fetchAttempts: number = 0;
    private getChaletState = async (
        type: "state-chalet-json" | "state-settings-json" | "architectures",
        ...data: string[]
    ): Promise<void> => {
        try {
            if (this.fetchAttempts === 5) {
                return;
            }

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

            if (type === "architectures" && data.length > 0) {
                const toolchain = data[0];
                this.archCache[toolchain] = output.split("\t");
            } else {
                if (type === "state-chalet-json") {
                    const res = JSON.parse(output);
                    this.configurations = res?.["configurations"] ?? [];
                    this.buildTargets = res?.["buildTargets"] ?? [];
                    this.runTargets = res?.["runTargets"] ?? [];

                    if (this.currentRunTarget === "") {
                        this.currentRunTarget = res?.["defaultRunTarget"] ?? "";
                    }
                } else {
                    const res = JSON.parse(output);
                    this.toolchainPresets = res?.["toolchainPresets"] ?? [];
                    this.userToolchains = res?.["userToolchains"] ?? [];
                    this.buildStrategies = res?.["buildStrategies"] ?? [];
                    this.buildPathStyles = res?.["buildPathStyles"] ?? [];
                    this.currentArchitecture = res?.["architecture"] ?? BuildArchitecture.Auto;
                    this.currentConfiguration = res?.["configuration"] ?? "";
                    this.currentToolchain = res?.["toolchain"] ?? "";
                    this.currentRunTarget = res?.["lastRunTarget"] ?? "";
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

        this.menuChaletCommand.dispose();
        this.menuBuildTargets.dispose();
        this.menuBuildConfiguration.dispose();
        this.menuBuildToolchain.dispose();
        this.menuBuildArchitecture.dispose();
        this.menuBuildStrategy.dispose();
        this.menuBuildPathStyle.dispose();
        this.buttonRunChalet.dispose();
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
            if (this.enabled === enabled) {
                return;
            }

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
        this.menuChaletCommand.setVisible(value);
        this.menuBuildConfiguration.setVisible(value);
        this.menuBuildToolchain.setVisible(value);
        this.menuBuildArchitecture.setVisible(value);
        this.menuBuildTargets.setVisible(value);
        this.buttonRunChalet.setVisible(value);
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
        if (!this.canUpdate) {
            return;
        }
        let rawData: string = "";
        try {
            rawData = await fsp.readFile(this.cli.inputFile, "utf8");
        } catch {}

        const update: boolean = rawData !== this.chaletJsonCache;
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

        await Promise.all([
            this.menuBuildConfiguration.setDefaultMenu(),
            this.menuBuildTargets.setRunTarget(this.currentRunTarget),
        ]);

        this.uiChaletJsonInitialized = true;
        await this.checkForVisibility();
    };

    private settingsJsonCache: string = "<initial>";

    handleSettingsJsonChange = async (): Promise<void> => {
        if (!this.canUpdate) {
            return;
        }
        let rawData: string = "";
        try {
            rawData = await fsp.readFile(this.cli.settingsFile, "utf8");
        } catch {
            try {
                rawData = await fsp.readFile(this.globalSettingsFile, "utf8");
            } catch {}
        }

        const update: boolean = rawData !== this.settingsJsonCache;
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
                await this.menuBuildToolchain.parseJsonToolchains();
                this.settingsJsonCache = rawData;
            }
        } else {
            await Promise.all([
                this.menuBuildToolchain.setDefaultMenu(),
                this.menuBuildArchitecture.setDefaultMenu(),
                this.menuBuildStrategy.setDefaultMenu(),
                this.menuBuildPathStyle.setDefaultMenu(),
                this.menuBuildTargets.setDefaultMenu(),
            ]);

            this.settingsJsonCache = "";
        }

        await Promise.all([
            this.menuBuildToolchain.setValueFromString(this.currentToolchain),
            this.menuBuildArchitecture.setValueFromString(this.currentArchitecture),
            this.menuBuildConfiguration.setValueFromString(this.currentConfiguration),
            this.menuBuildStrategy.setValueFromString(this.currentBuildStrategy),
            this.menuBuildPathStyle.setValueFromString(this.currentBuildPathStyle),
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
            if (command === null) {
                return;
            }

            let shellArgs: string[] = [];

            if (command === ChaletCommands.Init) {
                if (!!param) {
                    shellArgs.push("--template");
                    shellArgs.push(param);
                }
            } else if (command === ChaletCommands.Export) {
                if (!!param) {
                    shellArgs.push(this.menuChaletCommand.getCliSubCommand(command));

                    const toolchain = this.menuBuildToolchain.getLabel();
                    if (!!toolchain) {
                        shellArgs.push("--toolchain");
                        shellArgs.push(toolchain);
                    }

                    const arch = this.menuBuildArchitecture.getLabel();
                    if (!!arch) {
                        shellArgs.push("--arch");
                        shellArgs.push(arch);
                    }

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

                if (this.menuBuildConfiguration.required(command)) {
                    if (!!param) {
                        shellArgs.push("--configuration");
                        shellArgs.push(param);
                    }
                }

                const menuBuildStrategy = this.menuBuildStrategy.getLabel();
                if (!!menuBuildStrategy && menuBuildStrategy !== UNSET) {
                    shellArgs.push("--build-strategy");
                    shellArgs.push(menuBuildStrategy);
                }

                const menuBuildPathStyle = this.menuBuildPathStyle.getLabel();
                if (!!menuBuildPathStyle && menuBuildPathStyle !== UNSET) {
                    shellArgs.push("--build-path-style");
                    shellArgs.push(menuBuildPathStyle);
                }

                const toolchain = this.menuBuildToolchain.getLabel();
                if (!!toolchain) {
                    shellArgs.push("--toolchain");
                    shellArgs.push(toolchain);
                }

                const arch = this.menuBuildArchitecture.getLabel();
                if (!!arch) {
                    shellArgs.push("--arch");
                    shellArgs.push(arch);
                }
            }

            if (command !== ChaletCommands.Export) {
                shellArgs.push(this.menuChaletCommand.getCliSubCommand(command));
            }

            const runTarget = this.menuBuildTargets.getLabel();
            if (!!runTarget) {
                if (command === ChaletCommands.BuildRun || command === ChaletCommands.Run) {
                    shellArgs.push(runTarget);
                }
            }

            const shellPath = this.settings.getChaletExecutable();
            const label = this.settings.getChaletTabLabel();
            const env = getTerminalEnv(this.platform);
            const icon = this.menuChaletCommand.getIcon();

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

            this.menuBuildStrategy.setVisible(false);
            this.menuBuildPathStyle.setVisible(false);

            const toolchain = this.menuBuildToolchain.getLabel();
            await Promise.all([this.menuBuildStrategy.setDefaultMenu(), this.menuBuildPathStyle.setDefaultMenu()]);
            if (toolchain) {
                this.architectures = await this.getChaletArchitectures(toolchain);
            }

            await this.menuBuildConfiguration.updateVisibility(this.menuChaletCommand.getLabel());
            // const isConfigure = this.menuChaletCommand.isConfigure();
            await this.menuBuildArchitecture.updateVisibility(toolchain);
            await this.menuBuildTargets.updateVisibility(this.menuChaletCommand);
            this.buttonRunChalet.updateLabelFromChaletCommand(this.menuChaletCommand);

            this.menuChaletCommand.setVisible(true);
            this.menuBuildToolchain.setVisible(true);
            this.buttonRunChalet.setVisible(true);
        } catch (err) {
            OutputChannel.logError(err);
        }
    };
}

export { ChaletToolsExtension };
