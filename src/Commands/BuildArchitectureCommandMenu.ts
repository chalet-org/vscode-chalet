import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildArchitecture, CommandId, Optional, ToolchainPreset, VSCodePlatform } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";

type MenuType = BuildArchitecture | string;

class BuildArchitectureCommandMenu extends StatusBarCommandMenu<MenuType> {
    private toolchain: Optional<ToolchainPreset> = null;

    constructor(
        onClick: ValueChangeCallback,
        context: vscode.ExtensionContext,
        priority: number,
        private platform: VSCodePlatform
    ) {
        super(CommandId.BuildArchitecture, onClick, context, priority);
    }

    @bind
    protected getDefaultMenu(): MenuType[] {
        if (!this.toolchain) return [];

        switch (this.toolchain) {
            case ToolchainPreset.VisualStudio:
            case ToolchainPreset.VisualStudioPreRelease: {
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
            case ToolchainPreset.LLVM:
            case ToolchainPreset.AppleLLVM: {
                if (this.platform === VSCodePlatform.MacOS) {
                    const suffixed = (arch: BuildArchitecture) => {
                        return `${arch}-apple-darwin`;
                    };
                    return [
                        //
                        BuildArchitecture.Auto,
                        suffixed(BuildArchitecture.X86_64),
                        suffixed(BuildArchitecture.ARM64),
                        suffixed(BuildArchitecture.I686),
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
        }
        return [
            //
            BuildArchitecture.Auto,
            BuildArchitecture.X86_64,
            BuildArchitecture.I686,
            BuildArchitecture.ARM64,
            BuildArchitecture.ARM,
        ];
    }

    setToolchainAndVisibility = async (
        toolchain: Optional<ToolchainPreset | string>,
        visible: boolean
    ): Promise<void> => {
        try {
            switch (toolchain) {
                case ToolchainPreset.VisualStudio:
                case ToolchainPreset.VisualStudioPreRelease:
                case ToolchainPreset.AppleLLVM:
                case ToolchainPreset.LLVM:
                case ToolchainPreset.GCC:
                    this.toolchain = toolchain;
                    break;
                default:
                    this.toolchain = null;
                    break;
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
}

export { BuildArchitectureCommandMenu };
