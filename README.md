# @logol/dc-cli

一个简单的命令行工具，用于快速拉取指定项目目录下的组件文件。

## 功能特点

- 快速拉取指定项目目录下的组件文件
- 支持指定分支
- 支持指定目标目录
- 简单易用的命令行界面

## 安装

```bash
npm install -g @logol/dc-cli
```

## 使用

### 安装组件

```bash
@logol/dc-cli install <gitUrl> <componentPath> [targetDir]
npx @logol/dc-cli install <gitUrl> <componentPath> [targetDir]

# 指定分支
@logol/dc-cli install <gitUrl> <componentPath> [targetDir] -b <branch>
npx @logol/dc-cli install <gitUrl> <componentPath> [targetDir] -b <branch>
```

## 查看帮助

```bash
@logol/dc-cli --help
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 在本项目下执行
npm link 

# 在需要引入的项目下执行
npm link @logol/dc-cli
```

## 许可证

MIT

## 作者

[作者名称]

## 更新日志

### v1.2.0

- 修复含有图片时，下载的图片无法打开
- 支持-y, --yes参数

### v1.0.0

- 初始版本发布
- 基本功能实现
