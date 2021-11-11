import * as fs from "fs";
import * as vscode from "vscode";

import { ChaletToolsExtension } from "./ChaletToolsExtension";
import { OutputChannel } from "./OutputChannel";
import { getVSCodePlatform, Optional, VSCodePlatform } from "./Types";

let chaletToolsInstance: Optional<ChaletToolsExtension> = null;

const getChaletToolsInstance = (): Optional<ChaletToolsExtension> => {
    return chaletToolsInstance;
};

class ChaletToolsLoader {
    private platform: VSCodePlatform;

    inputFile: Optional<string> = null;
    settingsFile: Optional<string> = null;
    cwd: Optional<string> = null;

    workspaceCount: number = 0;
    watchInterval: number = 1000;

    constructor(private context: vscode.ExtensionContext) {
        this.platform = getVSCodePlatform();

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

                if (inputFileBlank) {
                    const chaletJsonUri = vscode.Uri.joinPath(workspaceRoot, "chalet.json");
                    this.inputFile = chaletJsonUri.fsPath;

                    chaletToolsInstance.setInputFile(this.inputFile);
                    fs.watchFile(this.inputFile, { interval: this.watchInterval }, this.onChaletJsonChange);

                    await chaletToolsInstance.handleChaletJsonChange();
                }

                if (settingsFileBlank) {
                    const settingsJsonUri = vscode.Uri.joinPath(workspaceRoot, ".chaletrc");
                    this.settingsFile = settingsJsonUri.fsPath;

                    chaletToolsInstance.setSettingsFile(this.settingsFile);
                    fs.watchFile(this.settingsFile, { interval: this.watchInterval }, this.onSettingsJsonChange);

                    await chaletToolsInstance.handleSettingsJsonChange();
                }
            }
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private onChaletJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        try {
            if (!chaletToolsInstance?.enabled ?? false) {
                await this.activateFromWorkspaceFolders();
            } else {
                await chaletToolsInstance?.handleChaletJsonChange();
            }
        } catch (err: any) {
            this.handleError(err);
        }
    };

    private onSettingsJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        try {
            if (!chaletToolsInstance?.enabled ?? false) {
                await this.activateFromWorkspaceFolders();
            } else {
                await chaletToolsInstance?.handleSettingsJsonChange();
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
        this.clearActivateVars();
    };
}

export { ChaletToolsLoader, getChaletToolsInstance };
