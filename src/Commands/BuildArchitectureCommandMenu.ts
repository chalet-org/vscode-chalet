import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, Optional, VSCodePlatform } from "../Types";
import { MenuItem, StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";
import { getChaletToolsInstance } from "../ChaletToolsLoader";

type MenuType = string;

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

    private getRawMenu = (): MenuType[] => getChaletToolsInstance()?.architectures ?? [];

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
}

export { BuildArchitectureCommandMenu };
