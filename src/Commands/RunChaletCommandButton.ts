import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { CommandId, Optional } from "../Types";
import { CommandButtonCallback, StatusBarCommandButton } from "./StatusBarCommandButton";
import { ChaletCmdCommandMenu } from "./ChaletCmdCommandMenu";

class RunChaletCommandButton extends StatusBarCommandButton {
    private runProject: Optional<string> = null;

    constructor(onClick: CommandButtonCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.Run, onClick, async () => {}, context, priority);
    }

    @bind
    initialize(): Promise<void> {
        return this.onInitialize();
    }

    updateLabelFromChaletCommand = (commandMenu: ChaletCmdCommandMenu) => {
        const icon: string = commandMenu.getIcon();
        if (!!this.runProject && commandMenu.willRun()) {
            this.setLabel(`$(${icon}) ${this.runProject}`);
        } else {
            this.setLabel(`$(${icon})`);
        }
    };

    parseJsonRunProject = (chaletJson: any): Optional<string> => {
        let executableProjects: string[] = [];
        let runProjects: string[] = [];
        let targets: any = chaletJson["targets"];
        if (targets && typeof targets === "object") {
            for (const [key, value] of Object.entries(targets)) {
                let item: any = value;
                if (item && typeof item === "object") {
                    if (item.kind && (item.kind === "desktopApplication" || item.kind === "consoleApplication")) {
                        executableProjects.push(key);
                        if (!!item.runProject) runProjects.push(key);
                    }
                }
            }
        }

        this.runProject =
            runProjects.length > 0 ? runProjects[0] : executableProjects.length > 0 ? executableProjects[0] : null;
        return this.runProject;
    };
}

export { RunChaletCommandButton };
