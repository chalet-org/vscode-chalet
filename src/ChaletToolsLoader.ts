import * as fs from "fs";
import * as vscode from "vscode";

import { ChaletToolsExtension } from "./ChaletToolsExtension";
import { OutputChannel } from "./OutputChannel";
import { getVSCodePlatform, Optional, VSCodePlatform } from "./Types";

class ChaletToolsLoader {
    private platform: VSCodePlatform;

    extension: Optional<ChaletToolsExtension> = null;
    inputFile: Optional<string> = null;
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
                if (this.extension === null) {
                    this.extension = new ChaletToolsExtension(this.context, this.platform);
                    await this.extension.activate();
                }
                this.extension.setEnabled(true);
                this.extension.getExtensionSettings(); // Refresh settings

                const workspaceRoot = workspaceFolder.uri;
                if (this.cwd === workspaceRoot.fsPath) {
                    return true; // already watching the workspace
                }

                this.cwd = workspaceRoot.fsPath;

                const chaletJsonUri = vscode.Uri.joinPath(workspaceRoot, "chalet.json"); // TODO: get from local/global settings
                this.inputFile = chaletJsonUri.fsPath;

                if (fs.existsSync(this.inputFile)) {
                    this.extension.setWorkingDirectory(this.cwd);
                    this.extension.setInputFile(this.inputFile);
                    await this.extension.handleChaletJsonChange();
                    await this.extension.updateStatusBarItems();

                    fs.watchFile(this.inputFile, { interval: 2000 }, this.onChaletJsonChange);
                    return true;
                }
            }

            this.extension?.setEnabled(false);

            return false;
        } catch (err) {
            OutputChannel.logError(err);
            return false;
        }
    };

    private onChaletJsonChange = async (_curr: fs.Stats, _prev: fs.Stats) => {
        try {
            if (this.extension) {
                await this.extension.handleChaletJsonChange();
                await this.extension.updateStatusBarItems();
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    deactivate = () => {
        this.extension?.deactivate();
        this.extension = null;
        this.inputFile = null;
        this.cwd = null;
    };
}

export { ChaletToolsLoader };
