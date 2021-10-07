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

    constructor(private context: vscode.ExtensionContext) {
        this.platform = getVSCodePlatform();

        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(async (ev) => {
                if (this.workspaceCount <= 1) return;

                if (ev) {
                    let workspaceFolder = vscode.workspace.getWorkspaceFolder(ev.document.uri);
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
        try {
            const folders = vscode.workspace.workspaceFolders;
            if (folders) {
                this.workspaceCount = folders.length;

                for (const folder of folders) {
                    const activated = await this.activate(folder);
                    if (activated) return;
                }
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    private activate = async (workspaceFolder?: vscode.WorkspaceFolder): Promise<boolean> => {
        try {
            if (workspaceFolder) {
                const workspaceRoot = workspaceFolder.uri;
                const inputFileBlank = this.inputFile === null;
                const settingsFileBlank = this.settingsFile === null;
                if (this.cwd === workspaceRoot.fsPath && !inputFileBlank && !settingsFileBlank) {
                    return true; // already watching the workspace
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

                let result = !inputFileBlank;
                if (inputFileBlank) {
                    const chaletJsonUri = vscode.Uri.joinPath(workspaceRoot, "chalet.json");
                    this.inputFile = chaletJsonUri.fsPath;

                    chaletToolsInstance.setInputFile(this.inputFile);
                    await chaletToolsInstance.handleChaletJsonChange();

                    fs.watchFile(this.inputFile, { interval: 2000 }, this.onChaletJsonChange);
                    result = true;
                }

                if (settingsFileBlank) {
                    const settingsJsonUri = vscode.Uri.joinPath(workspaceRoot, ".chaletrc");
                    this.settingsFile = settingsJsonUri.fsPath;

                    chaletToolsInstance.setSettingsFile(this.settingsFile);
                    await chaletToolsInstance.handleSettingsJsonChange();

                    fs.watchFile(this.settingsFile, { interval: 2000 }, this.onSettingsJsonChange);
                }

                return result;
            }

            await chaletToolsInstance?.setEnabled(false);

            return false;
        } catch (err) {
            OutputChannel.logError(err);
            return false;
        }
    };

    private onChaletJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        try {
            await chaletToolsInstance?.handleChaletJsonChange();
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    private onSettingsJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        try {
            await chaletToolsInstance?.handleSettingsJsonChange();
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    deactivate = () => {
        chaletToolsInstance?.deactivate();
        chaletToolsInstance = null;
        this.inputFile = null;
        this.cwd = null;
    };
}

export { ChaletToolsLoader, getChaletToolsInstance };
