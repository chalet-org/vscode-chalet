import * as fs from "fs";
import * as vscode from "vscode";

import { ChaletToolsExtension } from "./ChaletToolsExtension";
import { ChaletSchemaProvider } from "./ChaletSchemaProvider";
import { OutputChannel } from "./OutputChannel";
import { getVSCodePlatform, Optional, VSCodePlatform } from "./Types";

let chaletToolsInstance: Optional<ChaletToolsExtension> = null;

const getChaletToolsInstance = (): Optional<ChaletToolsExtension> => {
    return chaletToolsInstance;
};

class ChaletToolsLoader {
    private schemaProvider: Optional<ChaletSchemaProvider> = null;
    private platform: VSCodePlatform;

    inputFile: Optional<string> = null;
    settingsFile: Optional<string> = null;
    cwd: Optional<string> = null;

    workspaceCount: number = 0;

    // private settingsJsonWatcher: Optional<fs.FSWatcher> = null;
    // private chaletJsonWatcher: Optional<fs.FSWatcher> = null;

    constructor(private context: vscode.ExtensionContext) {
        this.platform = getVSCodePlatform();

        this.schemaProvider = new ChaletSchemaProvider(context.extensionPath);

        context.subscriptions.push(
            vscode.workspace.registerTextDocumentContentProvider("chalet-schema", this.schemaProvider)
        );

        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(async (ev) => {
                if (this.workspaceCount <= 1) return;

                if (ev) {
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(ev.document.uri);
                    await this.activate(workspaceFolder);
                }
            })
        );

        context.subscriptions.push(
            vscode.workspace.onDidChangeWorkspaceFolders((ev) => this.activateFromWorkspaceFolders())
        );
        this.activateFromWorkspaceFolders();
    }

    private activateFromWorkspaceFolders = async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            this.workspaceCount = folders.length;

            for (const folder of folders) {
                await this.activate(folder);
                if (chaletToolsInstance?.enabled ?? false) return;
            }
        }
    };

    private activate = async (workspaceFolder?: vscode.WorkspaceFolder): Promise<void> => {
        try {
            if (workspaceFolder) {
                const workspaceRoot = workspaceFolder.uri;
                const inputFileBlank = this.inputFile === null;
                const settingsFileBlank = this.settingsFile === null;
                if (this.cwd === workspaceRoot.fsPath && !inputFileBlank && !settingsFileBlank) {
                    return; // already watching the workspace
                }

                this.cwd = workspaceRoot.fsPath;

                if (chaletToolsInstance === null) {
                    chaletToolsInstance = new ChaletToolsExtension(this.context, this.platform);
                    await chaletToolsInstance.activate();
                }
                await chaletToolsInstance.setEnabled(true);
                chaletToolsInstance.setWorkingDirectory(this.cwd);
                chaletToolsInstance.refreshExtensionSettings();

                // TODO: get from local/global settings

                if (settingsFileBlank) {
                    const settingsJsonUri = vscode.Uri.joinPath(workspaceRoot, ".chaletrc");
                    this.settingsFile = settingsJsonUri.fsPath;

                    if (fs.existsSync(this.settingsFile)) {
                        chaletToolsInstance.setSettingsFile(this.settingsFile);

                        // this.settingsJsonWatcher = fs.watch(this.settingsFile, null, this.onSettingsJsonChange);
                        fs.watchFile(this.settingsFile, { interval: 1000 }, this.onSettingsJsonChange);
                    } else {
                        this.settingsFile = null;
                    }

                    await chaletToolsInstance.handleSettingsJsonChange();
                }

                if (inputFileBlank) {
                    const chaletJsonUri = vscode.Uri.joinPath(workspaceRoot, "chalet.json");
                    this.inputFile = chaletJsonUri.fsPath;

                    if (fs.existsSync(this.inputFile)) {
                        chaletToolsInstance.setInputFile(this.inputFile);

                        // this.chaletJsonWatcher = fs.watch(this.inputFile, null, this.onChaletJsonChange);
                        fs.watchFile(this.inputFile, { interval: 1000 }, this.onChaletJsonChange);
                    } else {
                        this.inputFile = null;
                    }

                    await chaletToolsInstance.handleChaletJsonChange();
                }
            }
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private onChaletJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        // private onChaletJsonChange = async (_ev: "rename" | "change", _filename: string) => {
        try {
            if (!chaletToolsInstance?.enabled ?? false) {
                await this.activateFromWorkspaceFolders();
            } else {
                await chaletToolsInstance.handleChaletJsonChange();
            }
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private onSettingsJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        // private onSettingsJsonChange = async (_ev: "rename" | "change", _filename: string) => {
        try {
            if (!chaletToolsInstance?.enabled ?? false) {
                await this.activateFromWorkspaceFolders();
            } else {
                await chaletToolsInstance.handleSettingsJsonChange();
            }
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private clearActivateVars = () => {
        this.inputFile = null;
        this.settingsFile = null;
        this.cwd = null;
    };

    private handleError = (err: any) => {
        // We want activate to trigger next time
        this.clearActivateVars();

        chaletToolsInstance?.setEnabled(false);

        if (!!err.message) vscode.window.showErrorMessage(err.message);
        OutputChannel.logError(err);
    };

    deactivate = () => {
        chaletToolsInstance?.deactivate();
        chaletToolsInstance = null;

        if (!!this.schemaProvider) {
            this.schemaProvider = null;
        }

        /*if (!!this.settingsJsonWatcher) {
            this.settingsJsonWatcher.close();
            this.settingsJsonWatcher = null;
        }
        if (!!this.chaletJsonWatcher) {
            this.chaletJsonWatcher.close();
            this.chaletJsonWatcher = null;
        }*/

        this.clearActivateVars();
    };
}

export { ChaletToolsLoader, getChaletToolsInstance };
