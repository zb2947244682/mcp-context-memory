import { z } from "zod";
import { memoryStats } from "../stats.js";
import { memoryStore } from "../store.js";

export function registerMemoryStats(server) {
  server.registerTool(
    "memory_stats",
    {
      title: "记忆统计",
      description:
        "获取记忆系统的详细统计信息，包括主题数量、记录数量、内存占用、重要性分布等",
      inputSchema: {
        random_string: z
          .string()
          .default("")
          .describe("无需参数，直接调用即可获取统计信息")
      }
    },
    async ({ random_string }) => {
      try {
        const totalMemorySizeKB = (memoryStats.totalMemorySize / 1024).toFixed(2);
        const averageRecordSize =
          memoryStats.totalRecords > 0
            ? (memoryStats.totalMemorySize / memoryStats.totalRecords).toFixed(2)
            : 0;

        const importanceStats = { 高: 0, 中: 0, 低: 0 };
        for (const topicData of memoryStore.values()) {
          for (const record of topicData.records) {
            importanceStats[record.importance]++;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `📊 记忆系统统计信息\n\n📈 基本统计:\n主题总数: ${
                memoryStats.totalTopics
              }个\n记录总数: ${
                memoryStats.totalRecords
              }条\n总内存占用: ${totalMemorySizeKB}KB\n平均记录大小: ${averageRecordSize}字符\n\n⭐ 重要性分布:\n高重要性: ${
                importanceStats["高"]
              }条\n中重要性: ${
                importanceStats["中"]
              }条\n低重要性: ${
                importanceStats["低"]
              }条\n\n🔄 使用统计:\n最后访问时间: ${
                memoryStats.lastAccessTime || "从未访问"
              }\n总访问次数: ${
                memoryStats.accessCount
              }次\n\n💾 存储效率:\n$${
                memoryStats.totalRecords > 0
                  ? `平均每主题记录数: ${(memoryStats.totalRecords / memoryStats.totalTopics).toFixed(2)}条`
                  : "暂无数据"
              }`
            }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ 获取统计信息失败: ${error.message}` }]
        };
      }
    }
  );
}


