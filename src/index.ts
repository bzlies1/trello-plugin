#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TrelloClient } from "./trello-client.js";
import { registerBoardTools } from "./tools/boards.js";
import { registerListTools } from "./tools/lists.js";
import { registerCardTools } from "./tools/cards.js";
import { registerChecklistTools } from "./tools/checklists.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerAttachmentTools } from "./tools/attachments.js";
import { registerLabelTools } from "./tools/labels.js";
import { registerCustomFieldTools } from "./tools/custom-fields.js";
import { registerSearchTools } from "./tools/search.js";

const apiKey = process.env.TRELLO_API_KEY;
const token = process.env.TRELLO_TOKEN;

if (!apiKey || !token) {
  console.error("Missing TRELLO_API_KEY or TRELLO_TOKEN environment variables.");
  process.exit(1);
}

const client = new TrelloClient(apiKey, token);

const server = new McpServer({
  name: "trello",
  version: "1.0.0",
});

registerBoardTools(server, client);
registerListTools(server, client);
registerCardTools(server, client);
registerChecklistTools(server, client);
registerCommentTools(server, client);
registerAttachmentTools(server, client);
registerLabelTools(server, client);
registerCustomFieldTools(server, client);
registerSearchTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
