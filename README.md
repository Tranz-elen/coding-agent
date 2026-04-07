<div align="center">

# 🤖 Coding Agent

[![GitHub stars](https://img.shields.io/github/stars/tranz-elen/coding-agent?style=for-the-badge&logo=github&color=yellow)](https://github.com/tranz-elen/coding-agent/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/tranz-elen/coding-agent?style=for-the-badge&logo=github&color=blue)](https://github.com/tranz-elen/coding-agent/network)
[![GitHub issues](https://img.shields.io/github/issues/tranz-elen/coding-agent?style=for-the-badge&logo=github&color=red)](https://github.com/tranz-elen/coding-agent/issues)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=opensourceinitiative)](LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-API-purple?style=for-the-badge&logo=deepseek)](https://deepseek.com/)

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge&logo=github)](https://github.com/tranz-elen/coding-agent/pulls)
[![Made with Love](https://img.shields.io/badge/Made%20with-Love-red?style=for-the-badge)](https://github.com/tranz-elen/coding-agent)

</div>

# Coding Agent

基于 Claude Code 架构学习的 AI 编程助手实现。支持文件操作、命令执行、任务管理、会话持久化和权限控制。

## ✨ 功能特性

| 功能             | 说明                       |
| -------------- | ------------------------ |
| 🤖 核心 Agent 循环 | 自动调用 LLM 并执行工具           |
| 📁 文件操作        | 读取、写入、编辑、搜索文件            |
| 🔧 命令执行        | 执行系统命令（支持 Windows/Linux） |
| 📋 任务管理        | Todo 列表，支持多步骤任务规划        |
| 💾 会话持久化       | 自动保存对话历史，支持断点续传          |
| 🔐 权限系统        | 危险操作需要用户确认               |

## 🛠️ 内置工具

| 工具           | 功能     | 权限      |
| ------------ | ------ | ------- |
| `bash`       | 执行系统命令 | ⚠️ 需要确认 |
| `read_file`  | 读取文件   | ✅ 自动允许  |
| `write_file` | 写入文件   | ⚠️ 需要确认 |
| `file_edit`  | 编辑文件   | ⚠️ 需要确认 |
| `glob`       | 搜索文件   | ✅ 自动允许  |
| `grep`       | 搜索内容   | ✅ 自动允许  |
| `todo_write` | 任务管理   | ✅ 自动允许  |
| `web_fetch`  | 网络请求   | ✅ 自动允许  |

## 🚀 快速开始

### 安装依赖

```bash
npm install### 配置API key
```

### 配置 API Key
创建 .env 文件：
```bash
DEEPSEEK_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.deepseek.com/v1
```

### 运行
```bash
npm run dev
```
## 📋命令列表
| 命令          | 功能     |
| ------------ | ------ |
| `/sessions`    | 查看所有会话 |
| `/save`        | 保存当前会话 |
| `/resume <id>` | 切换会话 |
| `/rename <名称>` | 重命名当前会话 |
| `/session-info` | 查看会话详情 |
| `/delete <id>`  | 删除会话 |
| `exit`        | 退出会话 |

## 📁项目结构
```bash
src/
├── agent/           # Agent 核心
│   ├── loop.ts      # 核心循环
│   └── types.ts     # 类型定义
├── api/             # LLM 客户端
│   └── client.ts    # DeepSeek API
├── tools/           # 工具实现
│   ├── base.ts      # 工具基类
│   ├── registry.ts  # 工具注册
│   └── *.ts         # 具体工具
├── permissions/     # 权限系统
│   ├── types.ts     # 权限类型
│   └── checker.ts   # 权限检查
├── state/           # 会话管理
│   └── session.ts   # 会话存储
└── index.ts         # 入口文件
```

## 📚学习笔记
本项目基于对 Claude Code 源码的学习，实现了其核心架构：
- 核心循环 - while + needsFollowUp 模式
- 工具系统 - 统一的 Tool 接口 + 能力标记
- 权限控制 - 工具级别 + 命令级别双重检查
- 会话管理 - JSON 文件持久化 + 会话隔离

## 📄 License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.