# Trello Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a token-efficient Claude Code plugin for Trello with 35 MCP tools and 4 slash commands.

**Architecture:** Monolithic MCP server using `@modelcontextprotocol/sdk` with stdio transport. Single `TrelloClient` class wraps all Trello REST API calls with smart default field filtering. Tools organized by domain in separate files, registered in a central server entry point.

**Tech Stack:** Node.js, TypeScript, `@modelcontextprotocol/sdk`, `zod`, `axios` (HTTP client)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.claude-plugin/plugin.json`
- Create: `.mcp.json`

**Step 1: Create package.json**

```json
{
  "name": "trello-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "trello-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.7.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "~5.9.3",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**Step 3: Create .claude-plugin/plugin.json**

```json
{
  "name": "trello",
  "version": "1.0.0",
  "description": "Token-efficient Trello management for Claude Code. 35 MCP tools covering boards, lists, cards, checklists, comments, attachments, labels, custom fields, and search — all with smart field filtering to minimize token usage.",
  "author": {
    "name": "bzlies"
  },
  "license": "MIT",
  "keywords": [
    "trello",
    "project-management",
    "kanban",
    "mcp",
    "claude-code"
  ]
}
```

**Step 4: Create .mcp.json**

```json
{
  "trello": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/dist/index.js"],
    "env": {
      "TRELLO_API_KEY": "${TRELLO_API_KEY}",
      "TRELLO_TOKEN": "${TRELLO_TOKEN}"
    }
  }
}
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: node_modules created, package-lock.json generated

**Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json .claude-plugin/plugin.json .mcp.json
git commit -m "scaffold: project setup with deps, plugin manifest, and MCP config"
```

---

### Task 2: Types and Constants

**Files:**
- Create: `src/types.ts`

**Step 1: Create types.ts with all shared types and default field sets**

```typescript
// Default field sets for token efficiency
export const DEFAULT_FIELDS = {
  board: "id,name,desc,url,shortUrl,closed",
  list: "id,name,closed,pos",
  card: "id,name,idShort,labels,due,dueComplete,idList,idMembers,shortUrl,closed",
  member: "id,fullName,username",
} as const;

export const DEFAULT_LIMITS = {
  boardActivity: 10,
  cardComments: 10,
  search: 10,
} as const;

// Resolve the fields param: undefined -> smart default, "all" -> undefined (no filter), string -> pass through
export function resolveFields(
  fields: string | undefined,
  entityType: keyof typeof DEFAULT_FIELDS,
): string | undefined {
  if (fields === "all") return undefined;
  if (fields === undefined) return DEFAULT_FIELDS[entityType];
  return fields;
}

export interface TrelloError {
  status: number;
  message: string;
  endpoint: string;
}
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared types, default field sets, and resolveFields helper"
```

---

### Task 3: TrelloClient — Core HTTP Client

**Files:**
- Create: `src/trello-client.ts`
- Create: `src/__tests__/trello-client.test.ts`

**Step 1: Write failing tests for TrelloClient**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloClient } from "../trello-client.js";
import axios from "axios";

vi.mock("axios");

const mockedAxios = vi.mocked(axios);

describe("TrelloClient", () => {
  let client: TrelloClient;
  let mockInstance: any;

  beforeEach(() => {
    mockInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    mockedAxios.create.mockReturnValue(mockInstance as any);
    client = new TrelloClient("test-key", "test-token");
  });

  describe("constructor", () => {
    it("creates axios instance with base URL and auth params", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://api.trello.com/1",
        params: { key: "test-key", token: "test-token" },
      });
    });
  });

  describe("getBoards", () => {
    it("fetches boards for a workspace with default fields", async () => {
      mockInstance.get.mockResolvedValue({ data: [{ id: "b1", name: "Board 1" }] });
      const result = await client.getBoards("ws1");
      expect(mockInstance.get).toHaveBeenCalledWith("/organizations/ws1/boards", {
        params: { fields: "id,name,desc,url,shortUrl,closed" },
      });
      expect(result).toEqual([{ id: "b1", name: "Board 1" }]);
    });

    it("passes custom fields when specified", async () => {
      mockInstance.get.mockResolvedValue({ data: [] });
      await client.getBoards("ws1", "name,url");
      expect(mockInstance.get).toHaveBeenCalledWith("/organizations/ws1/boards", {
        params: { fields: "name,url" },
      });
    });

    it("sends no fields param when fields is 'all'", async () => {
      mockInstance.get.mockResolvedValue({ data: [] });
      await client.getBoards("ws1", "all");
      expect(mockInstance.get).toHaveBeenCalledWith("/organizations/ws1/boards", {
        params: {},
      });
    });
  });

  describe("getCardsByList", () => {
    it("fetches cards with default fields", async () => {
      mockInstance.get.mockResolvedValue({ data: [{ id: "c1", name: "Card 1" }] });
      const result = await client.getCardsByList("list1");
      expect(mockInstance.get).toHaveBeenCalledWith("/lists/list1/cards", {
        params: { fields: "id,name,idShort,labels,due,dueComplete,idList,idMembers,shortUrl,closed" },
      });
      expect(result).toEqual([{ id: "c1", name: "Card 1" }]);
    });
  });

  describe("error handling", () => {
    it("throws TrelloError with status and endpoint on API error", async () => {
      mockInstance.get.mockRejectedValue({
        response: { status: 404, data: "model not found" },
        config: { url: "/boards/xyz" },
      });
      await expect(client.getBoard("xyz")).rejects.toMatchObject({
        status: 404,
        message: "Board/card not found. Check the ID.",
        endpoint: "/boards/xyz",
      });
    });

    it("maps 401 to auth error message", async () => {
      mockInstance.get.mockRejectedValue({
        response: { status: 401, data: "unauthorized" },
        config: { url: "/members/me" },
      });
      await expect(client.getWorkspaces()).rejects.toMatchObject({
        status: 401,
        message: "Invalid API key or token. Run /trello-setup to reconfigure.",
      });
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/trello-client.test.ts`
Expected: FAIL — module not found

**Step 3: Implement TrelloClient**

```typescript
import axios, { type AxiosInstance } from "axios";
import { resolveFields, type TrelloError } from "./types.js";

export class TrelloClient {
  private http: AxiosInstance;

  constructor(apiKey: string, token: string) {
    this.http = axios.create({
      baseURL: "https://api.trello.com/1",
      params: { key: apiKey, token },
    });
  }

  private buildParams(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) params[k] = v;
    }
    return params;
  }

  private async request<T>(method: "get" | "post" | "put" | "delete", path: string, params?: Record<string, unknown>, data?: unknown): Promise<T> {
    try {
      const response = await this.http[method](path, method === "get" || method === "delete" ? { params: this.buildParams(params) } : data, method !== "get" && method !== "delete" ? { params: this.buildParams(params) } : undefined);
      return method === "get" || method === "delete" ? response.data : response.data;
    } catch (err: any) {
      const status = err.response?.status ?? 0;
      const endpoint = err.config?.url ?? path;
      let message: string;
      if (status === 401) {
        message = "Invalid API key or token. Run /trello-setup to reconfigure.";
      } else if (status === 404) {
        message = "Board/card not found. Check the ID.";
      } else if (status === 429) {
        message = "Rate limit hit. Try again in a few seconds.";
      } else {
        message = `Trello API error (${status}): ${err.response?.data ?? err.message}`;
      }
      const error: TrelloError = { status, message, endpoint };
      throw error;
    }
  }

  // --- Workspaces ---

  async getWorkspaces(): Promise<any[]> {
    return this.request("get", "/members/me/organizations");
  }

  // --- Boards ---

  async getBoards(workspaceId?: string, fields?: string): Promise<any[]> {
    const resolvedFields = resolveFields(fields, "board");
    if (workspaceId) {
      return this.request("get", `/organizations/${workspaceId}/boards`, { fields: resolvedFields });
    }
    return this.request("get", "/members/me/boards", { fields: resolvedFields });
  }

  async getBoard(boardId: string, fields?: string): Promise<any> {
    return this.request("get", `/boards/${boardId}`, { fields: resolveFields(fields, "board") });
  }

  async getBoardMembers(boardId: string): Promise<any[]> {
    return this.request("get", `/boards/${boardId}/members`, { fields: resolveFields(undefined, "member") });
  }

  async getBoardActivity(boardId: string, limit: number = 10): Promise<any[]> {
    return this.request("get", `/boards/${boardId}/actions`, { limit });
  }

  // --- Lists ---

  async getLists(boardId: string, fields?: string): Promise<any[]> {
    return this.request("get", `/boards/${boardId}/lists`, { fields: resolveFields(fields, "list") });
  }

  async createList(boardId: string, name: string, pos?: string): Promise<any> {
    return this.request("post", "/lists", { idBoard: boardId, name, pos });
  }

  async updateList(listId: string, updates: { name?: string; pos?: string; closed?: boolean }): Promise<any> {
    return this.request("put", `/lists/${listId}`, updates);
  }

  async archiveList(listId: string): Promise<any> {
    return this.request("put", `/lists/${listId}`, { closed: true });
  }

  // --- Cards ---

  async getCardsByList(listId: string, fields?: string): Promise<any[]> {
    return this.request("get", `/lists/${listId}/cards`, { fields: resolveFields(fields, "card") });
  }

  async getCard(cardId: string, fields?: string): Promise<any> {
    return this.request("get", `/cards/${cardId}`, { fields: resolveFields(fields, "card") });
  }

  async createCard(listId: string, data: { name: string; desc?: string; due?: string; idLabels?: string; idMembers?: string; pos?: string }): Promise<any> {
    return this.request("post", "/cards", { idList: listId, ...data });
  }

  async updateCard(cardId: string, updates: Record<string, unknown>): Promise<any> {
    return this.request("put", `/cards/${cardId}`, updates);
  }

  async moveCard(cardId: string, listId: string, boardId?: string): Promise<any> {
    const updates: Record<string, unknown> = { idList: listId };
    if (boardId) updates.idBoard = boardId;
    return this.request("put", `/cards/${cardId}`, updates);
  }

  async archiveCard(cardId: string): Promise<any> {
    return this.request("put", `/cards/${cardId}`, { closed: true });
  }

  async addCardMember(cardId: string, memberId: string): Promise<any> {
    return this.request("post", `/cards/${cardId}/idMembers`, { value: memberId });
  }

  async removeCardMember(cardId: string, memberId: string): Promise<any> {
    return this.request("delete", `/cards/${cardId}/idMembers/${memberId}`);
  }

  // --- Checklists ---

  async getChecklists(cardId: string): Promise<any[]> {
    return this.request("get", `/cards/${cardId}/checklists`);
  }

  async createChecklist(cardId: string, name: string): Promise<any> {
    return this.request("post", "/checklists", { idCard: cardId, name });
  }

  async deleteChecklist(checklistId: string): Promise<any> {
    return this.request("delete", `/checklists/${checklistId}`);
  }

  async addChecklistItem(checklistId: string, name: string, pos?: string): Promise<any> {
    return this.request("post", `/checklists/${checklistId}/checkItems`, { name, pos });
  }

  async updateChecklistItem(cardId: string, checkItemId: string, updates: { state?: string; name?: string }): Promise<any> {
    return this.request("put", `/cards/${cardId}/checkItem/${checkItemId}`, updates);
  }

  // --- Comments ---

  async getCardComments(cardId: string, limit: number = 10): Promise<any[]> {
    return this.request("get", `/cards/${cardId}/actions`, { filter: "commentCard", limit });
  }

  async addComment(cardId: string, text: string): Promise<any> {
    return this.request("post", `/cards/${cardId}/actions/comments`, { text });
  }

  async deleteComment(cardId: string, commentId: string): Promise<any> {
    return this.request("delete", `/cards/${cardId}/actions/${commentId}/comments`);
  }

  // --- Attachments ---

  async getAttachments(cardId: string): Promise<any[]> {
    return this.request("get", `/cards/${cardId}/attachments`);
  }

  async addAttachment(cardId: string, url: string, name?: string): Promise<any> {
    return this.request("post", `/cards/${cardId}/attachments`, { url, name });
  }

  // --- Labels ---

  async getBoardLabels(boardId: string): Promise<any[]> {
    return this.request("get", `/boards/${boardId}/labels`);
  }

  async createLabel(boardId: string, name: string, color: string): Promise<any> {
    return this.request("post", "/labels", { idBoard: boardId, name, color });
  }

  async updateLabel(labelId: string, updates: { name?: string; color?: string }): Promise<any> {
    return this.request("put", `/labels/${labelId}`, updates);
  }

  async deleteLabel(labelId: string): Promise<any> {
    return this.request("delete", `/labels/${labelId}`);
  }

  // --- Custom Fields ---

  async getCustomFields(boardId: string): Promise<any[]> {
    return this.request("get", `/boards/${boardId}/customFields`);
  }

  async getCardCustomFieldValues(cardId: string): Promise<any[]> {
    return this.request("get", `/cards/${cardId}/customFieldItems`);
  }

  async setCardCustomFieldValue(cardId: string, customFieldId: string, value: Record<string, unknown>): Promise<any> {
    return this.request("put", `/cards/${cardId}/customField/${customFieldId}/item`, undefined, { value });
  }

  // --- Search ---

  async search(query: string, options?: { modelTypes?: string; boardId?: string; limit?: number }): Promise<any> {
    return this.request("get", "/search", {
      query,
      modelTypes: options?.modelTypes ?? "cards",
      idBoards: options?.boardId,
      cards_limit: options?.limit ?? 10,
      boards_limit: options?.limit ?? 10,
    });
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/trello-client.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/trello-client.ts src/__tests__/trello-client.test.ts
git commit -m "feat: implement TrelloClient with smart field defaults and error mapping"
```

---

### Task 4: MCP Server Entry Point — Skeleton

**Files:**
- Create: `src/index.ts`

**Step 1: Create minimal server that starts and connects**

```typescript
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
```

**Step 2: Commit** (won't compile yet — tool files missing — that's fine, commit the entry point)

```bash
git add src/index.ts
git commit -m "feat: add MCP server entry point with tool registration wiring"
```

---

### Task 5: Board & Workspace Tools

**Files:**
- Create: `src/tools/boards.ts`

**Step 1: Implement board tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/boards.ts
git commit -m "feat: add board & workspace tools (5 tools)"
```

---

### Task 6: List Tools

**Files:**
- Create: `src/tools/lists.ts`

**Step 1: Implement list tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/lists.ts
git commit -m "feat: add list tools (4 tools)"
```

---

### Task 7: Card Tools

**Files:**
- Create: `src/tools/cards.ts`

**Step 1: Implement card tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/cards.ts
git commit -m "feat: add card tools (8 tools)"
```

---

### Task 8: Checklist Tools

**Files:**
- Create: `src/tools/checklists.ts`

**Step 1: Implement checklist tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/checklists.ts
git commit -m "feat: add checklist tools (5 tools)"
```

---

### Task 9: Comment Tools

**Files:**
- Create: `src/tools/comments.ts`

**Step 1: Implement comment tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/comments.ts
git commit -m "feat: add comment tools (3 tools)"
```

---

### Task 10: Attachment Tools

**Files:**
- Create: `src/tools/attachments.ts`

**Step 1: Implement attachment tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/attachments.ts
git commit -m "feat: add attachment tools (2 tools)"
```

---

### Task 11: Label Tools

**Files:**
- Create: `src/tools/labels.ts`

**Step 1: Implement label tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/labels.ts
git commit -m "feat: add label tools (4 tools)"
```

---

### Task 12: Custom Field Tools

**Files:**
- Create: `src/tools/custom-fields.ts`

**Step 1: Implement custom field tools**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/custom-fields.ts
git commit -m "feat: add custom field tools (3 tools)"
```

---

### Task 13: Search Tool

**Files:**
- Create: `src/tools/search.ts`

**Step 1: Implement search tool**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/tools/search.ts
git commit -m "feat: add search tool"
```

---

### Task 14: Build and Verify

**Step 1: Build the TypeScript project**

Run: `npm run build`
Expected: Compiles to `dist/` without errors

**Step 2: Fix any type errors if build fails**

If there are compilation errors, fix them and rebuild.

**Step 3: Commit build output to .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
```

```bash
git add .gitignore
git commit -m "chore: add .gitignore for node_modules and dist"
```

---

### Task 15: Slash Commands

**Files:**
- Create: `commands/trello-setup.md`
- Create: `commands/trello-boards.md`
- Create: `commands/trello-cards.md`
- Create: `commands/trello-search.md`

**Step 1: Create /trello-setup command**

```markdown
---
description: Set up Trello API credentials for the Trello plugin
---

# Trello Setup

Help the user configure their Trello API credentials.

## Instructions

Walk the user through these steps:

1. **Get API Key:** Direct them to https://trello.com/power-ups/admin — click "New" to create a Power-Up, then copy the API key from the API key section.

2. **Get Token:** Direct them to visit this URL (replacing YOUR_API_KEY):
   `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_API_KEY`

3. **Set Environment Variables:** Tell them to add these to their shell profile or `.env`:
   ```
   export TRELLO_API_KEY=their_api_key
   export TRELLO_TOKEN=their_token
   ```

4. **Verify:** After they've set the variables, use the `list_workspaces` tool to verify the connection works.

If the user already has credentials, skip to verification.
```

**Step 2: Create /trello-boards command**

```markdown
---
description: List and explore your Trello boards
allowed-tools: mcp__trello__list_workspaces, mcp__trello__list_boards, mcp__trello__get_board, mcp__trello__get_lists
---

# Trello Boards

Show the user their Trello boards and let them explore.

## Instructions

1. Use `list_boards` to fetch all boards
2. Present them in a clean formatted list showing: name, URL, open/closed status
3. If the user wants to explore a specific board, use `get_board` and `get_lists` to show its lists and structure
4. Keep output concise — this is for quick orientation, not deep exploration

$ARGUMENTS
```

**Step 3: Create /trello-cards command**

```markdown
---
description: Quick card listing for a board or list
argument-hint: [board-name or list-name]
allowed-tools: mcp__trello__list_boards, mcp__trello__get_lists, mcp__trello__get_cards_by_list
---

# Trello Cards

Show cards quickly with minimal token usage.

## Instructions

1. If the user specified a board/list in arguments, find it. Otherwise ask which board and list they want.
2. Use `get_cards_by_list` with default fields (token-efficient — no descriptions returned)
3. Present cards in a compact list: name, due date (if set), labels, members
4. If they want full details on a specific card, tell them to ask and you'll fetch it with fields='all'

$ARGUMENTS
```

**Step 4: Create /trello-search command**

```markdown
---
description: Search across your Trello boards
argument-hint: <search query>
allowed-tools: mcp__trello__search
---

# Trello Search

Search Trello for cards, boards, or members.

## Instructions

1. Use the `search` tool with the user's query from $ARGUMENTS
2. If no arguments provided, ask what they want to search for
3. Present results in a compact format: card name, board, list, due date
4. Mention that Trello search supports operators: @member, #label, board:name, list:name, is:open, has:attachments, etc.

$ARGUMENTS
```

**Step 5: Commit**

```bash
git add commands/
git commit -m "feat: add slash commands (setup, boards, cards, search)"
```

---

### Task 16: TrelloClient Tests — Complete Coverage

**Files:**
- Modify: `src/__tests__/trello-client.test.ts`

**Step 1: Expand test coverage for all client methods**

Add tests for the remaining client methods beyond what was written in Task 3. Focus on:
- `resolveFields` helper (all three branches: undefined, "all", custom)
- List operations (create, update, archive)
- Card operations (create, move, archive, members)
- Checklist operations
- Comment operations
- Label operations
- Search with various options

Each test should verify:
1. Correct HTTP method and endpoint called
2. Correct params/body sent
3. Response data returned

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/__tests__/
git commit -m "test: complete TrelloClient unit test coverage"
```

---

### Task 17: Final Verification and README

**Step 1: Full build**

Run: `npm run build`
Expected: Clean compilation, `dist/` populated

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Verify plugin structure is correct**

Check that all required files exist:
- `.claude-plugin/plugin.json`
- `.mcp.json`
- `dist/index.js` (after build)
- `commands/trello-setup.md`
- `commands/trello-boards.md`
- `commands/trello-cards.md`
- `commands/trello-search.md`

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification — plugin ready"
```
