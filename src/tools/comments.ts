import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerCommentTools(server: McpServer, client: TrelloClient) {
  server.registerTool("get_card_comments", {
    description: "Get comments on a card. Default limit: 10.",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      limit: z.number().optional().describe("Number of comments to return (default: 10)"),
    },
  }, async ({ cardId, limit }) => {
    const comments = await client.getCardComments(cardId, limit);
    return { content: [{ type: "text", text: JSON.stringify(comments, null, 2) }] };
  });

  server.registerTool("add_comment", {
    description: "Add a comment to a card",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      text: z.string().describe("Comment text (markdown supported)"),
    },
  }, async ({ cardId, text }) => {
    const comment = await client.addComment(cardId, text);
    return { content: [{ type: "text", text: JSON.stringify(comment, null, 2) }] };
  });

  server.registerTool("delete_comment", {
    description: "Delete a comment from a card",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      commentId: z.string().describe("Comment action ID"),
    },
  }, async ({ cardId, commentId }) => {
    await client.deleteComment(cardId, commentId);
    return { content: [{ type: "text", text: "Comment deleted." }] };
  });
}
