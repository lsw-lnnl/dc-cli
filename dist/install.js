import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
// 解析导入语句的正则表达式
const importRegex = /import\s+?(?:(?:(?:[\w*\s{},]*)\s+from\s+?)|)(?:(?:".*?")|(?:'.*?'))[\s]*?(?:;|$|)/g;
const pathRegex = /["']([@\w\/-]+)["']/;
// 获取项目根目录下的 package.json
async function getProjectDependencies(projectRoot) {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
        return {};
    }
    const packageJson = await fs.readJson(packageJsonPath);
    return {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
    };
}
// 从组件文件中提取导入的包名
function extractDependencies(content) {
    const imports = content.match(importRegex) || [];
    return imports
        .map(imp => {
        const match = imp.match(pathRegex);
        if (!match)
            return null;
        // 获取包名(取@开头或第一个/之前的部分)
        const path = match[1];
        // 排除以@/开头的别名路径
        if (path.startsWith('@/')) {
            return null;
        }
        if (path.startsWith('@')) {
            return path.split('/').slice(0, 2).join('/');
        }
        return path.split('/')[0];
    })
        .filter((pkg) => !!pkg &&
        !pkg.startsWith('.') && // 排除相对路径
        !pkg.startsWith('@types') // 排除类型定义包
    );
}
// 移除版本号前缀(^、~、>=等)
function normalizeVersion(version) {
    return version.replace(/^[\^~>=<]+/, '');
}
// 安装缺失的依赖
async function installMissingDependencies(projectRoot, missingDeps) {
    if (missingDeps.length === 0)
        return;
    console.log(chalk.blue(`Installing missing dependencies: ${missingDeps.join(', ')}`));
    try {
        // 检查是否使用yarn
        const hasYarnLock = await fs.pathExists(path.join(projectRoot, 'yarn.lock'));
        const command = hasYarnLock
            ? `yarn add ${missingDeps.join(' ')}`
            : `npm install ${missingDeps.join(' ')}`;
        execSync(command, {
            cwd: projectRoot,
            stdio: 'inherit'
        });
    }
    catch (error) {
        console.error(chalk.red('Failed to install dependencies:'), error);
        throw error;
    }
}
export async function installComponent(files, targetDir, dependencies = {}, devDependencies = {}, force = false) {
    let projectRoot = path.resolve(targetDir);
    const rootDir = path.parse(projectRoot).root;
    while (projectRoot !== rootDir) {
        if (await fs.pathExists(path.join(projectRoot, 'package.json'))) {
            break;
        }
        const parentDir = path.dirname(projectRoot);
        if (parentDir === projectRoot) {
            throw new Error('Could not find package.json in any parent directory');
        }
        projectRoot = parentDir;
    }
    if (projectRoot === rootDir) {
        throw new Error('Could not find package.json in any parent directory');
    }
    console.log('Found project root:', projectRoot);
    // 获取目标项目的依赖及其版本
    const existingDepsWithVersion = await getProjectDependencies(projectRoot);
    const existingDeps = Object.keys(existingDepsWithVersion);
    // 从组件文件中提取所有导入的包
    const allDeps = new Map();
    // 先从文件中解析实际使用的依赖（只处理非二进制的文本文件）
    for (const file of files) {
        if (!file.isBinary && (file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.vue'))) {
            const deps = extractDependencies(file.content);
            deps.forEach(dep => {
                if (!allDeps.has(dep)) {
                    const version = dependencies[dep] || 'latest';
                    allDeps.set(dep, version);
                    // 检查版本差异
                    if (existingDepsWithVersion[dep] && version !== 'latest') {
                        const normalizedExisting = normalizeVersion(existingDepsWithVersion[dep]);
                        const normalizedRequired = normalizeVersion(version);
                        if (normalizedExisting !== normalizedRequired) {
                            console.log(chalk.yellow(`Warning: Dependency version mismatch for '${dep}'\n` +
                                `  Component requires: ${version}\n` +
                                `  Project has: ${existingDepsWithVersion[dep]}`));
                        }
                    }
                }
            });
        }
    }
    // 找出缺失的依赖
    const missingDeps = Array.from(allDeps.entries())
        .filter(([pkg]) => !existingDeps.includes(pkg))
        .map(([pkg, version]) => {
        if (version === 'latest') {
            console.log(chalk.yellow(`Warning: Using latest version for dependency '${pkg}'`));
        }
        return `${pkg}@${version}`;
    });
    // 安装缺失的依赖
    await installMissingDependencies(projectRoot, missingDeps);
    // 对于开发依赖,只安装组件文件中实际使用到的
    const usedDevDeps = Array.from(allDeps.keys())
        .filter(pkg => devDependencies[pkg])
        .map(pkg => `${pkg}@${devDependencies[pkg]}`);
    if (usedDevDeps.length > 0) {
        try {
            const hasYarnLock = await fs.pathExists(path.join(projectRoot, 'yarn.lock'));
            const command = hasYarnLock
                ? `yarn add -D ${usedDevDeps.join(' ')}`
                : `npm install -D ${usedDevDeps.join(' ')}`;
            execSync(command, {
                cwd: projectRoot,
                stdio: 'inherit'
            });
        }
        catch (error) {
            console.error(chalk.red('Failed to install dev dependencies:'), error);
            throw error;
        }
    }
    // 检查目标目录是否已存在
    if (await fs.pathExists(targetDir)) {
        if (force) {
            // 使用 -y 参数时自动覆盖
            console.log(chalk.yellow(`Directory ${targetDir} already exists. Overwriting...`));
        }
        else {
            const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: chalk.yellow(`Directory ${targetDir} already exists. Do you want to overwrite it?`),
                    default: false
                }]);
            if (!confirm) {
                console.log(chalk.blue('Installation cancelled'));
                return false;
            }
        }
        // 删除原目录
        await fs.remove(targetDir);
    }
    // 确保目标目录存在
    await fs.ensureDir(targetDir);
    // 安装每个文件
    for (const file of files) {
        const targetPath = path.join(targetDir, file.path);
        // 创建父目录(如果需要)
        await fs.ensureDir(path.dirname(targetPath));
        // 写入文件
        await fs.writeFile(targetPath, file.content);
        console.log(chalk.green(`Installed: ${targetPath}`));
    }
    return true;
}
