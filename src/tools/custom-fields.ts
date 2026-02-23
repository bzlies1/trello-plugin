import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TrelloClient } from "../trello-client.js";

export function registerCustomFieldTools(server: McpServer, client: TrelloClient) {
  server.registerTool("get_custom_fields", {
    description: "Get custom field definitions on a board (field names, types, options)",
    inputSchema: {
      boardId: z.string().describe("Board ID"),
    },
  }, async ({ boardId }) => {
    const fields = await client.getCustomFields(boardId);
    return { content: [{ type: "text", text: JSON.stringify(fields, null, 2) }] };
  });

  server.registerTool("get_card_custom_field_values", {
    description: "Get custom field values set on a specific card",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
    },
  }, async ({ cardId }) => {
    const values = await client.getCardCustomFieldValues(cardId);
    return { content: [{ type: "text", text: JSON.stringify(values, null, 2) }] };
  });

  server.registerTool("set_card_custom_field_value", {
    description: "Set a custom field value on a card. The value format depends on the field type: text={text:'...'}, number={number:'...'}, date={date:'...'}, checkbox={checked:'true'/'false'}, list={idValue:'...'}",
    inputSchema: {
      cardId: z.string().describe("Card ID"),
      customFieldId: z.string().describe("Custom field ID (get from get_custom_fields)"),
      value: z.string().describe("Value as JSON string, e.g. '{\"text\":\"hello\"}' or '{\"number\":\"42\"}' or '{\"checked\":\"true\"}'"),
    },
  }, async ({ cardId, customFieldId, value }) => {
    const parsed = JSON.parse(value);
    const result = await client.setCardCustomFieldValue(cardId, customFieldId, parsed);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  });
}
