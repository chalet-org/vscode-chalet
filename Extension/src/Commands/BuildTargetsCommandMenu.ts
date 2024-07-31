import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, Optional } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback, MenuItem } from "./StatusBarCommandMenu";
import { getChaletToolsInstance } from "../ChaletToolsLoader";
import { ChaletCmdCommandMenu } from "./ChaletCmdCommandMenu";

type MenuType = string;

class BuildTargetsCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(context: vscode.ExtensionContext, onClick: ValueChangeCallback) {
        super(CommandId.BuildTarget, onClick, context);

        this.setTooltip("Change Run Target");
    }

    private valueCache: Optional<string> = null;

    private getRawMenu = (): MenuType[] => [];

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({ label }));
    }

    updateVisibility = async (commandMenu: ChaletCmdCommandMenu): Promise<void> => {
        const inst = getChaletToolsInstance();
        if (inst) {
            if (commandMenu.willRun()) {
                const value = this.getValue()?.label ?? this.valueCache ?? inst.lastRunTarget;
                this.setMenuOnly(inst.runTargets.map((label) => ({ label })));
                if (this.includesLabel(value)) {
                    await this.setValueFromString(value);
                }
                this.setVisible(true);
            } else {
                this.valueCache = this.getValue()?.label ?? inst.lastRunTarget;
                await this.setDefaultMenu();
                this.setVisible(false);
            }
        }
    };
}

export { BuildTargetsCommandMenu };
