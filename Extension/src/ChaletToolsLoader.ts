import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { ChaletToolsExtension } from "./ChaletToolsExtension";
import { ChaletSchemaProvider, SCHEMA_PROVIDER_ID } from "./ChaletSchemaProvider";
import { OutputChannel } from "./OutputChannel";
import { ChaletVersion, getHomeDirectory, getVSCodePlatform, Optional, SemanticVersion, VSCodePlatform } from "./Types";
import { ChaletFile } from "./Constants";
import { getProcessOutput } from "./Functions/GetProcessOutput";
import { getTerminalEnv } from "./Functions";
import { Utils } from "vscode-uri";
import fetch from "node-fetch";

let chaletToolsInstance: Optional<ChaletToolsExtension> = null;

const getChaletToolsInstance = (): ChaletToolsExtension => {
    if (!chaletToolsInstance) {
        throw new Error("Chalet Tools instance was unset");
    }
    return chaletToolsInstance!;
};

class ChaletToolsLoader {
    private schemaProvider: Optional<ChaletSchemaProvider> = null;
    private platform: VSCodePlatform;

    inputFile: Optional<string> = null;
    settingsFile: Optional<string> = null;
    globalSettingsFile: Optional<string> = null;
    cwd: Optional<string> = null;
    workspaceWatcher: Optional<fs.FSWatcher> = null;

    workspaceCount: number = 0;

    // private diagCache: Dictionary<string[]> = {};

    /*private updateDiagnostics = (uri: vscode.Uri): void => {
        const base = path.basename(uri.fsPath);
        if (Object.values(ChaletFile).includes(base)) {
            let diags = vscode.languages.getDiagnostics(uri).map((d) => {
                if (!this.diagCache[base]) this.diagCache[base] = [];

                if (this.diagCache[base].length === 0) {
                    this.diagCache[base].push(d.message);
                    chaletToolsInstance?.setUpdateable(false);
                }
            });
            if (diags.length === 0 && !!this.diagCache[base]) {
                delete this.diagCache[base];
                if (Object.keys(this.diagCache).length === 0) {
                    chaletToolsInstance?.setUpdateable(true);
                }
            }
        }
    };*/

    constructor(private context: vscode.ExtensionContext) {
        this.platform = getVSCodePlatform();

        this.schemaProvider = new ChaletSchemaProvider(context.extensionPath);

        context.subscriptions.push(
            vscode.workspace.registerTextDocumentContentProvider(SCHEMA_PROVIDER_ID, this.schemaProvider)
        );

        // if (vscode.window.activeTextEditor) {
        //     const { uri } = vscode.window.activeTextEditor.document;
        //     // this.updateDiagnostics(uri);
        // }

        /*context.subscriptions.push(
            vscode.languages.onDidChangeDiagnostics((ev) => ev.uris.map(debounce(this.updateDiagnostics, 500)))
        );*/
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(async (ev) => {
                if (this.workspaceCount <= 1) {
                    return;
                }

                if (ev) {
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(ev.document.uri);
                    await this.activate(workspaceFolder);
                }
            })
        );

        context.subscriptions.push(
            vscode.workspace.onDidChangeWorkspaceFolders((ev) => this.activateFromWorkspaceFolders())
        );

        this.activateFromWorkspaceFolders().then(() => this.registerUriForYaml(SCHEMA_PROVIDER_ID));
    }

    private registerUriForYaml = async (SCHEMA_PROVIDER_ID: string) => {
        // https://github.com/redhat-developer/vscode-yaml/issues/986
        try {
            const rhYaml = vscode.extensions.getExtension("redhat.vscode-yaml");
            if (rhYaml) {
                if (!rhYaml.isActive) {
                    await rhYaml.activate();
                }

                const rhYamlApi = rhYaml.exports;
                if (rhYamlApi && typeof rhYamlApi.registerContributor === "function") {
                    rhYaml.exports.registerContributor(
                        SCHEMA_PROVIDER_ID,
                        () => undefined,
                        async (rawUri: string) => {
                            try {
                                const uri = vscode.Uri.parse(rawUri);
                                if (this.schemaProvider && !this.schemaProvider.isSchemaTypeValid(rawUri)) {
                                    OutputChannel.log(
                                        "yaml: using https://www.chalet-work.space/api/schema/latest/chalet-json"
                                    );
                                    const response = await fetch(
                                        "https://www.chalet-work.space/api/schema/latest/chalet-json"
                                    );
                                    const json = await response.json();
                                    return JSON.stringify(json);
                                } else {
                                    const doc = await vscode.workspace.openTextDocument(uri);
                                    const text = doc.getText();
                                    return text;
                                }
                            } catch (err: any) {
                                OutputChannel.logError("Error registering yaml contributer");
                                OutputChannel.logError(err);
                                return "";
                            }
                        }
                    );
                }
            }
        } catch (err: any) {
            OutputChannel.logError(err);
        }
    };

    private getVersionFromChalet = async (): Promise<SemanticVersion> => {
        const chalet = ChaletVersion.Release;
        const env = getTerminalEnv(this.platform);
        const str = await getProcessOutput(chalet, ["--version"], env);
        const versionStr = str.split(" ")?.[2] ?? "0.0.0";
        const arr = versionStr.split(".");

        return {
            major: parseInt(arr[0]),
            minor: parseInt(arr[1]),
            patch: parseInt(arr[2]),
        };
    };

    private getMinimumVersion = (): SemanticVersion => {
        return {
            major: 0,
            minor: 5,
            patch: 0,
        };
    };

    private isVersionValid = async (): Promise<[boolean, SemanticVersion]> => {
        const version = await this.getVersionFromChalet();
        if (version.major === 0 && version.minor === 0 && version.patch === 0) {
            throw new Error("Error fetching chalet version");
        }

        const min = this.getMinimumVersion();
        if (
            version.major < min.major ||
            (version.major === min.major && version.minor < min.minor) ||
            (version.major === min.major && version.minor === min.minor && version.patch < min.patch)
        ) {
            return [false, version];
        }

        return [true, version];
    };

    private checkedVersion: boolean = false;
    private versionValid: boolean = false;
    private checkForCompatibleVersion = async (): Promise<void> => {
        try {
            if (!this.checkedVersion) {
                const [valid, ver] = await this.isVersionValid();
                this.versionValid = valid;
                if (!this.versionValid) {
                    const min = this.getMinimumVersion();
                    this.handleInformation(
                        `This version of the Chalet extension requires Chalet version ${min.major}.${min.minor}.${min.patch} or higher, but version ${ver.major}.${ver.minor}.${ver.patch} was found.`,
                        ["Download", "Cancel"],
                        {
                            Download: () =>
                                vscode.env.openExternal(vscode.Uri.parse("https://www.chalet-work.space/download")),
                            Cancel: () => {},
                        }
                    );
                }
                this.checkedVersion = true;
            }
        } catch (err: any) {
            OutputChannel.logError(err);
        }
    };
    private activateFromWorkspaceFolders = async () => {
        await this.checkForCompatibleVersion();

        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            this.workspaceCount = folders.length;

            for (const folder of folders) {
                await this.activate(folder);
                if (chaletToolsInstance?.enabled ?? false) {
                    return;
                }
            }
        }
    };

    private watchChaletFile = (
        file: string,
        setFile: (f: string) => void,
        listener: (curr: fs.Stats, prev: fs.Stats) => void
    ): string => {
        const interval: number = 1000;
        setFile(file);
        fs.watchFile(file, { interval }, listener);

        return file;
    };

    private inputFiles: string[] = [];
    private watchers: string[] = [];

    private watchChaletFile2 = (file: string, listener: (curr: fs.Stats, prev: fs.Stats) => void): void => {
        if (!this.watchers.includes(file)) {
            const interval: number = 1000;
            fs.watchFile(file, { interval }, listener);
            this.watchers.push(file);
        }
    };

    private activate = async (workspaceFolder?: vscode.WorkspaceFolder): Promise<void> => {
        try {
            if (!workspaceFolder) {
                return;
            }

            const workspaceRoot = workspaceFolder.uri;

            let setWatcher: boolean = false;
            if (this.cwd !== workspaceRoot.fsPath) {
                this.cwd = workspaceRoot.fsPath;
                OutputChannel.log(this.cwd);

                if (!!chaletToolsInstance) {
                    chaletToolsInstance.setWorkingDirectory(this.cwd);
                }
                setWatcher = true;
            }

            if (chaletToolsInstance === null) {
                chaletToolsInstance = new ChaletToolsExtension(this.context, this.platform, this.cwd, this.handleError);
                await chaletToolsInstance.activate();
                chaletToolsInstance.settings.refresh();
            }

            if (!this.versionValid) {
                chaletToolsInstance.setEnabled(false);
                chaletToolsInstance.setVisible(false);
                return;
            }

            if (setWatcher) {
                this.clearWatcher();
                this.workspaceWatcher = fs.watch(this.cwd, this.activateFromWorkspaceFolders);
            }

            // TODO: get from vscode settings
            // Note: In each of these, assume the file exists. if it doesn't, watchFile will pick it up

            if (this.globalSettingsFile === null) {
                this.globalSettingsFile = this.watchChaletFile(
                    path.join(getHomeDirectory(), ChaletFile.GlobalDirectory, ChaletFile.GlobalConfig),
                    chaletToolsInstance.setGlobalSettingsFile,
                    this.onSettingsJsonChange
                );
            }

            if (this.settingsFile === null) {
                this.settingsFile = this.watchChaletFile(
                    Utils.joinPath(workspaceRoot, ChaletFile.LocalConfig).fsPath,
                    chaletToolsInstance.setSettingsFile,
                    this.onSettingsJsonChange
                );
            }

            const chaletJsonPath = Utils.joinPath(workspaceRoot, ChaletFile.ChaletJson).fsPath;
            const chaletYamlPath = Utils.joinPath(workspaceRoot, ChaletFile.ChaletYaml).fsPath;
            this.inputFiles.push(chaletJsonPath);
            this.inputFiles.push(chaletYamlPath);

            if (this.inputFile === null) {
                this.inputFile = this.getCurrentInputFile();
            }

            for (const file of this.inputFiles) {
                this.watchChaletFile2(file, this.onChangeInputFile);
            }

            await chaletToolsInstance.setEnabled(
                (!!this.inputFile && fs.existsSync(this.inputFile)) ||
                    (!!this.settingsFile && fs.existsSync(this.settingsFile))
            );
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private getCurrentInputFile = (): string => {
        for (const file of this.inputFiles) {
            if (fs.existsSync(file)) {
                return file;
            }
        }
        if (this.inputFiles.length === 0) {
            throw new Error("No input files");
        }
        return this.inputFiles[0];
    };

    private onChangeInputFile = (curr: fs.Stats, prev: fs.Stats) => {
        const inputFile = this.getCurrentInputFile();
        if (!!chaletToolsInstance) {
            chaletToolsInstance.setInputFile(inputFile);
        }

        return this.onChaletJsonChange(curr, prev);
    };

    private onChaletJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        try {
            if (!chaletToolsInstance || !(chaletToolsInstance?.enabled ?? false)) {
                await this.activateFromWorkspaceFolders();
            } else {
                await chaletToolsInstance.handleChaletJsonChange();
            }
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private onSettingsJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        try {
            if (!chaletToolsInstance || !(chaletToolsInstance?.enabled ?? false)) {
                await this.activateFromWorkspaceFolders();
            } else {
                await chaletToolsInstance.handleSettingsJsonChange();
            }
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private clearActivateVars = () => {
        if (this.inputFile) {
            fs.unwatchFile(this.inputFile);
        }

        if (this.settingsFile) {
            fs.unwatchFile(this.settingsFile);
        }

        this.inputFile = null;
        this.settingsFile = null;
        this.cwd = null;
    };

    private handleError = (err: any) => {
        // We want activate to trigger next time
        this.clearActivateVars();

        chaletToolsInstance?.setEnabled(false);

        if (!!err.message) {
            vscode.window.showErrorMessage(err.message);
        }
        OutputChannel.logError(err);
    };

    private handleInformation = async <T extends string>(
        msg: string,
        options: T[],
        handlers: Record<string, () => void>
    ) => {
        // We want activate to trigger next time
        this.clearActivateVars();

        chaletToolsInstance?.setEnabled(false);

        OutputChannel.log(msg);
        const selected = await vscode.window.showInformationMessage(msg, ...options);
        if (!!selected && handlers[selected]) {
            handlers[selected]();
        }
    };

    private clearWatcher = () => {
        if (!!this.workspaceWatcher) {
            this.workspaceWatcher.close();
            this.workspaceWatcher = null;
        }
    };

    deactivate = () => {
        this.clearWatcher();

        chaletToolsInstance?.deactivate();
        chaletToolsInstance = null;

        if (!!this.schemaProvider) {
            this.schemaProvider = null;
        }

        this.clearActivateVars();
    };
}

export { ChaletToolsLoader, getChaletToolsInstance };
