import * as vscode from "vscode";
import bind from "bind-decorator";

import { Optional, BuildArchitecture, CommandId } from "../Types";
import { StatusBarCommandMenu } from "./StatusBarCommandMenu";

class BuildArchitectureCommandMenu extends StatusBarCommandMenu<BuildArchitecture> {
    constructor(context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildArchitecture, context, priority);
    }

    @bind
    protected getDefaultMenu(): BuildArchitecture[] {
        return [BuildArchitecture.x64, BuildArchitecture.x86];
    }
}

export { BuildArchitectureCommandMenu };
