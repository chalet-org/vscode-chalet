import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildArchitecture, CommandId, Optional } from "../Types";
import { MenuItem, StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";
import { getChaletToolsInstance } from "../ChaletToolsLoader";

type MenuType = string;

class BuildArchitectureCommandMenu extends StatusBarCommandMenu<MenuType> {
    private toolchain: Optional<string> = null;

    constructor(context: vscode.ExtensionContext, onClick: ValueChangeCallback) {
        super(CommandId.BuildArchitecture, onClick, context);

        this.setTooltip("Change Build Architecture");
    }

    private getRawMenu = (): MenuType[] => getChaletToolsInstance()?.architectures ?? [];

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({ label }));
    }

    updateVisibility = async (toolchain: Optional<string>): Promise<void> => {
        try {
            if (this.toolchain === toolchain) return;

            const toolchainPresets = getChaletToolsInstance()?.toolchainPresets ?? [];
            if (!!toolchain && (toolchainPresets.includes(toolchain) || toolchain.startsWith("llvm-"))) {
                this.toolchain = toolchain;
            } else {
                this.toolchain = null;
            }

            await this.setDefaultMenu();

            const menu = this.getRawMenu();
            const onlyAuto = menu.length === 1 && menu[0] === BuildArchitecture.Auto;

            if (onlyAuto || this.toolchain === null) {
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
