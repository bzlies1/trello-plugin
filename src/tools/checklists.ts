import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerChecklistTools(server: McpServer, client: TrelloClient) {
  server.registerTool("get_checklists", {
    description: "Get all checklists on a card, including their items and completion status",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
    },
  }, async ({ cardId }) => {
    const checklists = await client.getChecklists(cardId);
    return { content: [{ type: "text", text: JSON.stringify(checklists, null, 2) }] };
  });

  server.registerTool("create_checklist", {
    description: "Create a new checklist on a card",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      name: z.string().describe("Checklist name"),
    },
  }, async ({ cardId, name }) => {
    const checklist = await client.createChecklist(cardId, name);
    return { content: [{ type: "text", text: JSON.stringify(checklist, null, 2) }] };
  });

  server.registerTool("delete_checklist", {
    description: "Delete a checklist from a card",
    inputSchema: {
      checklistId: z.string().describe("Checklist ID"),
    },
  }, async ({ checklistId }) => {
    await client.deleteChecklist(checklistId);
    return { content: [{ type: "text", text: "Checklist deleted." }] };
  });

  server.registerTool("add_checklist_item", {
    description: "Add a new item to an existing checklist",
    inputSchema: {
      checklistId: z.string().describe("Checklist ID"),
      name: z.string().describe("Item text"),
      pos: z.string().optional().describe("Position: 'top', 'bottom', or a positive number"),
    },
  }, async ({ checklistId, name, pos }) => {
    const item = await client.addChecklistItem(checklistId, name, pos);
    return { content: [{ type: "text", text: JSON.stringify(item, null, 2) }] };
  });

  server.registerTool("update_checklist_item", {
    description: "Update a checklist item — toggle completion or rename",
    inputSchema: {
      cardId: z.string().describe("Card ID the checklist belongs to"),
      checkItemId: z.string().describe("Checklist item ID"),
      state: z.enum(["complete", "incomplete"]).optional().describe("Set completion state"),
      name: z.string().optional().describe("New item text"),
    },
  }, async ({ cardId, checkItemId, state, name }) => {
    const item = await client.updateChecklistItem(cardId, checkItemId, { state, name });
    return { content: [{ type: "text", text: JSON.stringify(item, null, 2) }] };
  });
}
