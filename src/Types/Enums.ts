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
    // Release = "Release",
    // RelWithDebInfo = "RelWithDebInfo",
    // MinSizeRel = "MinSizeRel",
    // Profile = "Profile",
}

export enum BuildArchitecture {
    Auto = "auto",
    WindowsHostX64_X64 = "x64",
    WindowsHostX64_X86 = "x64_x86",
    WindowsHostX64_ARM = "x64_arm",
    WindowsHostX64_ARM64 = "x64_arm64",
    WindowsHostX86_X64 = "x86_x64",
    WindowsHostX86_X86 = "x86",
    WindowsHostX86_ARM = "x86_arm",
    WindowsHostX86_ARM64 = "x86_arm64",
    MacOSUniversal2 = "universal",
    X86_64 = "x86_64",
    I686 = "i686",
    ARM64 = "arm64",
    ARM = "arm",
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
    MakeDebugBuild = "makeDebugBuild",
}

export enum ToolchainPreset {
    // vs- presets are checked dynamically
    LLVM = "llvm",
    AppleLLVM = "apple-llvm",
    GCC = "gcc",
    IntelLLVM = "icx",
    IntelGNU = "icc",
}
