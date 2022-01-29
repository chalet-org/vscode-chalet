export enum ChaletCommands {
    BuildRun = "Build & Run",
    Run = "Run",
    Build = "Build",
    Rebuild = "Rebuild",
    Clean = "Clean",
    Bundle = "Bundle",
    Configure = "Configure",
    Init = "Init",
}

export enum BuildConfigurations {
    Invalid = "[No valid configurations]",
    Debug = "Debug",
}

export enum BuildArchitecture {
    Auto = "auto",
}

export enum ChaletVersion {
    Release = "chalet",
    Debug = "chalet-debug",
}

export enum CommandId {
    Run = "runChalet",
    ChaletCommand = "chaletCommand",
    BuildToolchain = "buildToolchain",
    BuildArchitecture = "buildArchitecture",
    BuildConfiguration = "buildConfiguration",
    BuildTarget = "buildTarget",
    MakeDebugBuild = "makeDebugBuild",
    InitializeProject = "initializeProject",
    InitializeCMakeProject = "initializeCMakeProject",
}
