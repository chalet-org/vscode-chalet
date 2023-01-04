import * as fsp from "fs/promises";
// import * as fs from "fs";
import * as path from "path";

export async function copyDirectory(src: string, dest: string) {
    try {
        await fsp.mkdir(dest, { recursive: true });
        const entries = await fsp.readdir(src, { withFileTypes: true });

        for (let entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            entry.isDirectory() ? await copyDirectory(srcPath, destPath) : await fsp.copyFile(srcPath, destPath);
        }
    } catch (err: any) {
        console.error(err);
    }
}
