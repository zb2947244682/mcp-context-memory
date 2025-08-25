import { z } from "zod";
import { memoryStore } from "../store.js";
import { updateStats } from "../stats.js";
import { generateId, getCurrentTimestamp } from "../utils.js";

export function registerMemoryManage(server) {
  server.registerTool(
    "memory_manage",
    {
      title: "记忆管理",
      description:
        "统一管理记忆主题和记录的创建、更新、删除操作。先创建主题，再添加记录。",
      inputSchema: {
        action: z
          .enum([
            "create_topic",
            "create_record",
            "update_topic",
            "update_record",
            "delete_topic",
            "delete_record"
          ])
          .describe(
            "操作类型：create_topic(创建主题)、create_record(添加记录)、update_topic(更新主题)、update_record(更新记录)、delete_topic(删除主题)、delete_record(删除记录)"
          ),
        topic: z
          .string()
          .min(1, "主题名称不能为空")
          .max(100, "主题名称不能超过100个字符")
          .describe("主题名称：用于组织相关记忆的类别，如'项目笔记'、'学习记录'等"),
        description: z.string().default("").describe("主题描述：可选，描述这个主题的用途和内容"),
        tags: z.array(z.string()).default([]).describe("主题标签：可选，用于分类和搜索，如['技术', '前端', 'React']"),
        content: z.string().default("").describe("记录内容：要保存的具体信息内容，必填项"),
        importance: z
          .enum(["低", "中", "高"]) 
          .default("中")
          .describe("记录重要性：低(日常信息)、中(重要信息)、高(关键信息)"),
        context: z.string().default("").describe("记录上下文：可选，记录相关的背景信息或来源"),
        metadata: z.record(z.any()).default({}).describe("额外元数据：可选，存储额外的结构化信息"),
        recordId: z.string().default("").describe("记录ID：更新或删除记录时需要的唯一标识符"),
        confirm: z.boolean().default(false).describe("删除确认：删除主题时必须设为true以确认操作")
      }
    },
    async ({
      action,
      topic,
      description,
      tags,
      content,
      importance,
      context,
      metadata,
      recordId,
      confirm
    }) => {
      try {
        switch (action) {
          case "create_topic": {
            if (memoryStore.has(topic)) {
              return {
                content: [
                  {
                    type: "text",
                    text: `⚠️ 主题 "${topic}" 已存在，无法重复创建。\n\n现有主题信息:\n- 描述: ${
                      memoryStore.get(topic).description || "无描述"
                    }\n- 标签: ${
                      memoryStore.get(topic).tags.join(", ") || "无标签"
                    }\n- 记录数量: ${
                      memoryStore.get(topic).records.length
                    }条\n\n如需添加记录到此主题，请使用 action: "create_record"。`
                  }
                ]
              };
            }
            const newTopic = {
              id: generateId(),
              name: topic,
              description,
              tags,
              records: [],
              createdAt: getCurrentTimestamp(),
              updatedAt: getCurrentTimestamp()
            };
            memoryStore.set(topic, newTopic);
            updateStats("add_topic");
            return {
              content: [
                {
                  type: "text",
                  text: `✅ 主题 "${topic}" 创建成功！\n\n主题信息:\n- ID: ${
                    newTopic.id
                  }\n- 描述: ${description || "无描述"}\n- 标签: ${
                    tags.join(", ") || "无标签"
                  }\n- 创建时间: ${newTopic.createdAt}\n- 当前记录数: 0条`
                }
              ]
            };
          }
          case "create_record": {
            if (!content) {
              return {
                content: [
                  {
                    type: "text",
                    text: `❌ 记录内容不能为空！\n\n💡 提示：记录内容是必填项，请提供要保存的具体信息内容。\n例如：项目进展、学习笔记、重要决策等。`
                  }
                ]
              };
            }
            if (!memoryStore.has(topic)) {
              return {
                content: [
                  {
                    type: "text",
                    text: `❌ 主题 "${topic}" 不存在！\n\n💡 解决步骤：\n1. 先使用 action: "create_topic" 创建主题 "${topic}"\n2. 然后使用 action: "create_record" 添加记录到该主题\n\n或者使用 memory_query 工具的 action: "list_topics" 查看现有主题列表。`
                  }
                ]
              };
            }
            const newRecord = {
              id: generateId(),
              content,
              importance,
              context,
              metadata,
              createdAt: getCurrentTimestamp(),
              updatedAt: getCurrentTimestamp()
            };
            const topicDataForRecord = memoryStore.get(topic);
            topicDataForRecord.records.push(newRecord);
            topicDataForRecord.updatedAt = getCurrentTimestamp();
            updateStats("add_record", topic, newRecord);
            return {
              content: [
                {
                  type: "text",
                  text: `✅ 记录已成功添加到主题 "${topic}"！\n\n记录信息:\n- ID: ${
                    newRecord.id
                  }\n- 重要性: ${importance}\n- 内容: ${content}\n- 上下文: ${
                    context || "无"
                  }\n- 创建时间: ${newRecord.createdAt}\n\n主题 "${topic}" 当前共有 ${
                    topicDataForRecord.records.length
                  } 条记录。`
                }
              ]
            };
          }
          case "update_topic": {
            if (!memoryStore.has(topic)) {
              return {
                content: [
                  { type: "text", text: `❌ 主题 "${topic}" 不存在！\n\n请使用 action: "list_topics" 查看现有主题列表。` }
                ]
              };
            }
            const topicToUpdate = memoryStore.get(topic);
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
                  text: `✅ 主题 "${topic}" 更新成功！\n\n更新后信息:\n- 描述: ${
                    topicToUpdate.description || "无描述"
                  }\n- 标签: ${
                    topicToUpdate.tags.join(", ") || "无标签"
                  }\n- 记录数量: ${
                    topicToUpdate.records.length
                  }条\n- 最后更新: ${topicToUpdate.updatedAt}`
                }
              ]
            };
          }
          case "update_record": {
            if (!recordId) {
              return { content: [{ type: "text", text: "❌ 记录ID不能为空！" }] };
            }
            if (!memoryStore.has(topic)) {
              return { content: [{ type: "text", text: `❌ 主题 "${topic}" 不存在！` }] };
            }
            const topicDataForUpdate = memoryStore.get(topic);
            const recordToUpdate = topicDataForUpdate.records.find(
              (record) => record.id === recordId
            );
            if (!recordToUpdate) {
              return {
                content: [
                  { type: "text", text: `❌ 在主题 "${topic}" 中未找到ID为 "${recordId}" 的记录！` }
                ]
              };
            }
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
                  text: `✅ 记录更新成功！\n\n更新后信息:\n- 记录ID: ${
                    recordToUpdate.id
                  }\n- 内容: ${recordToUpdate.content}\n- 重要性: ${
                    recordToUpdate.importance
                  }\n- 上下文: ${recordToUpdate.context || "无"}\n- 最后更新: ${
                    recordToUpdate.updatedAt
                  }\n\n主题 "${topic}" 已同步更新。`
                }
              ]
            };
          }
          case "delete_topic": {
            if (!memoryStore.has(topic)) {
              return { content: [{ type: "text", text: `❌ 主题 "${topic}" 不存在！` }] };
            }
            if (!confirm) {
              const topicData = memoryStore.get(topic);
              return {
                content: [
                  {
                    type: "text",
                    text: `⚠️ 确认删除主题 "${topic}"？\n\n主题信息:\n- 描述: ${
                      topicData.description || "无描述"
                    }\n- 标签: ${
                      topicData.tags.join(", ") || "无标签"
                    }\n- 记录数量: ${
                      topicData.records.length
                    }条\n- 创建时间: ${topicData.createdAt}\n\n⚠️ 删除后将无法恢复！\n\n如需确认删除，请设置 confirm: true。`
                  }
                ]
              };
            }
            const topicToDelete = memoryStore.get(topic);
            const recordCount = topicToDelete.records.length;
            memoryStore.delete(topic);
            updateStats("remove_topic", topic);
            return {
              content: [
                {
                  type: "text",
                  text: `✅ 主题 "${topic}" 删除成功！\n\n已删除:\n- 主题名称: ${
                    topic
                  }\n- 记录数量: ${recordCount}条\n- 主题描述: ${
                    topicToDelete.description || "无描述"
                  }\n\n现在还有 ${memoryStore.size} 个主题。`
                }
              ]
            };
          }
          case "delete_record": {
            if (!recordId) {
              return { content: [{ type: "text", text: "❌ 记录ID不能为空！" }] };
            }
            if (!memoryStore.has(topic)) {
              return { content: [{ type: "text", text: `❌ 主题 "${topic}" 不存在！` }] };
            }
            const topicDataForDelete = memoryStore.get(topic);
            const recordIndex = topicDataForDelete.records.findIndex(
              (record) => record.id === recordId
            );
            if (recordIndex === -1) {
              return {
                content: [
                  { type: "text", text: `❌ 在主题 "${topic}" 中未找到ID为 "${recordId}" 的记录！` }
                ]
              };
            }
            const removedRecord = topicDataForDelete.records.splice(recordIndex, 1)[0];
            topicDataForDelete.updatedAt = getCurrentTimestamp();
            updateStats("remove_record", topic, removedRecord);
            return {
              content: [
                {
                  type: "text",
                  text: `✅ 记录删除成功！\n\n已删除的记录信息:\n- 主题: ${
                    topic
                  }\n- 记录ID: ${removedRecord.id}\n- 内容: ${
                    removedRecord.content
                  }\n- 重要性: ${removedRecord.importance}\n\n主题 "${topic}" 现在还有 ${
                    topicDataForDelete.records.length
                  } 条记录。`
                }
              ]
            };
          }
          default:
            return {
              content: [
                {
                  type: "text",
                  text: `❌ 不支持的操作类型: ${action}\n\n💡 支持的操作类型:\n- create_topic: 创建新主题（如"项目笔记"、"学习记录"）\n- create_record: 在指定主题中添加新记录\n- update_topic: 更新主题的描述和标签\n- update_record: 修改指定记录的内容、重要性等\n- delete_topic: 删除整个主题及其所有记录\n- delete_record: 删除主题中的指定记录\n\n🔧 使用建议：先创建主题，再添加记录，最后进行查询和管理。`
                }
              ]
            };
        }
      } catch (error) {
        return { content: [{ type: "text", text: `❌ 操作失败: ${error.message}` }] };
      }
    }
  );
}

