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
            const inst = getChaletToolsInstance();
            if (inst) {
                await this.setMenu(inst.runTargets.map((label) => ({ label })));
                if (this.includesLabel(inst.lastRunTarget)) {
                    await this.setValueFromString(inst.lastRunTarget);
                }
            }
            this.setVisible(true);
        } else {
            await this.setDefaultMenu();
            this.setVisible(false);
        }
    };
}

export { BuildTargetsCommandMenu };
