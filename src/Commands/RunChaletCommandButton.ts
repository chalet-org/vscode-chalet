import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, Optional } from "../Types";
import { CommandButtonCallback, StatusBarCommandButton } from "./StatusBarCommandButton";
import { ChaletStatusBarCommandMenu } from "./ChaletStatusBarCommandMenu";

class RunChaletCommandButton extends StatusBarCommandButton {
    constructor(onClick: CommandButtonCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.Run, onClick, async () => {}, context, priority);
    }

    @bind
    initialize(): Promise<void> {
        return this.onInitialize();
    }

    updateLabelFromChaletCommand = (commandMenu: ChaletStatusBarCommandMenu, runProject: Optional<string>) => {
        const icon: string = commandMenu.getIcon();
        if (!!runProject && commandMenu.willRun()) {
            this.setLabel(`$(${icon}) ${runProject}`);
        } else {
            this.setLabel(`$(${icon})`);
        }
    };
}

export { RunChaletCommandButton };
