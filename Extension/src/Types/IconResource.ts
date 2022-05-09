import * as vscode from "vscode";
import { Dictionary } from "./BasicTypes";

export type IconResource = {
    light: vscode.Uri;
    dark: vscode.Uri;
};

export type IconDictionary = Dictionary<IconResource>;
