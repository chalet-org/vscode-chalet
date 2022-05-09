import * as vscode from "vscode";

import { ChaletVersion } from "./Types";
import { EXTENSION_ID } from "./ExtensionID";

type Impl = {
    useDebugChalet: boolean;
    statusBarButtons: boolean;
};

class ChaletToolsExtensionSettings {
    private impl: Impl = {
        useDebugChalet: false,
        statusBarButtons: true,
    };

    getChaletExecutable = (): string => {
        return this.impl.useDebugChalet ? ChaletVersion.Debug : ChaletVersion.Release;
    };

    getChaletTabLabel = (): string => {
        return `Chalet${this.impl.useDebugChalet ? " (Debug)" : ""}`;
    };

    canShowStatusBarButtons = (): boolean => {
        return this.impl.statusBarButtons;
    };

    private updateBoolean = (key: keyof Impl) => {
        if (typeof this.impl[key] === "boolean") {
            const workbenchConfig = vscode.workspace.getConfiguration(EXTENSION_ID);
            const value = workbenchConfig.get<boolean>(key);
            if (value !== undefined) {
                this.impl[key] = value;
            }
        }
    };

    refresh = () => {
        this.updateBoolean("useDebugChalet");
        this.updateBoolean("statusBarButtons");
    };
}

export { ChaletToolsExtensionSettings };
