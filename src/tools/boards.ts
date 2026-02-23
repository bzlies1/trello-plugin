import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerBoardTools(server: McpServer, client: TrelloClient) {
  server.registerTool("list_workspaces", {
    description: "List all Trello workspaces (organizations) you belong to",
  }, async () => {
    const workspaces = await client.getWorkspaces();
    return { content: [{ type: "text", text: JSON.stringify(workspaces, null, 2) }] };
  });

  server.registerTool("list_boards", {
    description: "List boards. Optionally filter by workspace. Returns id, name, desc, url by default.",
    inputSchema: {
      workspaceId: z.string().optional().describe("Workspace/organization ID to filter boards. Omit for all boards."),
      fields: z.string().optional().describe("Comma-separated fields to return. Use 'all' for full response. Default: id,name,desc,url,shortUrl,closed"),
    },
  }, async ({ workspaceId, fields }) => {
    const boards = await client.getBoards(workspaceId, fields);
    return { content: [{ type: "text", text: JSON.stringify(boards, null, 2) }] };
  });

  server.registerTool("get_board", {
    description: "Get details of a specific board",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
      fields: z.string().optional().describe("Comma-separated fields. Use 'all' for full response. Default: id,name,desc,url,shortUrl,closed"),
    },
  }, async ({ boardId, fields }) => {
    const board = await client.getBoard(boardId, fields);
    return { content: [{ type: "text", text: JSON.stringify(board, null, 2) }] };
  });

  server.registerTool("get_board_members", {
    description: "List all members of a board. Returns id, fullName, username by default.",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
    },
  }, async ({ boardId }) => {
    const members = await client.getBoardMembers(boardId);
    return { content: [{ type: "text", text: JSON.stringify(members, null, 2) }] };
  });

  server.registerTool("get_board_activity", {
    description: "Get recent activity/actions on a board. Default limit: 10.",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
      limit: z.number().optional().describe("Number of actions to return (default: 10)"),
    },
  }, async ({ boardId, limit }) => {
    const activity = await client.getBoardActivity(boardId, limit);
    return { content: [{ type: "text", text: JSON.stringify(activity, null, 2) }] };
  });
}
