import { z } from "zod";
import { memoryStore } from "../store.js";

export function registerMemoryQuery(server) {
  server.registerTool(
    "memory_query",
    {
      title: "记忆查询",
      description:
        "统一处理记忆的查询、搜索、列表操作。支持按主题、关键词、重要性等维度查找记忆。",
      inputSchema: {
        action: z
          .enum(["list_topics", "view_topic", "search", "get_record"])
          .describe(
            "查询类型：list_topics(列出所有主题)、view_topic(查看主题详情)、search(搜索记录)、get_record(获取单个记录)"
          ),
        topic: z.string().default("").describe("主题名称：要查询或查看的主题，如'项目笔记'、'学习记录'等"),
        query: z.string().default("").describe("搜索关键词：在记录内容、上下文、元数据中搜索的关键词"),
        importance: z
          .enum(["全部", "低", "中", "高"]) 
          .default("全部")
          .describe("重要性筛选：按记录重要性筛选结果，'全部'表示不筛选"),
        sortBy: z
          .enum(["时间", "重要性"]) 
          .default("时间")
          .describe("排序方式：'时间'按创建时间排序，'重要性'按重要性等级排序"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe("结果数量限制：最多返回多少条结果，避免信息过多"),
        recordId: z.string().default("").describe("记录ID：获取特定记录时需要的唯一标识符")
      }
    },
    async ({ action, topic, query, importance, sortBy, limit, recordId }) => {
      try {
        switch (action) {
          case "list_topics": {
            if (memoryStore.size === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `📚 记忆主题列表\n\n目前还没有创建任何主题。\n\n💡 开始使用记忆系统：\n1. 使用 memory_manage 工具，action: "create_topic" 创建第一个主题\n2. 然后使用 action: "create_record" 添加记录到主题中\n\n例如：创建"学习笔记"主题，然后添加各种学习内容。`
                  }
                ]
              };
            }
            let displayText = `📚 记忆主题列表 (共${memoryStore.size}个主题)\n`;
            for (const [topicName, topicData] of memoryStore.entries()) {
              displayText += `\n--- ${topicName} ---\n📝 描述: ${
                topicData.description || "无描述"
              }\n🏷️ 标签: ${
                topicData.tags.join(", ") || "无标签"
              }\n📊 记录数: ${
                topicData.records.length
              }条\n📅 创建时间: ${topicData.createdAt}\n🔄 最后更新: ${topicData.updatedAt}\n`;
            }
            return { content: [{ type: "text", text: displayText }] };
          }
          case "view_topic": {
            if (!topic) {
              return { content: [{ type: "text", text: "❌ 主题名称不能为空！" }] };
            }
            if (!memoryStore.has(topic)) {
              return {
                content: [
                  { type: "text", text: `❌ 主题 "${topic}" 不存在！\n\n请使用 action: "list_topics" 查看现有主题列表。` }
                ]
              };
            }
            const topicData = memoryStore.get(topic);
            let records = [...topicData.records];
            if (sortBy === "时间") {
              records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } else if (sortBy === "重要性") {
              const importanceOrder = { 高: 3, 中: 2, 低: 1 };
              records.sort((a, b) => importanceOrder[b.importance] - importanceOrder[a.importance]);
            }
            const displayRecords = records.slice(0, limit);
            let topicDisplayText = `📚 主题: "${topic}"\n\n📝 主题信息:\n- 描述: ${
              topicData.description || "无描述"
            }\n- 标签: ${
              topicData.tags.join(", ") || "无标签"
            }\n- 总记录数: ${
              topicData.records.length
            }条\n- 创建时间: ${topicData.createdAt}\n- 最后更新: ${
              topicData.updatedAt
            }\n\n📋 记忆记录 (显示前${displayRecords.length}条，按${sortBy}排序):\n`;
            if (displayRecords.length === 0) {
              topicDisplayText += "\n暂无记录。";
            } else {
              displayRecords.forEach((record, index) => {
                topicDisplayText += `\n--- 记录 ${index + 1} ---\n🆔 ID: ${
                  record.id
                }\n⭐ 重要性: ${record.importance}\n📅 创建时间: ${
                  record.createdAt
                }\n💭 内容: ${record.content}`;
                if (record.context) {
                  topicDisplayText += `\n🔗 上下文: ${record.context}`;
                }
                if (Object.keys(record.metadata).length > 0) {
                  topicDisplayText += `\n📊 元数据: ${JSON.stringify(
                    record.metadata,
                    null,
                    2
                  )}`;
                }
                topicDisplayText += "\n";
              });
            }
            if (topicData.records.length > limit) {
              topicDisplayText += `\n... 还有 ${
                topicData.records.length - limit
              } 条记录未显示。`;
            }
            return { content: [{ type: "text", text: topicDisplayText }] };
          }
          case "search": {
            if (!query) {
              return {
                content: [
                  {
                    type: "text",
                    text: `❌ 搜索关键词不能为空！\n\n💡 提示：请提供要搜索的关键词，系统会在所有记录的内容、上下文和元数据中查找匹配项。\n例如：搜索"React"、"项目"、"学习"等关键词。`
                  }
                ]
              };
            }
            const results = [];
            for (const [topicName, topicData] of memoryStore.entries()) {
              for (const record of topicData.records) {
                if (importance !== "全部" && record.importance !== importance) {
                  continue;
                }
                const contentMatch = record.content
                  .toLowerCase()
                  .includes(query.toLowerCase());
                const contextMatch =
                  record.context &&
                  record.context.toLowerCase().includes(query.toLowerCase());
                const metadataMatch = Object.values(record.metadata).some((value) =>
                  String(value).toLowerCase().includes(query.toLowerCase())
                );
                if (contentMatch || contextMatch || metadataMatch) {
                  results.push({
                    topic: topicName,
                    record,
                    relevance: contentMatch ? 3 : contextMatch ? 2 : 1
                  });
                }
              }
            }
            results.sort((a, b) => b.relevance - a.relevance);
            const displayResults = results.slice(0, limit);
            let searchDisplayText = `🔍 搜索记忆结果\n\n🔎 搜索关键词: "${query}"\n📊 重要性筛选: ${
              importance
            }\n📈 找到 ${results.length} 条相关记录\n📋 显示前 ${displayResults.length} 条:\n`;
            if (displayResults.length === 0) {
              searchDisplayText += "\n未找到相关记录。";
            } else {
              displayResults.forEach((result, index) => {
                searchDisplayText += `\n--- 结果 ${index + 1} ---\n📚 主题: ${
                  result.topic
                }\n🆔 记录ID: ${result.record.id}\n⭐ 重要性: ${
                  result.record.importance
                }\n📅 创建时间: ${result.record.createdAt}\n💭 内容: ${
                  result.record.content
                }`;
                if (result.record.context) {
                  searchDisplayText += `\n🔗 上下文: ${result.record.context}`;
                }
                searchDisplayText += "\n";
              });
            }
            if (results.length > limit) {
              searchDisplayText += `\n... 还有 ${
                results.length - limit
              } 条结果未显示。`;
            }
            return { content: [{ type: "text", text: searchDisplayText }] };
          }
          case "get_record": {
            if (!recordId) {
              return { content: [{ type: "text", text: "❌ 记录ID不能为空！" }] };
            }
            for (const [topicName, topicData] of memoryStore.entries()) {
              const foundRecord = topicData.records.find((record) => record.id === recordId);
              if (foundRecord) {
                return {
                  content: [
                    {
                      type: "text",
                      text: `🔍 记录详情\n\n🏷️ 记录ID: ${
                        foundRecord.id
                      }\n📚 所在主题: ${topicName}\n⭐ 重要性: ${
                        foundRecord.importance
                      }\n📅 创建时间: ${foundRecord.createdAt}\n🔄 更新时间: ${
                        foundRecord.updatedAt || foundRecord.createdAt
                      }\n💭 内容: ${foundRecord.content}\n${
                        foundRecord.context ? `🔗 上下文: ${foundRecord.context}` : ""
                      }\n${
                        Object.keys(foundRecord.metadata).length > 0
                          ? `📊 元数据: ${JSON.stringify(foundRecord.metadata, null, 2)}`
                          : ""
                      }`
                    }
                  ]
                };
              }
            }
            return { content: [{ type: "text", text: `❌ 未找到ID为 "${recordId}" 的记录！` }] };
          }
          default:
            return {
              content: [
                {
                  type: "text",
                  text: `❌ 不支持的查询类型: ${action}\n\n💡 支持的查询类型:\n- list_topics: 列出所有主题及其基本信息\n- view_topic: 查看指定主题的详细内容和所有记录\n- search: 在所有记录中搜索包含关键词的内容\n- get_record: 根据记录ID获取特定记录的详细信息\n\n🔧 使用建议：先用 list_topics 查看有哪些主题，再用 view_topic 查看具体主题内容，或用 search 搜索特定信息。`
                }
              ]
            };
        }
      } catch (error) {
        return { content: [{ type: "text", text: `❌ 查询失败: ${error.message}` }] };
      }
    }
  );
}


