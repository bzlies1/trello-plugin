import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerCardTools(server: McpServer, client: TrelloClient) {
  server.registerTool("get_cards_by_list", {
    description: "Get all cards in a list. Returns id, name, idShort, labels, due, dueComplete, idList, idMembers, shortUrl, closed by default. Use fields='all' to include desc and other heavy fields.",
    inputSchema: {
      listId: z.string().describe("List ID"),
      fields: z.string().optional().describe("Comma-separated fields. Use 'all' for full response including desc."),
    },
  }, async ({ listId, fields }) => {
    const cards = await client.getCardsByList(listId, fields);
    return { content: [{ type: "text", text: JSON.stringify(cards, null, 2) }] };
  });

  server.registerTool("get_card", {
    description: "Get details of a specific card. Smart defaults exclude desc for token efficiency — use fields='all' to include everything.",
    inputSchema: {
      cardId: z.string().describe("Card ID or shortLink"),
      fields: z.string().optional().describe("Comma-separated fields. Use 'all' for full response."),
    },
  }, async ({ cardId, fields }) => {
    const card = await client.getCard(cardId, fields);
    return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
  });

  server.registerTool("create_card", {
    description: "Create a new card in a list",
    inputSchema: {
      listId: z.string().describe("List ID to create the card in"),
      name: z.string().describe("Card title"),
      desc: z.string().optional().describe("Card description (markdown supported)"),
      due: z.string().optional().describe("Due date in ISO 8601 format (e.g. 2026-03-15T10:00:00.000Z)"),
      idLabels: z.string().optional().describe("Comma-separated label IDs to apply"),
      idMembers: z.string().optional().describe("Comma-separated member IDs to assign"),
      pos: z.string().optional().describe("Position: 'top', 'bottom', or a positive number"),
    },
  }, async ({ listId, name, desc, due, idLabels, idMembers, pos }) => {
    const card = await client.createCard(listId, { name, desc, due, idLabels, idMembers, pos });
    return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
  });

  server.registerTool("update_card", {
    description: "Update card properties (name, desc, due, closed, idList, idBoard, etc.)",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      name: z.string().optional().describe("New card title"),
      desc: z.string().optional().describe("New description"),
      due: z.string().optional().describe("New due date in ISO 8601 format"),
      dueComplete: z.boolean().optional().describe("Mark due date as complete"),
      closed: z.boolean().optional().describe("Archive the card"),
      idList: z.string().optional().describe("Move to this list ID"),
      idBoard: z.string().optional().describe("Move to this board ID"),
      idLabels: z.string().optional().describe("Comma-separated label IDs (replaces all)"),
      idMembers: z.string().optional().describe("Comma-separated member IDs (replaces all)"),
      pos: z.string().optional().describe("New position"),
    },
  }, async ({ cardId, ...updates }) => {
    // Filter out undefined values
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    const card = await client.updateCard(cardId, filtered);
    return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
  });

  server.registerTool("move_card", {
    description: "Move a card to a different list (and optionally a different board)",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      listId: z.string().describe("Target list ID"),
      boardId: z.string().optional().describe("Target board ID (for cross-board moves)"),
    },
  }, async ({ cardId, listId, boardId }) => {
    const card = await client.moveCard(cardId, listId, boardId);
    return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
  });

  server.registerTool("archive_card", {
    description: "Archive a card (sets closed to true)",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
    },
  }, async ({ cardId }) => {
    const card = await client.archiveCard(cardId);
    return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
  });

  server.registerTool("add_card_member", {
    description: "Assign a member to a card",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      memberId: z.string().describe("Member ID to assign"),
    },
  }, async ({ cardId, memberId }) => {
    const result = await client.addCardMember(cardId, memberId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  });

  server.registerTool("remove_card_member", {
    description: "Remove a member from a card",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      memberId: z.string().describe("Member ID to remove"),
    },
  }, async ({ cardId, memberId }) => {
    const result = await client.removeCardMember(cardId, memberId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  });
}
