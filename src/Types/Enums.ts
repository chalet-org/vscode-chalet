export enum ChaletCommands {
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

export enum BuildConfigurations {
    Invalid = "[No valid configurations]",
    Debug = "Debug",
    Release = "Release",
    RelWithDebInfo = "RelWithDebInfo",
    MinSizeRel = "MinSizeRel",
    Profile = "Profile",
}

export enum BuildArchitecture {
    x64 = "x64",
    x86 = "x86",
    ARM = "ARM",
    ARM64 = "ARM64",
}

export enum VSCodePlatform {
    MacOS = "osx",
    Linux = "linux",
    Windows = "windows",
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
}
