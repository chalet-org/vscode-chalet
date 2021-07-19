import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, ToolchainPreset, VSCodePlatform } from "../Types";
import { MenuItem, StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";
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

    private getRawMenu = (): MenuType[] => {
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
            ToolchainPreset.GCC,
            ToolchainPreset.LLVM,
        ];
    };

    private stringToMenuItem = (label: string): MenuItem<MenuType> => {
        const enumValues: string[] = Object.values(ToolchainPreset);
        if (enumValues.includes(label)) {
            return {
                label,
                description: "$(debug-breakpoint-log-unverified)",
            };
        } else {
            return {
                label,
            };
        }
    };

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map(this.stringToMenuItem);
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
            for (const item of this.getRawMenu()) {
                if (!menu.includes(item)) {
                    menu.push(item);
                }
            }
            await this.setMenu(menu.map(this.stringToMenuItem));
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
                    if (this.includesLabel(toolchain)) {
                        await this.setValueFromString(toolchain);
                    } else {
                        await this.setFirstValueInMenu();
                    }
                }
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };
}

export { BuildToolchainCommandMenu };
