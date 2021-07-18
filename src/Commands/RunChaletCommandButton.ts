import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, Optional } from "../Types";
import { CommandButtonCallback, StatusBarCommandButton } from "./StatusBarCommandButton";
import { ChaletStatusBarCommandMenu } from "./ChaletStatusBarCommandMenu";

class RunChaletCommandButton extends StatusBarCommandButton {
    private runProject: Optional<string> = null;

    constructor(onClick: CommandButtonCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.Run, onClick, async () => {}, context, priority);
    }

    @bind
    initialize(): Promise<void> {
        return this.onInitialize();
    }

    updateLabelFromChaletCommand = (commandMenu: ChaletStatusBarCommandMenu) => {
        const icon: string = commandMenu.getIcon();
        if (!!this.runProject && commandMenu.willRun()) {
            this.setLabel(`$(${icon}) ${this.runProject}`);
        } else {
            this.setLabel(`$(${icon})`);
        }
    };

    parseJsonRunProjects = (chaletJson: any): string[] => {
        let ret: string[] = [];
        let targets: any = chaletJson["targets"];
        if (targets && typeof targets === "object") {
            ret = [];
            for (const [key, value] of Object.entries(targets)) {
                let item: any = value;
                if (item && typeof item === "object") {
                    if (item.kind && (item.kind === "desktopApplication" || item.kind === "consoleApplication")) {
                        if (!!item.runProject) ret.push(key);
                    }
                }
            }
        }

        this.runProject = ret.length > 0 ? ret[0] : "";
        return ret;
    };
}

export { RunChaletCommandButton };
