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

        this.activate();
    }

    private activate = () => {
        if (vscode.window.activeTextEditor) {
            let workspaceFolder = workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
            if (workspaceFolder) {
                const workspaceRoot = workspaceFolder.uri;
                this.cwd = workspaceRoot.fsPath;

                const buildJsonUri = Uri.joinPath(workspaceRoot, "build.json"); // TODO: get from local/global settings
                this.buildJsonPath = buildJsonUri.fsPath;

                if (fs.existsSync(this.buildJsonPath)) {
                    this.extension = new ChaletToolsExtension(
                        this.context,
                        this.platform,
                        this.cwd,
                        this.buildJsonPath
                    );
                    this.extension.handleBuildJsonChange();

                    fs.watchFile(this.buildJsonPath, { interval: 2000 }, (_curr, _prev) => {
                        if (this.extension) {
                            this.extension.handleBuildJsonChange();
                            this.extension.updateStatusBarItems();
                        }
                    });
                    return;
                }
            }
        }
        this.deactivate();
    };

    deactivate = () => {
        if (this.extension !== null) {
            this.extension.deactivate();
            this.extension = null;
        }
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
