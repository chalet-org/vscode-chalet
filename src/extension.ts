import { ExtensionContext } from "vscode";
import { ChaletToolsLoader } from "./ChaletToolsLoader";

let extensionLoader: ChaletToolsLoader | null = null;

export function activate(context: ExtensionContext) {
    extensionLoader = new ChaletToolsLoader(context);
}

export function deactivate() {
    if (extensionLoader) {
        extensionLoader.deactivate();
    }
    extensionLoader = null;
}
