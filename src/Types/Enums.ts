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
    Release = "Release",
    RelWithDebInfo = "RelWithDebInfo",
    MinSizeRel = "MinSizeRel",
    Profile = "Profile",
}

export enum BuildArchitecture {
    Auto = "auto",
    x64 = "x64",
    x86 = "x86",
    ARM = "arm",
    ARM64 = "arm64",
}

export enum ChaletVersion {
    Release = "chalet",
    Debug = "chalet-debug",
}

export enum CommandId {
    Run = "runChalet",
    ChaletCommand = "chaletCommand",
    BuildArchitecture = "buildArchitecture",
    BuildConfiguration = "buildConfiguration",
    MakeDebugBuild = "makeDebugBuild",
}
