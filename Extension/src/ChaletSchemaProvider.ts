import * as vscode from "vscode";

import { OutputChannel } from "./OutputChannel";
import { ChaletVersion, getVSCodePlatform, Optional, VSCodePlatform } from "./Types";
import { getTerminalEnv } from "./Functions";
import { getProcessOutput } from "./Functions/GetProcessOutput";

export const SCHEMA_PROVIDER_ID: string = "chalet-schema";

const enum SchemaType {
    ChaletJson = "schema-chalet-json",
    SettingsJson = "schema-settings-json",
}

class ChaletSchemaProvider implements vscode.TextDocumentContentProvider {
    platform: VSCodePlatform;

    settingsSchema: Optional<string> = null;
    chaletSchema: Optional<string> = null;

    constructor(private extensionPath: string) {
        this.platform = getVSCodePlatform();
    }

    private fetchSchema = (schema: SchemaType): Promise<string> => {
        const chalet = ChaletVersion.Release;
        const env = getTerminalEnv(this.platform);
        return getProcessOutput(chalet, ["query", schema], env);
    };

    isSchemaTypeValid = (uri: string) => {
        uri = uri.substring(`${SCHEMA_PROVIDER_ID}:///`.length);
        return uri == SchemaType.ChaletJson || uri == SchemaType.SettingsJson;
    };

    provideTextDocumentContent = async (uri: vscode.Uri): Promise<string> => {
        try {
            const schemaFile = uri.path.substring(1);

            if (schemaFile === SchemaType.SettingsJson) {
                if (this.settingsSchema === null) {
                    this.settingsSchema = await this.fetchSchema(SchemaType.SettingsJson);
                }

                return this.settingsSchema;
            } else if (schemaFile === SchemaType.ChaletJson) {
                if (this.chaletSchema === null) {
                    this.chaletSchema = await this.fetchSchema(SchemaType.ChaletJson);
                }

                return this.chaletSchema;
            } else {
                throw new Error("Invalid chalet-schema requested");
            }
        } catch (err) {
            OutputChannel.logError(err);
            return "{}";
        }
    };
}

export { ChaletSchemaProvider };
