import * as vscode from "vscode";

import { ChaletToolsLoader } from "./ChaletToolsLoader";
import { OutputChannel } from "./OutputChannel";
import { Optional } from "./Types";

let extensionLoader: Optional<ChaletToolsLoader> = null;

export function activate(context: vscode.ExtensionContext) {
    OutputChannel.create("Chalet");
    extensionLoader = new ChaletToolsLoader(context);
    OutputChannel.logWithName("activated");
}

export function deactivate() {
    if (extensionLoader) {
        extensionLoader.deactivate();
    }
    extensionLoader = null;
    OutputChannel.logWithName("deactivated");
    OutputChannel.dispose();
}
