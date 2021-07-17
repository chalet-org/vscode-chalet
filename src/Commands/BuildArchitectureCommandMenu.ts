import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildArchitecture, CommandId } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";

class BuildArchitectureCommandMenu extends StatusBarCommandMenu<BuildArchitecture> {
    constructor(onClick: ValueChangeCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildArchitecture, onClick, context, priority);
    }

    @bind
    protected getDefaultMenu(): BuildArchitecture[] {
        return [
            //
            BuildArchitecture.x64,
            BuildArchitecture.x86,
        ];
    }
}

export { BuildArchitectureCommandMenu };
