import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { VSCodePlatform } from "./Types";

type ProblemType = "error" | "warning" | "note";

type CodeProblem = {
    source: "msvc" | "gcc";
    line: number;
    column: number;
    type: ProblemType;
    message: string;
    code?: string;
};

class ProblemController {
    collection: vscode.DiagnosticCollection;
    diagnostics: Record<string, vscode.Diagnostic[]> = {};

    constructor(context: vscode.ExtensionContext, private platform: VSCodePlatform, private cwd: string) {
        this.collection = vscode.languages.createDiagnosticCollection("chalet");

        if (vscode.window.activeTextEditor) {
            this.refreshDiagnostics(vscode.window.activeTextEditor.document);
        }
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    this.refreshDiagnostics(editor.document);
                }
            })
        );

        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument((e) => this.refreshDiagnostics(e.document))
        );

        // context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((doc) => this.collection.delete(doc.uri)));
    }

    private refreshDiagnostics = (doc: vscode.TextDocument): void => {
        this.collection.set(doc.uri, this.diagnostics[doc.uri.fsPath] ?? []);
    };

    private getSeverity = (type: ProblemType): vscode.DiagnosticSeverity => {
        switch (type) {
            case "error":
                return vscode.DiagnosticSeverity.Error;
            case "warning":
                return vscode.DiagnosticSeverity.Warning;
            case "note":
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    };

    onGetOutput = (lastOutput: string) => {
        const problemMap: Record<string, CodeProblem[]> = {};

        /*
            src/main.c:10:7: error: incompatible integer to pointer conversion initializing 'int *' with an expression of type 'int' [-Wint-conversion]
            c:\Users\...\src\main.c(11,9): warning C4477: 'printf' : format string '%d' requires an argument of type 'int', but variadic argument 1 has type 'int *'
        */

        const lines = lastOutput.split("\n");
        for (const outputLine of lines) {
            if (outputLine === "") continue;

            // gcc / clang style
            let captures = /(.*):([0-9]+):([0-9]+):\s*(error|warning|note):\s*(.*)/.exec(outputLine);
            if (captures) {
                let [_, file, line, column, type, message] = captures;
                if (!fs.existsSync(file)) {
                    file = path.join(this.cwd, ...file.split(/\/|\\/g));
                }
                if (!problemMap[file]) {
                    problemMap[file] = [];
                }
                problemMap[file].push({
                    source: "gcc",
                    line: parseInt(line),
                    column: parseInt(column),
                    type: type as ProblemType,
                    message,
                });
            }
            if (this.platform === VSCodePlatform.Windows) {
                captures = /(.*)\(([0-9]+),([0-9]+)\):\s*(error|warning)\s*([A-Z]\d+):\s*(.*)/.exec(outputLine);
                if (captures) {
                    let [_, file, line, column, type, code, message] = captures;
                    if (!fs.existsSync(file)) {
                        file = path.join(this.cwd, ...file.split(/\/|\\/g));
                    }
                    if (!problemMap[file]) {
                        problemMap[file] = [];
                    }
                    problemMap[file].push({
                        source: "msvc",
                        line: parseInt(line),
                        column: parseInt(column),
                        code,
                        type: type as ProblemType,
                        message,
                    });
                }
            }
        }

        this.collection.clear();

        for (const [file, problems] of Object.entries(problemMap)) {
            const diagnostics = problems.map(({ source, line, column, code, type, message }) => {
                const positionA = new vscode.Position(line - 1, column - 1);
                const positionB = new vscode.Position(line - 1, column);
                const range = new vscode.Range(positionA, positionB);
                const severity = this.getSeverity(type);
                const diagnostic = new vscode.Diagnostic(range, message, severity);
                diagnostic.source = source;
                diagnostic.code = code;
                return diagnostic;
            });

            this.diagnostics[file] = diagnostics;
            this.collection.set(vscode.Uri.file(file), diagnostics);
        }
    };
}

export { ProblemController };