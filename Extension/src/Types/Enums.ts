export const enum ChaletCommands {
    BuildRun = "Build & Run",
    Run = "Run",
    Build = "Build",
    Rebuild = "Rebuild",
    Clean = "Clean",
    Bundle = "Bundle",
    Configure = "Configure",
    Init = "Init",
    TestTerminal = "Test Terminal",
}

export const enum BuildConfigurations {
    Invalid = "[No valid configurations]",
}

export const enum BuildArchitecture {
    Auto = "auto",
}

export const enum ChaletVersion {
    Release = "chalet",
    Debug = "chalet-debug",
}

export const enum CommandId {
    Run = "runChalet",
    ChaletCommand = "chaletCommand",
    BuildToolchain = "buildToolchain",
    BuildArchitecture = "buildArchitecture",
    BuildConfiguration = "buildConfiguration",
    BuildTarget = "buildTarget",
    InitializeProject = "initializeProject",
    InitializeCMakeProject = "initializeCMakeProject",
    TestTerminal = "testTerminal",
}