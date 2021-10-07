import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildArchitecture, CommandId, Optional, ToolchainPreset, VSCodePlatform } from "../Types";
import { MenuItem, StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";
import { getChaletToolsInstance } from "../ChaletToolsLoader";

type MenuType = BuildArchitecture | string;

class BuildArchitectureCommandMenu extends StatusBarCommandMenu<MenuType> {
    private toolchain: Optional<string> = null;

    constructor(
        onClick: ValueChangeCallback,
        context: vscode.ExtensionContext,
        priority: number,
        private platform: VSCodePlatform
    ) {
        super(CommandId.BuildArchitecture, onClick, context, priority);
    }

    private getRawMenu = (): MenuType[] => {
        if (!this.toolchain) return [];

        switch (this.toolchain) {
            case ToolchainPreset.LLVM:
            case ToolchainPreset.AppleLLVM: {
                /// LLVM requires the triple
                if (this.platform === VSCodePlatform.MacOS) {
                    return [
                        //
                        BuildArchitecture.Auto,
                        BuildArchitecture.MacOSUniversal2,
                        BuildArchitecture.X86_64,
                        BuildArchitecture.ARM64,
                    ];
                }
            }
            case ToolchainPreset.GCC: {
                if (this.platform === VSCodePlatform.Windows) {
                    return [
                        // Should be MinGW - I'm sure this will need to change at some point
                        BuildArchitecture.Auto,
                        BuildArchitecture.X86_64,
                        BuildArchitecture.I686,
                    ];
                }
            }
            default:
                break;
        }
        if (this.platform === VSCodePlatform.Windows) {
            if (this.toolchain.startsWith("vs-")) {
                return [
                    //
                    BuildArchitecture.Auto,
                    BuildArchitecture.WindowsHostX64_X64,
                    BuildArchitecture.WindowsHostX64_X86,
                    BuildArchitecture.WindowsHostX64_ARM,
                    BuildArchitecture.WindowsHostX64_ARM64,
                    BuildArchitecture.WindowsHostX86_X64,
                    BuildArchitecture.WindowsHostX86_X86,
                    BuildArchitecture.WindowsHostX86_ARM,
                    BuildArchitecture.WindowsHostX86_ARM64,
                ];
            }
        }
        return [
            //
            BuildArchitecture.Auto,
            BuildArchitecture.X86_64,
            BuildArchitecture.I686,
            BuildArchitecture.ARM64,
            BuildArchitecture.ARM,
        ];
    };

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({
            label,
        }));
    }

    setToolchainAndVisibility = async (toolchain: Optional<string>, visible: boolean): Promise<void> => {
        try {
            const toolchainPresets = getChaletToolsInstance()?.toolchainPresets ?? [];
            if (!!toolchain && toolchainPresets.includes(toolchain)) {
                this.toolchain = toolchain;
            } else {
                this.toolchain = null;
            }
            await this.setDefaultMenu();

            if (!visible || this.toolchain === null) {
                this.setVisible(false);
            } else {
                this.setVisible(true);
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    parseJsonSettingsArchitecture = async (settingsJson: any): Promise<void> => {
        try {
            let settings: any = settingsJson["settings"];
            if (!!settings && typeof settings === "object") {
                let architecture: any = settings["architecture"];
                if (!!architecture && typeof architecture === "string") {
                    await this.setValueFromString(architecture);
                }
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };
}

export { BuildArchitectureCommandMenu };
