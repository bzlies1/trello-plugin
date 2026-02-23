import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerLabelTools(server: McpServer, client: TrelloClient) {
  server.registerTool("get_board_labels", {
    description: "Get all labels defined on a board",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
    },
  }, async ({ boardId }) => {
    const labels = await client.getBoardLabels(boardId);
    return { content: [{ type: "text", text: JSON.stringify(labels, null, 2) }] };
  });

  server.registerTool("create_label", {
    description: "Create a new label on a board",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
      name: z.string().describe("Label name"),
      color: z.enum(["green", "yellow", "orange", "red", "purple", "blue", "sky", "lime", "pink", "black", "null"]).describe("Label color"),
    },
  }, async ({ boardId, name, color }) => {
    const label = await client.createLabel(boardId, name, color === "null" ? "" : color);
    return { content: [{ type: "text", text: JSON.stringify(label, null, 2) }] };
  });

  server.registerTool("update_label", {
    description: "Update a label's name or color",
    inputSchema: {
      labelId: z.string().describe("Label ID"),
      name: z.string().optional().describe("New name"),
      color: z.enum(["green", "yellow", "orange", "red", "purple", "blue", "sky", "lime", "pink", "black", "null"]).optional().describe("New color"),
    },
  }, async ({ labelId, name, color }) => {
    const updates: { name?: string; color?: string } = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color === "null" ? "" : color;
    const label = await client.updateLabel(labelId, updates);
    return { content: [{ type: "text", text: JSON.stringify(label, null, 2) }] };
  });

  server.registerTool("delete_label", {
    description: "Delete a label from a board",
    inputSchema: {
      labelId: z.string().describe("Label ID"),
    },
  }, async ({ labelId }) => {
    await client.deleteLabel(labelId);
    return { content: [{ type: "text", text: "Label deleted." }] };
  });
}
