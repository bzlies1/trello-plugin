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
