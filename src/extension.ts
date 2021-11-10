import { ExtensionContext } from "vscode";
import { ChaletToolsLoader } from "./ChaletToolsLoader";
import { OutputChannel } from "./OutputChannel";
import { Optional } from "./Types";

let extensionLoader: Optional<ChaletToolsLoader> = null;

export function activate(context: ExtensionContext) {
    OutputChannel.create("Chalet Tools");
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
