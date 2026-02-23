import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerSearchTools(server: McpServer, client: TrelloClient) {
  server.registerTool("search", {
    description: "Search Trello for cards, boards, or members. Default limit: 10 results.",
    inputSchema: {
      query: z.string().describe("Search query (supports Trello search operators like @member, #label, board:name, list:name, is:open, etc.)"),
      modelTypes: z.string().optional().describe("Comma-separated types to search: cards, boards, members, organizations (default: cards)"),
      boardId: z.string().optional().describe("Limit search to a specific board ID"),
      limit: z.number().optional().describe("Max results to return (default: 10)"),
    },
  }, async ({ query, modelTypes, boardId, limit }) => {
    const results = await client.search(query, { modelTypes, boardId, limit });
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  });
}
