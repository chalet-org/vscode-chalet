"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaletToolsLoader = void 0;
const fs = require("fs");
const os = require("os");
const vscode = require("vscode");
const vscode_1 = require("vscode");
const ChaletToolsExtension_1 = require("./ChaletToolsExtension");
const Enums_1 = require("./Types/Enums");
class ChaletToolsLoader {
    constructor(context) {
        this.extension = null;
        this.buildJsonPath = null;
        this.cwd = null;
        this.activate = (editor) => {
            if (editor) {
                let workspaceFolder = vscode_1.workspace.getWorkspaceFolder(editor.document.uri);
                if (workspaceFolder) {
                    if (this.extension === null) {
                        this.extension = new ChaletToolsExtension_1.ChaletToolsExtension(this.context, this.platform);
                    }
                    this.extension.setEnabled(true);
                    this.extension.getExtensionSettings(); // Refresh settings
                    const workspaceRoot = workspaceFolder.uri;
                    if (this.cwd === workspaceRoot.fsPath) {
                        return; // already watching the workspace
                    }
                    this.cwd = workspaceRoot.fsPath;
                    const buildJsonUri = vscode_1.Uri.joinPath(workspaceRoot, "build.json"); // TODO: get from local/global settings
                    this.buildJsonPath = buildJsonUri.fsPath;
                    if (fs.existsSync(this.buildJsonPath)) {
                        this.extension.setWorkingDirectory(this.cwd);
                        this.extension.setBuildJsonPath(this.buildJsonPath);
                        this.extension.handleBuildJsonChange();
                        this.extension.updateStatusBarItems();
                        fs.watchFile(this.buildJsonPath, { interval: 2000 }, this.onBuildJsonChange);
                        return;
                    }
                }
            }
            if (this.extension) {
                this.extension.setEnabled(false);
            }
        };
        this.onBuildJsonChange = (_curr, _prev) => {
            if (this.extension) {
                this.extension.handleBuildJsonChange();
                this.extension.updateStatusBarItems();
            }
        };
        this.deactivate = () => {
            if (this.extension) {
                this.extension.deactivate();
                this.extension = null;
            }
            this.buildJsonPath = null;
            this.cwd = null;
        };
        this.getPlatform = () => {
            const nodePlatform = os.platform();
            if (nodePlatform === "win32") {
                return Enums_1.VSCodePlatform.Windows;
            }
            else if (nodePlatform === "darwin") {
                return Enums_1.VSCodePlatform.MacOS;
            }
            else {
                return Enums_1.VSCodePlatform.Linux;
            }
        };
        this.context = context;
        this.platform = this.getPlatform();
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(this.activate));
        this.activate(vscode.window.activeTextEditor);
    }
}
exports.ChaletToolsLoader = ChaletToolsLoader;
//# sourceMappingURL=ChaletToolsLoader.js.map