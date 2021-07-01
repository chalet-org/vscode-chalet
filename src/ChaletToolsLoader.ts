import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";
import { ExtensionContext, Uri, workspace } from "vscode";
import { ChaletToolsExtension } from "./ChaletToolsExtension";
import { Optional } from "./Types";
import { VSCodePlatform } from "./Types/Enums";

class ChaletToolsLoader {
    private context: ExtensionContext;
    private platform: VSCodePlatform;

    extension: Optional<ChaletToolsExtension> = null;
    inputFile: Optional<string> = null;
    cwd: Optional<string> = null;

    workspaceCount: number = 0;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.platform = this.getPlatform();

        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor((ev) => {
                if (this.workspaceCount <= 1) return;

                if (ev) {
                    let workspaceFolder = workspace.getWorkspaceFolder(ev.document.uri);
                    this.activate(workspaceFolder);
                }
            })
        );

        context.subscriptions.push(
            vscode.workspace.onDidChangeWorkspaceFolders((ev) => {
                if (vscode.workspace.workspaceFolders) {
                    this.workspaceCount = vscode.workspace.workspaceFolders.length;
                    for (const folder of vscode.workspace.workspaceFolders) {
                        if (this.activate(folder)) break;
                    }
                }
            })
        );

        if (vscode.workspace.workspaceFolders) {
            this.workspaceCount = vscode.workspace.workspaceFolders.length;
            for (const folder of vscode.workspace.workspaceFolders) {
                this.activate(folder);
            }
        }
    }

    private activate = (workspaceFolder?: vscode.WorkspaceFolder): boolean => {
        if (workspaceFolder) {
            if (this.extension === null) {
                this.extension = new ChaletToolsExtension(this.context, this.platform);
            }
            this.extension.setEnabled(true);
            this.extension.getExtensionSettings(); // Refresh settings

            const workspaceRoot = workspaceFolder.uri;
            if (this.cwd === workspaceRoot.fsPath) {
                return true; // already watching the workspace
            }

            this.cwd = workspaceRoot.fsPath;

            const chaletJsonUri = Uri.joinPath(workspaceRoot, "chalet.json"); // TODO: get from local/global settings
            this.inputFile = chaletJsonUri.fsPath;

            if (fs.existsSync(this.inputFile)) {
                this.extension.setWorkingDirectory(this.cwd);
                this.extension.setInputFile(this.inputFile);
                this.extension.handleBuildJsonChange();
                this.extension.updateStatusBarItems();

                fs.watchFile(this.inputFile, { interval: 2000 }, this.onBuildJsonChange);
                return true;
            }
        }

        if (this.extension) {
            this.extension.setEnabled(false);
        }

        return false;
    };

    private onBuildJsonChange = (_curr: fs.Stats, _prev: fs.Stats) => {
        if (this.extension) {
            this.extension.handleBuildJsonChange();
            this.extension.updateStatusBarItems();
        }
    };

    deactivate = () => {
        if (this.extension) {
            this.extension.deactivate();
            this.extension = null;
        }
        this.inputFile = null;
        this.cwd = null;
    };

    private getPlatform = (): VSCodePlatform => {
        const nodePlatform = os.platform();
        if (nodePlatform === "win32") {
            return VSCodePlatform.Windows;
        } else if (nodePlatform === "darwin") {
            return VSCodePlatform.MacOS;
        } else {
            return VSCodePlatform.Linux;
        }
    };
}

export { ChaletToolsLoader };
