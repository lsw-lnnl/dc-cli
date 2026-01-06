#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { downloadComponent } from "./download.js";
import { installComponent } from "./install.js";
import { packageJson } from "./get-package.js";

const program = new Command()
  .name(packageJson.name)
  .description("CLI to download and install components")
  .version(packageJson.version);

program
  .command("install <gitUrl> <componentPath> [targetDir]")
  .description("Download and install a component from git repository")
  .option('-b, --branch <branch>', 'Specify git branch', 'master')
  .option('-y, --yes', 'Automatically overwrite existing directory without prompting')
  .action(
    async (
      gitUrl: string,
      componentPath: string,
      targetDir: string = "./src/components",
      options: { branch: string; yes?: boolean }
    ) => {
      try {
        console.log(chalk.blue(`Downloading component from ${gitUrl} branch ${options.branch}...`));

        // 下载组件文件和依赖信息
        const { files, dependencies, devDependencies } = await downloadComponent(
          gitUrl, 
          componentPath, 
          options.branch
        );

        // 截取组件目录最后一层目录名称
        const componentPathArr = componentPath.split("/");
        const lastComponentDirName =
          componentPathArr[componentPathArr.length - 1];

        // 如果组件目录最后一层目录名称和目标目录的最后一层名称不一样，则把组件目录最后一层目录名称作为目标目录最后一层目录名称
        const targetDirArr = targetDir.split("/");
        const lastTargetDirName = targetDirArr[targetDirArr.length - 1];
        if (lastComponentDirName !== lastTargetDirName) {
          targetDir = [...targetDirArr, lastComponentDirName].join("/");
        }

        console.log(chalk.blue(`Start installing component to target directory...`));
        // 安装组件到目标目录，同时传入依赖信息
        const installed = await installComponent(files, targetDir, dependencies, devDependencies, options.yes);

        // 只在实际安装完成时显示成功提示
        if (installed) {
          console.log(chalk.green("Component installed successfully!"));
        }
      } catch (error) {
        console.error(chalk.red("Error installing component:"), error);
        process.exit(1);
      }
    }
  );

program.parse();
