import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId } from "../Types";
import { StatusBarCommand } from "./StatusBarCommand";

export type CommandButtonCallback = () => Promise<void>;

class StatusBarCommandButton extends StatusBarCommand {
    constructor(
        id: CommandId,
        private onClickCallback: CommandButtonCallback,
        protected onInitialize: CommandButtonCallback,
        context: vscode.ExtensionContext,
        priority: number
    ) {
        super(id, context, priority);
    }

    @bind
    protected onClick(): Promise<void> {
        return this.onClickCallback?.();
    }
    @bind
    initialize(): Promise<void> {
        return this.onInitialize();
    }
}

export { StatusBarCommandButton };
