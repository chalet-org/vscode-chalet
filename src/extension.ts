import { window, commands, StatusBarAlignment, ExtensionContext, StatusBarItem } from "vscode";

// import { helloWorld } from "./Commands";

enum ChaletCommands {
    BuildRun = "Build & Run",
    Run = "Run",
    Build = "Build",
    Rebuild = "Rebuild",
    Clean = "Clean",
    Bundle = "Bundle",
    Install = "Install",
    Configure = "Configure",
    Init = "Init",
}

enum BuildConfigurations {
    Debug = "Debug",
    Release = "Release",
    RelWithDebInfo = "RelWithDebInfo",
    MinSizeRel = "MinSizeRel",
}

enum BuildArchitecture {
    x64 = "x64",
    x86 = "x86",
    ARM = "ARM",
    ARM64 = "ARM64",
}

let chaletCommand: ChaletCommands;
let statusBarChaletCommand: StatusBarItem;

let buildConfiguration: BuildConfigurations;
let statusBarBuildConfiguration: StatusBarItem;

let buildArchitecture: BuildArchitecture;
let statusBarBuildArchitecture: StatusBarItem;

let doActionIcon: string = "$(play)";
let statusBarDoAction: StatusBarItem;

export function activate({ subscriptions }: ExtensionContext) {
    console.log('Congratulations, your extension "chalet-tools" is now active!');

    // register a command that is invoked when the status bar
    // item is selected
    const chaletCommandId = "chalet-tools.chaletCommand";
    subscriptions.push(
        commands.registerCommand(chaletCommandId, async () => {
            const result = await window.showQuickPick([
                ChaletCommands.BuildRun,
                ChaletCommands.Run,
                ChaletCommands.Build,
                ChaletCommands.Rebuild,
                ChaletCommands.Clean,
                ChaletCommands.Bundle,
                ChaletCommands.Install,
                ChaletCommands.Configure,
                ChaletCommands.Init,
            ]);
            if (result) {
                chaletCommand = result as ChaletCommands;
            }
            updateStatusBarItems();
        })
    );

    const buildConfigurationId = "chalet-tools.buildConfiguration";
    subscriptions.push(
        commands.registerCommand(buildConfigurationId, async () => {
            const result = await window.showQuickPick([
                BuildConfigurations.Debug,
                BuildConfigurations.Release,
                BuildConfigurations.RelWithDebInfo,
                BuildConfigurations.MinSizeRel,
            ]);
            if (result) {
                buildConfiguration = result as BuildConfigurations;
            }
            updateStatusBarItems();
        })
    );

    const buildArchitectureId = "chalet-tools.buildArchitecture";
    subscriptions.push(
        commands.registerCommand(buildArchitectureId, async () => {
            const result = await window.showQuickPick([BuildArchitecture.x64, BuildArchitecture.x86]);
            if (result) {
                buildArchitecture = result as BuildArchitecture;
            }
            updateStatusBarItems();
        })
    );

    const goIconId = "chalet-tools.doAction";
    subscriptions.push(
        commands.registerCommand(goIconId, async () => {
            window.showInformationMessage("Do the thing!");
        })
    );

    statusBarChaletCommand = window.createStatusBarItem(StatusBarAlignment.Left, 4);
    statusBarChaletCommand.command = chaletCommandId;
    subscriptions.push(statusBarChaletCommand);

    statusBarBuildConfiguration = window.createStatusBarItem(StatusBarAlignment.Left, 3);
    statusBarBuildConfiguration.command = buildConfigurationId;
    subscriptions.push(statusBarBuildConfiguration);

    statusBarBuildArchitecture = window.createStatusBarItem(StatusBarAlignment.Left, 2);
    statusBarBuildArchitecture.command = buildArchitectureId;
    subscriptions.push(statusBarBuildArchitecture);

    statusBarDoAction = window.createStatusBarItem(StatusBarAlignment.Left, 1);
    statusBarDoAction.command = goIconId;
    subscriptions.push(statusBarDoAction);

    // register some listener that make sure the status bar
    // item always up-to-date
    subscriptions.push(window.onDidChangeActiveTextEditor(updateStatusBarItems));
    subscriptions.push(window.onDidChangeTextEditorSelection(updateStatusBarItems));

    chaletCommand = ChaletCommands.Build;
    buildConfiguration = BuildConfigurations.Debug;
    buildArchitecture = BuildArchitecture.x64;

    // update status bar item once at start
    updateStatusBarItems();
}

const updateStatusBarItems = () => {
    updateStatusBarItem(statusBarChaletCommand, chaletCommand);
    if (
        chaletCommand === ChaletCommands.Build ||
        chaletCommand === ChaletCommands.Run ||
        chaletCommand === ChaletCommands.BuildRun ||
        chaletCommand === ChaletCommands.Rebuild ||
        chaletCommand === ChaletCommands.Clean
    ) {
        updateStatusBarItem(statusBarBuildConfiguration, buildConfiguration);
        updateStatusBarItem(statusBarBuildArchitecture, buildArchitecture);
    } else {
        statusBarBuildConfiguration.hide();
        statusBarBuildArchitecture.hide();
    }
    updateStatusBarItem(statusBarDoAction, doActionIcon);
};

const updateStatusBarItem = (item: StatusBarItem, text: string) => {
    item.text = text;
    item.show();
};

// this method is called when your extension is deactivated
export function deactivate() {}
