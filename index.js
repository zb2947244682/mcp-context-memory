#!/usr/bin/env node
/**
 * MCP-Context-Memory 上下文记忆服务器
 * 
 * 这是一个智能的记忆管理系统，提供3个核心工具：
 * 1. memory_manage - 统一记忆管理（增删改查）
 *    - 先创建主题，再添加记录
 *    - 支持主题和记录的完整生命周期管理
 * 2. memory_query - 智能记忆查询和检索
 *    - 支持多维度搜索和筛选
 *    - 提供灵活的排序和分页功能
 * 3. memory_stats - 记忆系统统计和状态
 *    - 实时监控系统使用情况
 *    - 提供详细的性能指标
 * 
 * 核心功能：
 * - 主题管理：创建、更新、删除记忆主题（如"项目笔记"、"学习记录"等）
 * - 记录管理：添加、修改、删除具体记录内容
 * - 智能查询：支持关键词、标签、重要性等多维度搜索
 * - 上下文关联：记录与主题的关联管理
 * - 标签系统：灵活的标签分类和筛选
 * 
 * 使用流程：
 * 1. 使用 memory_manage 创建主题（action: "create_topic"）
 * 2. 使用 memory_manage 添加记录到主题（action: "create_record"）
 * 3. 使用 memory_query 查询和检索记忆
 * 4. 使用 memory_stats 查看系统状态
 * 
 * 特点：
 * - 统一的API接口，减少工具数量
 * - 智能的查询算法，支持模糊匹配
 * - 完整的统计信息，监控系统状态
 * - 支持元数据扩展，灵活的数据结构
 * 
 * 使用场景：
 * - 知识管理：整理和检索学习内容
 * - 项目管理：记录项目进展和决策
 * - 个人笔记：管理想法和灵感
 * - 团队协作：共享和查找信息
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "context-memory-server",
  version: "1.0.0"
});

// 内存存储结构：主题 -> 记录数组
let memoryStore = new Map();

// 统计信息
let memoryStats = {
  totalTopics: 0,
  totalRecords: 0,
  totalMemorySize: 0,
  lastAccessTime: null,
  accessCount: 0
};

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取当前时间戳
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// 计算记录大小（字符数）
function calculateRecordSize(record) {
  return JSON.stringify(record).length;
}

// 更新统计信息
function updateStats(action, topic = null, record = null) {
  memoryStats.lastAccessTime = getCurrentTimestamp();
  memoryStats.accessCount++;
  
  if (action === 'add_topic') {
    memoryStats.totalTopics++;
  } else if (action === 'add_record') {
    memoryStats.totalRecords++;
    if (record) {
      memoryStats.totalMemorySize += calculateRecordSize(record);
    }
  } else if (action === 'remove_topic') {
    memoryStats.totalTopics--;
  } else if (action === 'remove_record') {
    memoryStats.totalRecords--;
    if (record) {
      memoryStats.totalMemorySize -= calculateRecordSize(record);
    }
  }
}

// 注册记忆管理工具 - 统一处理增删改操作
server.registerTool("memory_manage",
  {
    title: "记忆管理",
    description: "统一管理记忆主题和记录的创建、更新、删除操作。先创建主题，再添加记录。",
    inputSchema: {
      action: z.enum(["create_topic", "create_record", "update_topic", "update_record", "delete_topic", "delete_record"]).describe("操作类型：create_topic(创建主题)、create_record(添加记录)、update_topic(更新主题)、update_record(更新记录)、delete_topic(删除主题)、delete_record(删除记录)"),
      topic: z.string().min(1, "主题名称不能为空").max(100, "主题名称不能超过100个字符").describe("主题名称：用于组织相关记忆的类别，如'项目笔记'、'学习记录'等"),
      // 主题相关参数
      description: z.string().default("").describe("主题描述：可选，描述这个主题的用途和内容"),
      tags: z.array(z.string()).default([]).describe("主题标签：可选，用于分类和搜索，如['技术', '前端', 'React']"),
      // 记录相关参数
      content: z.string().default("").describe("记录内容：要保存的具体信息内容，必填项"),
      importance: z.enum(["低", "中", "高"]).default("中").describe("记录重要性：低(日常信息)、中(重要信息)、高(关键信息)"),
      context: z.string().default("").describe("记录上下文：可选，记录相关的背景信息或来源"),
      metadata: z.record(z.any()).default({}).describe("额外元数据：可选，存储额外的结构化信息"),
      // 删除和更新参数
      recordId: z.string().default("").describe("记录ID：更新或删除记录时需要的唯一标识符"),
      confirm: z.boolean().default(false).describe("删除确认：删除主题时必须设为true以确认操作")
    }
  },
  async ({ action, topic, description, tags, content, importance, context, metadata, recordId, confirm }) => {
    try {
      switch (action) {
        case "create_topic":
          // 检查主题是否已存在
          if (memoryStore.has(topic)) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `⚠️ 主题 "${topic}" 已存在，无法重复创建。

现有主题信息:
- 描述: ${memoryStore.get(topic).description || '无描述'}
- 标签: ${memoryStore.get(topic).tags.join(', ') || '无标签'}
- 记录数量: ${memoryStore.get(topic).records.length}条

如需添加记录到此主题，请使用 action: "create_record"。` 
                }
              ]
            };
          }
          
          // 创建新主题
          const newTopic = {
            id: generateId(),
            name: topic,
            description: description,
            tags: tags,
            records: [],
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          };
          
          memoryStore.set(topic, newTopic);
          updateStats('add_topic');
          
          return {
            content: [
              { 
                type: "text", 
                text: `✅ 主题 "${topic}" 创建成功！

主题信息:
- ID: ${newTopic.id}
- 描述: ${description || '无描述'}
- 标签: ${tags.join(', ') || '无标签'}
- 创建时间: ${newTopic.createdAt}
- 当前记录数: 0条` 
              }
            ]
          };

        case "create_record":
          if (!content) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 记录内容不能为空！

💡 提示：记录内容是必填项，请提供要保存的具体信息内容。
例如：项目进展、学习笔记、重要决策等。` 
                }
              ]
            };
          }
          
          // 检查主题是否存在
          if (!memoryStore.has(topic)) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 主题 "${topic}" 不存在！

💡 解决步骤：
1. 先使用 action: "create_topic" 创建主题 "${topic}"
2. 然后使用 action: "create_record" 添加记录到该主题

或者使用 memory_query 工具的 action: "list_topics" 查看现有主题列表。` 
                }
              ]
            };
          }
          
          // 创建新记录
          const newRecord = {
            id: generateId(),
            content: content,
            importance: importance,
            context: context,
            metadata: metadata,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          };
          
          // 添加到主题
          const topicDataForRecord = memoryStore.get(topic);
          topicDataForRecord.records.push(newRecord);
          topicDataForRecord.updatedAt = getCurrentTimestamp();
          
          updateStats('add_record', topic, newRecord);
          
          return {
            content: [
              { 
                type: "text", 
                text: `✅ 记录已成功添加到主题 "${topic}"！

记录信息:
- ID: ${newRecord.id}
- 重要性: ${importance}
- 内容: ${content}
- 上下文: ${context || '无'}
- 创建时间: ${newRecord.createdAt}

主题 "${topic}" 当前共有 ${topicDataForRecord.records.length} 条记录。` 
              }
            ]
          };

        case "update_topic":
          // 检查主题是否存在
          if (!memoryStore.has(topic)) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 主题 "${topic}" 不存在！

请使用 action: "list_topics" 查看现有主题列表。` 
                }
              ]
            };
          }
          
          const topicToUpdate = memoryStore.get(topic);
          
          // 更新主题信息
          if (description && description !== "") {
            topicToUpdate.description = description;
          }
          if (tags && tags.length > 0) {
            topicToUpdate.tags = tags;
          }
          topicToUpdate.updatedAt = getCurrentTimestamp();
          
          return {
            content: [
              { 
                type: "text", 
                text: `✅ 主题 "${topic}" 更新成功！

更新后信息:
- 描述: ${topicToUpdate.description || '无描述'}
- 标签: ${topicToUpdate.tags.join(', ') || '无标签'}
- 记录数量: ${topicToUpdate.records.length}条
- 最后更新: ${topicToUpdate.updatedAt}` 
              }
            ]
          };

        case "update_record":
          if (!recordId) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 记录ID不能为空！` 
                }
              ]
            };
          }
          
          // 检查主题是否存在
          if (!memoryStore.has(topic)) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 主题 "${topic}" 不存在！` 
                }
              ]
            };
          }
          
          const topicDataForUpdate = memoryStore.get(topic);
          const recordToUpdate = topicDataForUpdate.records.find(record => record.id === recordId);
          
          if (!recordToUpdate) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 在主题 "${topic}" 中未找到ID为 "${recordId}" 的记录！` 
                }
              ]
            };
          }
          
          // 更新记录信息
          if (content && content !== "") {
            recordToUpdate.content = content;
          }
          if (importance && importance !== "中") {
            recordToUpdate.importance = importance;
          }
          if (context && context !== "") {
            recordToUpdate.context = context;
          }
          if (metadata && Object.keys(metadata).length > 0) {
            recordToUpdate.metadata = { ...recordToUpdate.metadata, ...metadata };
          }
          recordToUpdate.updatedAt = getCurrentTimestamp();
          topicDataForUpdate.updatedAt = getCurrentTimestamp();
          
          return {
            content: [
              { 
                type: "text", 
                text: `✅ 记录更新成功！

更新后信息:
- 记录ID: ${recordToUpdate.id}
- 内容: ${recordToUpdate.content}
- 重要性: ${recordToUpdate.importance}
- 上下文: ${recordToUpdate.context || '无'}
- 最后更新: ${recordToUpdate.updatedAt}

主题 "${topic}" 已同步更新。` 
              }
            ]
          };

        case "delete_topic":
          // 检查主题是否存在
          if (!memoryStore.has(topic)) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 主题 "${topic}" 不存在！` 
                }
              ]
            };
          }
          
          if (!confirm) {
            const topicData = memoryStore.get(topic);
            return {
              content: [
                { 
                  type: "text", 
                  text: `⚠️ 确认删除主题 "${topic}"？

主题信息:
- 描述: ${topicData.description || '无描述'}
- 标签: ${topicData.tags.join(', ') || '无标签'}
- 记录数量: ${topicData.records.length}条
- 创建时间: ${topicData.createdAt}

⚠️ 删除后将无法恢复！

如需确认删除，请设置 confirm: true。` 
                }
              ]
            };
          }
          
          const topicToDelete = memoryStore.get(topic);
          const recordCount = topicToDelete.records.length;
          
          // 删除主题
          memoryStore.delete(topic);
          updateStats('remove_topic', topic);
          
          return {
            content: [
              { 
                type: "text", 
                text: `✅ 主题 "${topic}" 删除成功！

已删除:
- 主题名称: ${topic}
- 记录数量: ${recordCount}条
- 主题描述: ${topicToDelete.description || '无描述'}

现在还有 ${memoryStore.size} 个主题。` 
              }
            ]
          };

        case "delete_record":
          if (!recordId) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 记录ID不能为空！` 
                }
              ]
            };
          }
          
          // 检查主题是否存在
          if (!memoryStore.has(topic)) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 主题 "${topic}" 不存在！` 
                }
              ]
            };
          }
          
          const topicDataForDelete = memoryStore.get(topic);
          const recordIndex = topicDataForDelete.records.findIndex(record => record.id === recordId);
          
          if (recordIndex === -1) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 在主题 "${topic}" 中未找到ID为 "${recordId}" 的记录！` 
                }
              ]
            };
          }
          
          const removedRecord = topicDataForDelete.records.splice(recordIndex, 1)[0];
          topicDataForDelete.updatedAt = getCurrentTimestamp();
          
          updateStats('remove_record', topic, removedRecord);
          
          return {
            content: [
              { 
                type: "text", 
                text: `✅ 记录删除成功！

已删除的记录信息:
- 主题: ${topic}
- 记录ID: ${removedRecord.id}
- 内容: ${removedRecord.content}
- 重要性: ${removedRecord.importance}

主题 "${topic}" 现在还有 ${topicDataForDelete.records.length} 条记录。` 
              }
            ]
          };

        default:
          return {
            content: [
              { 
                type: "text", 
                text: `❌ 不支持的操作类型: ${action}

💡 支持的操作类型:
- create_topic: 创建新主题（如"项目笔记"、"学习记录"）
- create_record: 在指定主题中添加新记录
- update_topic: 更新主题的描述和标签
- update_record: 修改指定记录的内容、重要性等
- delete_topic: 删除整个主题及其所有记录
- delete_record: 删除主题中的指定记录

🔧 使用建议：先创建主题，再添加记录，最后进行查询和管理。` 
              }
            ]
          };
      }
      
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `❌ 操作失败: ${error.message}` 
          }
        ]
      };
    }
  }
);

// 注册记忆查询工具 - 统一处理查询、搜索、列表操作
server.registerTool("memory_query",
  {
    title: "记忆查询",
    description: "统一处理记忆的查询、搜索、列表操作。支持按主题、关键词、重要性等维度查找记忆。",
    inputSchema: {
      action: z.enum(["list_topics", "view_topic", "search", "get_record"]).describe("查询类型：list_topics(列出所有主题)、view_topic(查看主题详情)、search(搜索记录)、get_record(获取单个记录)"),
      topic: z.string().default("").describe("主题名称：要查询或查看的主题，如'项目笔记'、'学习记录'等"),
      query: z.string().default("").describe("搜索关键词：在记录内容、上下文、元数据中搜索的关键词"),
      importance: z.enum(["全部", "低", "中", "高"]).default("全部").describe("重要性筛选：按记录重要性筛选结果，'全部'表示不筛选"),
      sortBy: z.enum(["时间", "重要性"]).default("时间").describe("排序方式：'时间'按创建时间排序，'重要性'按重要性等级排序"),
      limit: z.number().min(1).max(100).default(20).describe("结果数量限制：最多返回多少条结果，避免信息过多"),
      recordId: z.string().default("").describe("记录ID：获取特定记录时需要的唯一标识符")
    }
  },
  async ({ action, topic, query, importance, sortBy, limit, recordId }) => {
    try {
      switch (action) {
        case "list_topics":
          if (memoryStore.size === 0) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `📚 记忆主题列表

目前还没有创建任何主题。

💡 开始使用记忆系统：
1. 使用 memory_manage 工具，action: "create_topic" 创建第一个主题
2. 然后使用 action: "create_record" 添加记录到主题中

例如：创建"学习笔记"主题，然后添加各种学习内容。` 
                }
              ]
            };
          }
          
          let displayText = `📚 记忆主题列表 (共${memoryStore.size}个主题)\n`;
          
          for (const [topicName, topicData] of memoryStore.entries()) {
            displayText += `\n--- ${topicName} ---
📝 描述: ${topicData.description || '无描述'}
🏷️ 标签: ${topicData.tags.join(', ') || '无标签'}
📊 记录数: ${topicData.records.length}条
📅 创建时间: ${topicData.createdAt}
🔄 最后更新: ${topicData.updatedAt}\n`;
          }
          
          return {
            content: [
              { 
                type: "text", 
                text: displayText
              }
            ]
          };

        case "view_topic":
          if (!topic) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 主题名称不能为空！` 
                }
              ]
            };
          }
          
          // 检查主题是否存在
          if (!memoryStore.has(topic)) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 主题 "${topic}" 不存在！

请使用 action: "list_topics" 查看现有主题列表。` 
                }
              ]
            };
          }
          
          const topicData = memoryStore.get(topic);
          let records = [...topicData.records];
          
          // 排序记录
          if (sortBy === "时间") {
            records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (sortBy === "重要性") {
            const importanceOrder = { "高": 3, "中": 2, "低": 1 };
            records.sort((a, b) => importanceOrder[b.importance] - importanceOrder[a.importance]);
          }
          
          // 限制记录数量
          const displayRecords = records.slice(0, limit);
          
          // 格式化显示
          let topicDisplayText = `📚 主题: "${topic}"

📝 主题信息:
- 描述: ${topicData.description || '无描述'}
- 标签: ${topicData.tags.join(', ') || '无标签'}
- 总记录数: ${topicData.records.length}条
- 创建时间: ${topicData.createdAt}
- 最后更新: ${topicData.updatedAt}

📋 记忆记录 (显示前${displayRecords.length}条，按${sortBy}排序):\n`;

          if (displayRecords.length === 0) {
            topicDisplayText += "\n暂无记录。";
          } else {
            displayRecords.forEach((record, index) => {
              topicDisplayText += `\n--- 记录 ${index + 1} ---
🆔 ID: ${record.id}
⭐ 重要性: ${record.importance}
📅 创建时间: ${record.createdAt}
💭 内容: ${record.content}`;
              
              if (record.context) {
                topicDisplayText += `\n🔗 上下文: ${record.context}`;
              }
              
              if (Object.keys(record.metadata).length > 0) {
                topicDisplayText += `\n📊 元数据: ${JSON.stringify(record.metadata, null, 2)}`;
              }
              
              topicDisplayText += '\n';
            });
          }
          
          if (topicData.records.length > limit) {
            topicDisplayText += `\n... 还有 ${topicData.records.length - limit} 条记录未显示。`;
          }
          
          return {
            content: [
              { 
                type: "text", 
                text: topicDisplayText
              }
            ]
          };

        case "search":
          if (!query) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 搜索关键词不能为空！

💡 提示：请提供要搜索的关键词，系统会在所有记录的内容、上下文和元数据中查找匹配项。
例如：搜索"React"、"项目"、"学习"等关键词。` 
                }
              ]
            };
          }
          
          const results = [];
          
          // 搜索所有主题
          for (const [topicName, topicData] of memoryStore.entries()) {
            for (const record of topicData.records) {
              // 检查重要性筛选
              if (importance !== "全部" && record.importance !== importance) {
                continue;
              }
              
              // 检查内容匹配
              const contentMatch = record.content.toLowerCase().includes(query.toLowerCase());
              const contextMatch = record.context && record.context.toLowerCase().includes(query.toLowerCase());
              const metadataMatch = Object.values(record.metadata).some(value => 
                value.toLowerCase().includes(query.toLowerCase())
              );
              
              if (contentMatch || contextMatch || metadataMatch) {
                results.push({
                  topic: topicName,
                  record: record,
                  relevance: contentMatch ? 3 : (contextMatch ? 2 : 1) // 简单的相关性评分
                });
              }
            }
          }
          
          // 按相关性排序
          results.sort((a, b) => b.relevance - a.relevance);
          
          // 限制结果数量
          const displayResults = results.slice(0, limit);
          
          let searchDisplayText = `🔍 搜索记忆结果

🔎 搜索关键词: "${query}"
📊 重要性筛选: ${importance}
📈 找到 ${results.length} 条相关记录
📋 显示前 ${displayResults.length} 条:\n`;

          if (displayResults.length === 0) {
            searchDisplayText += "\n未找到相关记录。";
          } else {
            displayResults.forEach((result, index) => {
              searchDisplayText += `\n--- 结果 ${index + 1} ---
📚 主题: ${result.topic}
🆔 记录ID: ${result.record.id}
⭐ 重要性: ${result.record.importance}
📅 创建时间: ${result.record.createdAt}
💭 内容: ${result.record.content}`;
              
              if (result.record.context) {
                searchDisplayText += `\n🔗 上下文: ${result.record.context}`;
              }
              
              searchDisplayText += '\n';
            });
          }
          
          if (results.length > limit) {
            searchDisplayText += `\n... 还有 ${results.length - limit} 条结果未显示。`;
          }
          
          return {
            content: [
              { 
                type: "text", 
                text: searchDisplayText
              }
            ]
          };

        case "get_record":
          if (!recordId) {
            return {
              content: [
                { 
                  type: "text", 
                  text: `❌ 记录ID不能为空！` 
                }
              ]
            };
          }
          
          // 搜索所有主题中的记录
          for (const [topicName, topicData] of memoryStore.entries()) {
            const foundRecord = topicData.records.find(record => record.id === recordId);
            if (foundRecord) {
              return {
                content: [
                  { 
                    type: "text", 
                    text: `🔍 记录详情

🏷️ 记录ID: ${foundRecord.id}
📚 所在主题: ${topicName}
⭐ 重要性: ${foundRecord.importance}
📅 创建时间: ${foundRecord.createdAt}
🔄 更新时间: ${foundRecord.updatedAt || foundRecord.createdAt}
💭 内容: ${foundRecord.content}
${foundRecord.context ? `🔗 上下文: ${foundRecord.context}` : ''}
${Object.keys(foundRecord.metadata).length > 0 ? `📊 元数据: ${JSON.stringify(foundRecord.metadata, null, 2)}` : ''}` 
                  }
                ]
              };
            }
          }
          
          return {
            content: [
              { 
                type: "text", 
                text: `❌ 未找到ID为 "${recordId}" 的记录！` 
              }
            ]
          };

        default:
          return {
            content: [
              { 
                type: "text", 
                text: `❌ 不支持的查询类型: ${action}

💡 支持的查询类型:
- list_topics: 列出所有主题及其基本信息
- view_topic: 查看指定主题的详细内容和所有记录
- search: 在所有记录中搜索包含关键词的内容
- get_record: 根据记录ID获取特定记录的详细信息

🔧 使用建议：先用 list_topics 查看有哪些主题，再用 view_topic 查看具体主题内容，或用 search 搜索特定信息。` 
              }
            ]
          };
      }
      
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `❌ 查询失败: ${error.message}` 
          }
        ]
      };
    }
  }
);

// 注册记忆统计工具 - 统一处理统计信息
server.registerTool("memory_stats",
  {
    title: "记忆统计",
    description: "获取记忆系统的详细统计信息，包括主题数量、记录数量、内存占用、重要性分布等",
    inputSchema: {
      random_string: z.string().default("").describe("无需参数，直接调用即可获取统计信息")
    }
  },
  async ({ random_string }) => {
    try {
      const totalMemorySizeKB = (memoryStats.totalMemorySize / 1024).toFixed(2);
      const averageRecordSize = memoryStats.totalRecords > 0 ? 
        (memoryStats.totalMemorySize / memoryStats.totalRecords).toFixed(2) : 0;
      
      // 统计重要性分布
      const importanceStats = { "高": 0, "中": 0, "低": 0 };
      for (const topicData of memoryStore.values()) {
        for (const record of topicData.records) {
          importanceStats[record.importance]++;
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: `📊 记忆系统统计信息

📈 基本统计:
主题总数: ${memoryStats.totalTopics}个
记录总数: ${memoryStats.totalRecords}条
总内存占用: ${totalMemorySizeKB}KB
平均记录大小: ${averageRecordSize}字符

⭐ 重要性分布:
高重要性: ${importanceStats["高"]}条
中重要性: ${importanceStats["中"]}条
低重要性: ${importanceStats["低"]}条

🔄 使用统计:
最后访问时间: ${memoryStats.lastAccessTime || '从未访问'}
总访问次数: ${memoryStats.accessCount}次

💾 存储效率:
${memoryStats.totalRecords > 0 ? `平均每主题记录数: ${(memoryStats.totalRecords / memoryStats.totalTopics).toFixed(2)}条` : '暂无数据'}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `❌ 获取统计信息失败: ${error.message}` 
          }
        ]
      };
    }
  }
);

// 创建一个 StdioServerTransport 实例
const transport = new StdioServerTransport();

// 将 MCP 服务器连接到传输层
await server.connect(transport);
// 连接成功后打印日志，表示服务器已在运行
console.log("MCP上下文记忆服务已启动");