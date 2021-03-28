"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandId = exports.ChaletVersion = exports.VSCodePlatform = exports.BuildArchitecture = exports.BuildConfigurations = exports.ChaletCommands = void 0;
var ChaletCommands;
(function (ChaletCommands) {
    ChaletCommands["BuildRun"] = "Build & Run";
    ChaletCommands["Run"] = "Run";
    ChaletCommands["Build"] = "Build";
    ChaletCommands["Rebuild"] = "Rebuild";
    ChaletCommands["Clean"] = "Clean";
    ChaletCommands["Bundle"] = "Bundle";
    ChaletCommands["Install"] = "Install";
    ChaletCommands["Configure"] = "Configure";
    ChaletCommands["Init"] = "Init";
})(ChaletCommands = exports.ChaletCommands || (exports.ChaletCommands = {}));
var BuildConfigurations;
(function (BuildConfigurations) {
    BuildConfigurations["Invalid"] = "[No valid configurations]";
    BuildConfigurations["Debug"] = "Debug";
    BuildConfigurations["Release"] = "Release";
    BuildConfigurations["RelWithDebInfo"] = "RelWithDebInfo";
    BuildConfigurations["MinSizeRel"] = "MinSizeRel";
    BuildConfigurations["Profile"] = "Profile";
})(BuildConfigurations = exports.BuildConfigurations || (exports.BuildConfigurations = {}));
var BuildArchitecture;
(function (BuildArchitecture) {
    BuildArchitecture["x64"] = "x64";
    BuildArchitecture["x86"] = "x86";
    BuildArchitecture["ARM"] = "ARM";
    BuildArchitecture["ARM64"] = "ARM64";
})(BuildArchitecture = exports.BuildArchitecture || (exports.BuildArchitecture = {}));
var VSCodePlatform;
(function (VSCodePlatform) {
    VSCodePlatform["MacOS"] = "osx";
    VSCodePlatform["Linux"] = "linux";
    VSCodePlatform["Windows"] = "windows";
})(VSCodePlatform = exports.VSCodePlatform || (exports.VSCodePlatform = {}));
var ChaletVersion;
(function (ChaletVersion) {
    ChaletVersion["Release"] = "chalet";
    ChaletVersion["Debug"] = "chalet-debug";
})(ChaletVersion = exports.ChaletVersion || (exports.ChaletVersion = {}));
var CommandId;
(function (CommandId) {
    CommandId["Run"] = "runChalet";
    CommandId["ChaletCommand"] = "chaletCommand";
    CommandId["BuildArchitecture"] = "buildArchitecture";
    CommandId["BuildConfiguration"] = "buildConfiguration";
    CommandId["MakeDebugBuild"] = "makeDebugBuild";
})(CommandId = exports.CommandId || (exports.CommandId = {}));
//# sourceMappingURL=Enums.js.map