#!/usr/bin/env node
/**
 * MCP-Context-Memory 上下文记忆服务器（模块化）
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerMemoryManage } from "./src/tools/memoryManage.js";
import { registerMemoryQuery } from "./src/tools/memoryQuery.js";
import { registerMemoryStats } from "./src/tools/memoryStats.js";

const server = new McpServer({
  name: "context-memory-server",
  version: "1.0.0"
});

// 注册工具
registerMemoryManage(server);
registerMemoryQuery(server);
registerMemoryStats(server);

// 连接传输层
const transport = new StdioServerTransport();
await server.connect(transport);
//console.log("MCP上下文记忆服务已启动");

