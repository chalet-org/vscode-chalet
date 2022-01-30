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
        const iconLabel: string = `$(${icon})`;
        if (this.getLabel() !== iconLabel) {
            this.setLabel(iconLabel);
        }

        const label: Optional<string> = commandMenu.getLabel();
        if (!!label) {
            const tooltip: string = `${label} the Chalet project`;
            if (this.getTooltip() !== tooltip) {
                this.setTooltip(tooltip);
            }
        }
    };
}

export { RunChaletCommandButton };
