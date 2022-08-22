import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback, MenuItem } from "./StatusBarCommandMenu";
import { getChaletToolsInstance } from "../ChaletToolsLoader";

type MenuType = string;

class BuildPathStyleCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(context: vscode.ExtensionContext, onClick: ValueChangeCallback) {
        super(CommandId.BuildPathStyle, onClick, context);

        this.setTooltip("Change Build Path Style");
    }

    private getRawMenu = (): MenuType[] => getChaletToolsInstance()?.buildPathStyles ?? [];

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({ label }));
    }
}

export { BuildPathStyleCommandMenu };
