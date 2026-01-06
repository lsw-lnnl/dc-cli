import { simpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { packageJson } from './get-package.js';
import chalk from 'chalk';
// 二进制文件扩展名列表
const BINARY_EXTENSIONS = [
    '.png', '.gif', '.jpg', '.jpeg', '.ico', '.webp', '.bmp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.pdf', '.zip', '.mp3', '.mp4', '.wav'
];
// 判断是否为二进制文件
function isBinaryFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
}
export async function downloadComponent(gitUrl, componentPath, branch = 'master') {
    const tempDir = path.join(os.tmpdir(), `${packageJson.name}-${Date.now()}`);
    await fs.ensureDir(tempDir);
    try {
        // Clone repository with specified branch
        const git = simpleGit();
        await git.clone(gitUrl, tempDir, ['-b', branch, '--single-branch']);
        // Get component files
        const componentDir = path.join(tempDir, componentPath);
        const files = await getComponentFiles(componentDir);
        // 获取项目根目录的package.json
        const packageJsonPath = path.join(tempDir, 'package.json');
        let dependencies = {};
        let devDependencies = {};
        if (await fs.pathExists(packageJsonPath)) {
            const pkgJson = await fs.readJson(packageJsonPath);
            dependencies = pkgJson.dependencies || {};
            devDependencies = pkgJson.devDependencies || {};
        }
        else {
            console.log(chalk.yellow('Warning: No package.json found in project root'));
        }
        // Cleanup
        await fs.remove(tempDir);
        return {
            files,
            dependencies,
            devDependencies
        };
    }
    catch (error) {
        // Cleanup on error
        await fs.remove(tempDir);
        throw error;
    }
}
async function getComponentFiles(componentDir) {
    const files = [];
    async function processDirectory(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(componentDir, fullPath);
            if (entry.isDirectory()) {
                await processDirectory(fullPath);
            }
            else {
                const binary = isBinaryFile(fullPath);
                const content = binary
                    ? await fs.readFile(fullPath) // 返回 Buffer
                    : await fs.readFile(fullPath, 'utf-8'); // 返回 string
                files.push({
                    path: relativePath,
                    content,
                    isBinary: binary
                });
            }
        }
    }
    await processDirectory(componentDir);
    return files;
}
