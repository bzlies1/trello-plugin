import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerListTools(server: McpServer, client: TrelloClient) {
  server.registerTool("get_lists", {
    description: "Get all lists on a board. Returns id, name, closed, pos by default.",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
      fields: z.string().optional().describe("Comma-separated fields. Use 'all' for full response. Default: id,name,closed,pos"),
    },
  }, async ({ boardId, fields }) => {
    const lists = await client.getLists(boardId, fields);
    return { content: [{ type: "text", text: JSON.stringify(lists, null, 2) }] };
  });

  server.registerTool("create_list", {
    description: "Create a new list on a board",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
      name: z.string().describe("Name for the new list"),
      pos: z.string().optional().describe("Position: 'top', 'bottom', or a positive number"),
    },
  }, async ({ boardId, name, pos }) => {
    const list = await client.createList(boardId, name, pos);
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  });

  server.registerTool("update_list", {
    description: "Update a list's name, position, or closed status",
    inputSchema: {
      listId: z.string().describe("List ID"),
      name: z.string().optional().describe("New name"),
      pos: z.string().optional().describe("New position: 'top', 'bottom', or a positive number"),
      closed: z.boolean().optional().describe("Set to true to archive"),
    },
  }, async ({ listId, name, pos, closed }) => {
    const list = await client.updateList(listId, { name, pos, closed });
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  });

  server.registerTool("archive_list", {
    description: "Archive a list (sets closed to true)",
    inputSchema: {
      listId: z.string().describe("List ID"),
    },
  }, async ({ listId }) => {
    const list = await client.archiveList(listId);
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  });
}
