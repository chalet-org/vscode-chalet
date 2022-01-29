import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, Optional } from "../Types";
import { CommandButtonCallback, StatusBarCommandButton } from "./StatusBarCommandButton";
import { ChaletCmdCommandMenu } from "./ChaletCmdCommandMenu";

class RunChaletCommandButton extends StatusBarCommandButton {
    constructor(context: vscode.ExtensionContext, onClick: CommandButtonCallback) {
        super(CommandId.Run, onClick, async () => {}, context);
    }

    @bind
    initialize(): Promise<void> {
        return this.onInitialize();
    }

    updateLabelFromChaletCommand = (commandMenu: ChaletCmdCommandMenu) => {
        const icon: string = commandMenu.getIcon();
        this.setLabel(`$(${icon})`);
    };
}

export { RunChaletCommandButton };
