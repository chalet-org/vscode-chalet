import * as vscode from "vscode";

import { OutputChannel } from "./OutputChannel";
import { ChaletVersion, getVSCodePlatform, VSCodePlatform } from "./Types";
import { getTerminalEnv } from "./Functions";
import { getProcessOutput } from "./Functions/GetProcessOutput";

class ChaletSchemaProvider implements vscode.TextDocumentContentProvider {
    platform: VSCodePlatform;

    constructor(private extensionPath: string) {
        this.platform = getVSCodePlatform();
    }

    private fetchSchema = (schema: "settings-schema" | "chalet-schema") => {
        const chalet = ChaletVersion.Release;
        const env = getTerminalEnv(this.platform);
        return getProcessOutput(chalet, ["query", schema], env);
    };

    provideTextDocumentContent = async (uri: vscode.Uri): Promise<string> => {
        try {
            const schemaFile = uri.path.substr(1);

            let contents: string;
            if (schemaFile === "chalet-settings.schema.json") {
                contents = await this.fetchSchema("settings-schema");
            } else {
                contents = await this.fetchSchema("chalet-schema");
            }

            // const filename = path.join(this.extensionPath, "schema", uri.path.substr(1));
            // OutputChannel.log(filename);
            // contents = fs.readFileSync(filename, "utf8");

            console.log(JSON.parse(contents));
            return contents;
        } catch (err) {
            OutputChannel.logError(err);
            return "{}";
        }
    };
}

export { ChaletSchemaProvider };
