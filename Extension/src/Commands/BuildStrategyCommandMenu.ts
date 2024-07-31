import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback, MenuItem } from "./StatusBarCommandMenu";
import { getChaletToolsInstance } from "../ChaletToolsLoader";
import { UNSET } from "../Constants";

type MenuType = string;

class BuildStrategyCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(context: vscode.ExtensionContext, onClick: ValueChangeCallback) {
        super(CommandId.BuildStrategy, onClick, context);

        this.setTooltip("Change Build Strategy");
    }

    private getRawMenu = (): MenuType[] => [UNSET, ...getChaletToolsInstance().buildStrategies];

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({ label }));
    }
}

export { BuildStrategyCommandMenu };
