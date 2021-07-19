import * as fs from "fs";
import * as vscode from "vscode";
import * as CommentJSON from "comment-json";

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
    private enabled: boolean = false;
    private cwd: string = "";

    private cli: ChaletCliSettings;

    private onRunChalet = () =>
        this.runChalet(this.chaletCommand.getValue(), this.buildConfiguration.getValue(), this.cli);
    private onMakeDebugBuild = () => this.runChalet(ChaletCommands.Build, BuildConfigurations.Debug, this.cli);

    constructor(context: vscode.ExtensionContext, public platform: VSCodePlatform) {
        this.chaletTerminal = new ChaletTerminal();
        this.cli = new ChaletCliSettings();

        context.subscriptions.push(
            vscode.commands.registerCommand(getCommandID(CommandId.MakeDebugBuild), this.onMakeDebugBuild)
        );

        this.chaletCommand = new ChaletCmdCommandMenu(this.updateStatusBarItems, context, 5);
        this.buildConfiguration = new BuildConfigurationCommandMenu(this.updateStatusBarItems, context, 4);
        this.buildToolchain = new BuildToolchainCommandMenu(this.updateStatusBarItems, context, 3, this.platform);
        this.buildArchitecture = new BuildArchitectureCommandMenu(this.updateStatusBarItems, context, 2, this.platform);
        this.runChaletButton = new RunChaletCommandButton(this.onRunChalet, context, 1);
    }

    activate = async () => {
        try {
            await this.chaletCommand.initialize();
            await this.buildConfiguration.initialize();
            await this.buildToolchain.initialize();
            await this.buildArchitecture.initialize();
            await this.updateStatusBarItems();
        } catch (err) {
            OutputChannel.logError(err);
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

    setEnabled = async (enabled: boolean): Promise<void> => {
        try {
            if (this.enabled === enabled) return;

            this.enabled = enabled;
            this.chaletCommand.setVisible(this.enabled);
            this.buildConfiguration.setVisible(this.enabled);
            this.buildToolchain.setVisible(this.enabled);
            this.buildArchitecture.setVisible(this.enabled);
            this.runChaletButton.setVisible(this.enabled);

            await this.updateStatusBarItems();
        } catch (err) {
            OutputChannel.logError(err);
        }
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

    refreshExtensionSettings = () => {
        const workbenchConfig = vscode.workspace.getConfiguration(EXTENSION_ID);
        const useDebugChalet = workbenchConfig.get<boolean>("useDebugChalet");

        if (useDebugChalet) {
            if (this.useDebugChalet === useDebugChalet) return;

            this.useDebugChalet = useDebugChalet;
        }
    };

    handleChaletJsonChange = async (): Promise<void> => {
        try {
            const rawData = fs.readFileSync(this.cli.inputFile, "utf8");
            const chaletJson = CommentJSON.parse(rawData, undefined, true);

            await this.buildConfiguration.parseJsonConfigurations(chaletJson);
            this.runChaletButton.parseJsonRunProjects(chaletJson);

            await this.updateStatusBarItems();
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    handleSettingsJsonChange = async (): Promise<void> => {
        try {
            const rawData = fs.readFileSync(this.cli.settingsFile, "utf8");
            const settingsJson = CommentJSON.parse(rawData, undefined, true);
            console.log(settingsJson);

            await this.buildToolchain.parseJsonToolchains(settingsJson);
            await this.buildToolchain.parseJsonSettingsToolchain(settingsJson);
            await this.buildArchitecture.parseJsonSettingsArchitecture(settingsJson);

            await this.updateStatusBarItems();
        } catch (err) {
            OutputChannel.logError(err);
        }
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
        buildConfig: Optional<string>,
        settings: ChaletCliSettings
    ): Promise<void> => {
        try {
            if (command === null) return;

            let shellArgs: string[] = [];

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

            const toolchain = this.buildToolchain.getValue();
            if (!!toolchain) {
                shellArgs.push("--toolchain");
                shellArgs.push(toolchain);
            }

            const arch = this.buildArchitecture.getValue();
            if (!!arch) {
                shellArgs.push("--arch");
                shellArgs.push(arch);
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
            if (!this.enabled) return;

            await this.buildConfiguration.requiredForVisibility(this.chaletCommand.getValue());
            // const isConfigure = this.chaletCommand.isConfigure();
            this.buildToolchain.setVisible(true);
            await this.buildArchitecture.setToolchainAndVisibility(this.buildToolchain.getValue(), true);
            this.runChaletButton.updateLabelFromChaletCommand(this.chaletCommand);
        } catch (err) {
            OutputChannel.logError(err);
        }
    };
}

export { ChaletToolsExtension };
