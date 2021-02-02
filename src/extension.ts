import * as vscode from "vscode";
import { ExtensionContext } from "vscode";
import { ChaletToolsExtension } from "./ChaletToolsExtension";

// import { helloWorld } from "./Commands";

let chaletExtension: ChaletToolsExtension | null = null;

export function activate(context: ExtensionContext) {
    // console.log('Congratulations, your extension "chalet-tools" is now active!');

    chaletExtension = new ChaletToolsExtension(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (chaletExtension) {
        chaletExtension.deactivate();
    }
    chaletExtension = null;
}
