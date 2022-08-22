import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback, MenuItem } from "./StatusBarCommandMenu";
import { getChaletToolsInstance } from "../ChaletToolsLoader";
import { ChaletCmdCommandMenu } from "./ChaletCmdCommandMenu";

type MenuType = string;

class BuildTargetsCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(context: vscode.ExtensionContext, onClick: ValueChangeCallback) {
        super(CommandId.BuildTarget, onClick, context);

        this.setTooltip("Change Run Target");
    }

    private getRawMenu = (): MenuType[] => [];

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({ label }));
    }

    updateVisibility = async (commandMenu: ChaletCmdCommandMenu): Promise<void> => {
        if (commandMenu.willRun()) {
            const runTargets = getChaletToolsInstance()?.runTargets ?? [];
            await this.setMenu(runTargets.map((label) => ({ label })));
            this.setVisible(true);
        } else {
            await this.setDefaultMenu();
            this.setVisible(false);
        }
    };

    setRunTarget = async (target: string): Promise<void> => {
        const runTarget = target.length > 0 ? target : null;
        const label = this.value?.label ?? "";
        const includesTarget = !!runTarget ? this.includesLabel(runTarget) : false;
        if ((!!runTarget && includesTarget && label.length === 0 && label !== runTarget) || !includesTarget) {
            await this.setValueFromString(runTarget);
        }
    };
}

export { BuildTargetsCommandMenu };
