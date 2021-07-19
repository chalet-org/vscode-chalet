import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, ToolchainPreset, VSCodePlatform } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";

type MenuType = ToolchainPreset | string;

class BuildToolchainCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(
        onClick: ValueChangeCallback,
        context: vscode.ExtensionContext,
        priority: number,
        private platform: VSCodePlatform
    ) {
        super(CommandId.BuildToolchain, onClick, context, priority);
    }

    @bind
    protected getDefaultMenu(): MenuType[] {
        switch (this.platform) {
            case VSCodePlatform.Windows:
                return [
                    //
                    ToolchainPreset.VisualStudioPreRelease,
                    ToolchainPreset.VisualStudio,
                    ToolchainPreset.LLVM,
                    ToolchainPreset.GCC,
                ];
            case VSCodePlatform.MacOS:
                return [
                    //
                    ToolchainPreset.AppleLLVM,
                    // ToolchainPreset.LLVM,
                    ToolchainPreset.GCC,
                ];
        }
        return [
            //
            ToolchainPreset.LLVM,
            ToolchainPreset.GCC,
        ];
    }

    parseJsonToolchains = async (settingsJson: any): Promise<void> => {
        try {
            let menu: MenuType[] = [];
            let toolchains: any = settingsJson["toolchains"];
            if (!!toolchains && typeof toolchains === "object") {
                for (const [key, value] of Object.entries(toolchains)) {
                    if (!menu.includes(key)) {
                        menu.push(key);
                    }
                }
            }
            for (const item of this.getDefaultMenu()) {
                if (!menu.includes(item)) {
                    menu.push(item);
                }
            }
            await this.setMenu(menu);
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    parseJsonSettingsToolchain = async (settingsJson: any): Promise<void> => {
        try {
            let settings: any = settingsJson["settings"];
            if (!!settings && typeof settings === "object") {
                let toolchain: any = settings["toolchain"];
                if (toolchain && typeof toolchain === "string") {
                    await this.setValue(toolchain);
                }
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };
}

export { BuildToolchainCommandMenu };
