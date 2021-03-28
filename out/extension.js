"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const ChaletToolsLoader_1 = require("./ChaletToolsLoader");
let extensionLoader = null;
function activate(context) {
    extensionLoader = new ChaletToolsLoader_1.ChaletToolsLoader(context);
}
exports.activate = activate;
function deactivate() {
    if (extensionLoader) {
        extensionLoader.deactivate();
    }
    extensionLoader = null;
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map