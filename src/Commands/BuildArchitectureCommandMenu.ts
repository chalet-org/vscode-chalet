import * as vscode from "vscode";
import { Optional } from "../Types";
import { BuildArchitecture, CommandId } from "../Types/Enums";
import { StatusBarCommandMenu } from "./StatusBarCommandMenu";

class BuildArchitectureCommandMenu extends StatusBarCommandMenu<BuildArchitecture> {
    constructor(context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildArchitecture, context, priority);
    }

    initialize = async (defaultValue: Optional<BuildArchitecture> = null): Promise<void> => {
        await this.setMenu([BuildArchitecture.x64, BuildArchitecture.x86]);
        await this.setValue(this.getStateValue(defaultValue));
    };
}

export { BuildArchitectureCommandMenu };
