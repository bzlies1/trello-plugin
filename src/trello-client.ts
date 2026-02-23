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
      const builtParams = this.buildParams(params);
      let response;
      if (method === "get" || method === "delete") {
        response = await this.http[method](path, { params: builtParams });
      } else {
        response = await this.http[method](path, data, { params: builtParams });
      }
      return response.data;
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
