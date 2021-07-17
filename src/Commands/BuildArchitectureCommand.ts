import * as vscode from "vscode";
import { BuildArchitecture, CommandId } from "../Types/Enums";
import { StatusBarCommandMenu } from "./StatusBarCommandMenu";

class BuildArchitectureCommand extends StatusBarCommandMenu<BuildArchitecture> {
    constructor(context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildArchitecture, context, priority);

        this.setMenu([BuildArchitecture.x64, BuildArchitecture.x86]);
    }
}

export { BuildArchitectureCommand };
