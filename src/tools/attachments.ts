import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerAttachmentTools(server: McpServer, client: TrelloClient) {
  server.registerTool("get_attachments", {
    description: "List all attachments on a card",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
    },
  }, async ({ cardId }) => {
    const attachments = await client.getAttachments(cardId);
    return { content: [{ type: "text", text: JSON.stringify(attachments, null, 2) }] };
  });

  server.registerTool("add_attachment", {
    description: "Attach a URL to a card (links, images, files)",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      url: z.string().describe("URL to attach"),
      name: z.string().optional().describe("Display name for the attachment"),
    },
  }, async ({ cardId, url, name }) => {
    const attachment = await client.addAttachment(cardId, url, name);
    return { content: [{ type: "text", text: JSON.stringify(attachment, null, 2) }] };
  });
}
