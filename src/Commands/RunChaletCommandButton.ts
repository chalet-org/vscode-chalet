import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, Optional } from "../Types";
import { CommandButtonCallback, StatusBarCommandButton } from "./StatusBarCommandButton";
import { ChaletCmdCommandMenu } from "./ChaletCmdCommandMenu";

class RunChaletCommandButton extends StatusBarCommandButton {
    private runTarget: Optional<string> = null;

    constructor(onClick: CommandButtonCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.Run, onClick, async () => {}, context, priority);
    }

    @bind
    initialize(): Promise<void> {
        return this.onInitialize();
    }

    updateLabelFromChaletCommand = (commandMenu: ChaletCmdCommandMenu) => {
        const icon: string = commandMenu.getIcon();
        if (!!this.runTarget && commandMenu.willRun()) {
            this.setLabel(`$(${icon}) ${this.runTarget}`);
        } else {
            this.setLabel(`$(${icon})`);
        }
    };

    setRunTarget = (target: string): Optional<string> => {
        this.runTarget = target.length > 0 ? target : null;
        return this.runTarget;
    };
}

export { RunChaletCommandButton };
