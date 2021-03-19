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
    buildJsonPath: Optional<string> = null;
    cwd: Optional<string> = null;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.platform = this.getPlatform();

        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(this.activate));

        this.activate(vscode.window.activeTextEditor);
    }

    private activate = (editor?: vscode.TextEditor) => {
        console.log("ChaletToolsLoader.activate()");
        if (editor) {
            let workspaceFolder = workspace.getWorkspaceFolder(editor.document.uri);
            if (workspaceFolder) {
                if (this.extension === null) {
                    this.extension = new ChaletToolsExtension(this.context, this.platform);
                }
                this.extension.setEnabled(true);

                const workspaceRoot = workspaceFolder.uri;
                if (this.cwd === workspaceRoot.fsPath) {
                    return; // already watching the workspace
                }

                this.cwd = workspaceRoot.fsPath;

                const buildJsonUri = Uri.joinPath(workspaceRoot, "build.json"); // TODO: get from local/global settings
                this.buildJsonPath = buildJsonUri.fsPath;

                if (fs.existsSync(this.buildJsonPath)) {
                    this.extension.setWorkingDirectory(this.cwd);
                    this.extension.setBuildJsonPath(this.buildJsonPath);
                    this.extension.handleBuildJsonChange();

                    fs.watchFile(this.buildJsonPath, { interval: 2000 }, this.onBuildJsonChange);
                    return;
                }
            } else {
                console.log("workspaceFolder", workspaceFolder);
                return;
            }
        } else {
            console.log("editor", editor);
        }

        if (this.extension) {
            this.extension.setEnabled(false);
        }
    };

    private onBuildJsonChange = (_curr: fs.Stats, _prev: fs.Stats) => {
        if (this.extension) {
            this.extension.handleBuildJsonChange();
            this.extension.updateStatusBarItems();
        }
    };

    deactivate = () => {
        console.log("ChaletToolsLoader.deactivate()");
        if (this.extension) {
            this.extension.deactivate();
            this.extension = null;
        }
        this.buildJsonPath = null;
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
