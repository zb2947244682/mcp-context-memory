# MCP上下文记忆服务

## 📖 项目介绍

这是一个强大的 MCP (Model Context Protocol) 工具，专门为AI提供上下文记忆管理能力。它允许AI创建、存储、检索和管理重要的记忆信息，帮助AI保持长期的知识库和上下文连续性。

**NPM 仓库地址:** [`@zb2947244682/mcp-context-memory`](https://www.npmjs.com/package/@zb2947244682/mcp-context-memory)

## 🧠 核心功能

此 MCP 服务提供了完整的记忆管理系统：

### 🏷️ 主题管理工具

- **`add_topic`** - 创建记忆主题，支持描述和标签
- **`list_topics`** - 列出所有主题及其基本信息
- **`remove_topic`** - 删除主题（带确认机制）

### 📝 记录管理工具

- **`add_record`** - 向主题添加记忆记录，支持重要性分级
- **`view_topic`** - 查看主题的所有记录，支持排序和分页
- **`remove_record`** - 删除特定记录

### 🔍 搜索和统计工具

- **`search_memory`** - 跨主题搜索包含关键词的记忆
- **`get_stats`** - 获取记忆系统的使用统计信息

## 🚀 使用场景

### 1. AI学习记录
- 记录学习过程和重要概念
- 按主题组织知识结构
- 快速检索相关学习内容

### 2. 对话上下文管理
- 保存重要对话内容
- 维护用户偏好和设置
- 提供个性化服务

### 3. 知识库构建
- 创建结构化的知识体系
- 支持标签分类和搜索
- 便于知识更新和维护

## ⚙️ 配置说明

### 在 Cursor 中配置

将以下配置添加到您的 Cursor `mcp.json` 文件中：

```json
{
  "mcp-context-memory": {
    "command": "npx",
    "args": [
      "-y",
      "@zb2947244682/mcp-context-memory@latest"
    ]
  }
}
```

### 通过 npx 直接运行

您可以通过以下命令直接从命令行运行此 MCP 项目：

```bash
npx @zb2947244682/mcp-context-memory@latest
```

## 本地开发配置

如果您在本地开发环境中使用，可以将以下配置添加到您的 Cursor `mcp.json` 文件中：

```json
{
  "mcp-context-memory": {
    "command": "node",
    "args": ["D:\\Codes\\MCPRepo\\mcp-context-memory\\index.js"]
  }
}
```

## 📊 数据结构

### 主题结构
```json
{
  "id": "唯一标识",
  "name": "主题名称",
  "description": "主题描述",
  "tags": ["标签1", "标签2"],
  "records": [],
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

### 记录结构
```json
{
  "id": "唯一标识",
  "content": "记录内容",
  "importance": "高/中/低",
  "context": "上下文信息",
  "metadata": {},
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

## 🔧 特性

- ✅ 完整的CRUD操作支持
- ✅ 智能搜索和筛选功能
- ✅ 重要性分级系统
- ✅ 标签分类管理
- ✅ 丰富的统计信息
- ✅ 友好的中文界面
- ✅ 完善的错误处理
- ✅ 高性能内存存储

## 📈 性能指标

- **响应时间**: 1-2ms
- **支持主题数**: 无限制
- **支持记录数**: 无限制
- **搜索速度**: 毫秒级
- **内存占用**: 最小化

## 🎯 使用示例

### 创建学习主题
```json
{
  "tool": "add_topic",
  "parameters": {
    "topic": "机器学习基础",
    "description": "记录机器学习的重要概念和算法",
    "tags": ["AI", "机器学习", "算法"]
  }
}
```

### 添加学习记录
```json
{
  "tool": "add_record",
  "parameters": {
    "topic": "机器学习基础",
    "content": "监督学习是一种机器学习方法，通过标记的训练数据来学习输入到输出的映射关系。",
    "importance": "高",
    "context": "监督学习概念学习",
    "metadata": {
      "category": "概念理解",
      "difficulty": "中等"
    }
  }
}
```

### 搜索相关记忆
```json
{
  "tool": "search_memory",
  "parameters": {
    "query": "监督学习",
    "importance": "全部",
    "limit": 10
  }
}
```

## 🔮 未来计划

- [ ] 数据持久化支持
- [ ] 高级搜索算法
- [ ] 语义分析功能
- [ ] 数据导入导出
- [ ] 多用户支持
- [ ] 权限管理

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

本项目采用 ISC 许可证。

---

*让AI拥有更好的记忆能力，构建智能的知识管理系统！* 🚀
