import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrelloClient } from "../trello-client.js";
import { resolveFields, DEFAULT_FIELDS } from "../types.js";
import axios from "axios";

vi.mock("axios");

const mockedAxios = vi.mocked(axios, true);

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

  // ---------------------------------------------------------------------------
  // resolveFields helper
  // ---------------------------------------------------------------------------

  describe("resolveFields", () => {
    it("returns the entity default when fields is undefined", () => {
      expect(resolveFields(undefined, "board")).toBe(DEFAULT_FIELDS.board);
      expect(resolveFields(undefined, "list")).toBe(DEFAULT_FIELDS.list);
      expect(resolveFields(undefined, "card")).toBe(DEFAULT_FIELDS.card);
      expect(resolveFields(undefined, "member")).toBe(DEFAULT_FIELDS.member);
    });

    it("returns undefined when fields is 'all'", () => {
      expect(resolveFields("all", "board")).toBeUndefined();
      expect(resolveFields("all", "card")).toBeUndefined();
    });

    it("passes a custom field string through unchanged", () => {
      expect(resolveFields("name,url", "board")).toBe("name,url");
      expect(resolveFields("id,name", "card")).toBe("id,name");
    });
  });

  // ---------------------------------------------------------------------------
  // getBoards
  // ---------------------------------------------------------------------------

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

    it("fetches boards for the current member when no workspaceId given", async () => {
      mockInstance.get.mockResolvedValue({ data: [{ id: "b2", name: "Board 2" }] });
      const result = await client.getBoards();
      expect(mockInstance.get).toHaveBeenCalledWith("/members/me/boards", {
        params: { fields: "id,name,desc,url,shortUrl,closed" },
      });
      expect(result).toEqual([{ id: "b2", name: "Board 2" }]);
    });
  });

  // ---------------------------------------------------------------------------
  // getCardsByList
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // List operations
  // ---------------------------------------------------------------------------

  describe("createList", () => {
    it("posts to /lists with idBoard and name", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "l1", name: "New List" } });
      const result = await client.createList("b1", "New List");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/lists",
        undefined,
        { params: { idBoard: "b1", name: "New List" } },
      );
      expect(result).toEqual({ id: "l1", name: "New List" });
    });

    it("includes pos param when provided", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "l2", name: "Top List" } });
      await client.createList("b1", "Top List", "top");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/lists",
        undefined,
        { params: { idBoard: "b1", name: "Top List", pos: "top" } },
      );
    });
  });

  describe("updateList", () => {
    it("puts to /lists/:id with name update", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "l1", name: "Renamed" } });
      const result = await client.updateList("l1", { name: "Renamed" });
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/lists/l1",
        undefined,
        { params: { name: "Renamed" } },
      );
      expect(result).toEqual({ id: "l1", name: "Renamed" });
    });

    it("puts multiple update fields", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "l1" } });
      await client.updateList("l1", { name: "Done", pos: "bottom" });
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/lists/l1",
        undefined,
        { params: { name: "Done", pos: "bottom" } },
      );
    });
  });

  describe("archiveList", () => {
    it("puts closed: true to /lists/:id", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "l1", closed: true } });
      const result = await client.archiveList("l1");
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/lists/l1",
        undefined,
        { params: { closed: true } },
      );
      expect(result).toEqual({ id: "l1", closed: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Card operations
  // ---------------------------------------------------------------------------

  describe("createCard", () => {
    it("posts to /cards with idList and required fields", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "c1", name: "My Card" } });
      const result = await client.createCard("l1", { name: "My Card" });
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/cards",
        undefined,
        { params: { idList: "l1", name: "My Card" } },
      );
      expect(result).toEqual({ id: "c1", name: "My Card" });
    });

    it("includes all optional card fields when provided", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "c2" } });
      await client.createCard("l1", {
        name: "Full Card",
        desc: "A description",
        due: "2026-03-01",
        idLabels: "label1",
        idMembers: "member1",
        pos: "top",
      });
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/cards",
        undefined,
        {
          params: {
            idList: "l1",
            name: "Full Card",
            desc: "A description",
            due: "2026-03-01",
            idLabels: "label1",
            idMembers: "member1",
            pos: "top",
          },
        },
      );
    });
  });

  describe("moveCard", () => {
    it("puts idList to /cards/:id", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "c1", idList: "l2" } });
      const result = await client.moveCard("c1", "l2");
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/cards/c1",
        undefined,
        { params: { idList: "l2" } },
      );
      expect(result).toEqual({ id: "c1", idList: "l2" });
    });

    it("includes idBoard when moving across boards", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "c1" } });
      await client.moveCard("c1", "l2", "b2");
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/cards/c1",
        undefined,
        { params: { idList: "l2", idBoard: "b2" } },
      );
    });
  });

  describe("archiveCard", () => {
    it("puts closed: true to /cards/:id", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "c1", closed: true } });
      const result = await client.archiveCard("c1");
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/cards/c1",
        undefined,
        { params: { closed: true } },
      );
      expect(result).toEqual({ id: "c1", closed: true });
    });
  });

  describe("addCardMember", () => {
    it("posts value to /cards/:id/idMembers", async () => {
      mockInstance.post.mockResolvedValue({ data: [{ id: "m1" }] });
      const result = await client.addCardMember("c1", "m1");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/cards/c1/idMembers",
        undefined,
        { params: { value: "m1" } },
      );
      expect(result).toEqual([{ id: "m1" }]);
    });
  });

  describe("removeCardMember", () => {
    it("deletes from /cards/:id/idMembers/:memberId", async () => {
      mockInstance.delete.mockResolvedValue({ data: [{ id: "m2" }] });
      const result = await client.removeCardMember("c1", "m1");
      expect(mockInstance.delete).toHaveBeenCalledWith(
        "/cards/c1/idMembers/m1",
        { params: {} },
      );
      expect(result).toEqual([{ id: "m2" }]);
    });
  });

  // ---------------------------------------------------------------------------
  // Checklist operations
  // ---------------------------------------------------------------------------

  describe("getChecklists", () => {
    it("fetches checklists for a card", async () => {
      const checklists = [{ id: "cl1", name: "Checklist 1", checkItems: [] }];
      mockInstance.get.mockResolvedValue({ data: checklists });
      const result = await client.getChecklists("c1");
      expect(mockInstance.get).toHaveBeenCalledWith(
        "/cards/c1/checklists",
        { params: {} },
      );
      expect(result).toEqual(checklists);
    });
  });

  describe("createChecklist", () => {
    it("posts to /checklists with idCard and name", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "cl1", name: "Steps" } });
      const result = await client.createChecklist("c1", "Steps");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/checklists",
        undefined,
        { params: { idCard: "c1", name: "Steps" } },
      );
      expect(result).toEqual({ id: "cl1", name: "Steps" });
    });
  });

  describe("deleteChecklist", () => {
    it("deletes /checklists/:id", async () => {
      mockInstance.delete.mockResolvedValue({ data: {} });
      const result = await client.deleteChecklist("cl1");
      expect(mockInstance.delete).toHaveBeenCalledWith(
        "/checklists/cl1",
        { params: {} },
      );
      expect(result).toEqual({});
    });
  });

  describe("addChecklistItem", () => {
    it("posts to /checklists/:id/checkItems with name", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "ci1", name: "Step 1" } });
      const result = await client.addChecklistItem("cl1", "Step 1");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/checklists/cl1/checkItems",
        undefined,
        { params: { name: "Step 1" } },
      );
      expect(result).toEqual({ id: "ci1", name: "Step 1" });
    });

    it("includes pos param when provided", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "ci2" } });
      await client.addChecklistItem("cl1", "Step 2", "bottom");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/checklists/cl1/checkItems",
        undefined,
        { params: { name: "Step 2", pos: "bottom" } },
      );
    });
  });

  describe("updateChecklistItem", () => {
    it("puts state update to /cards/:cardId/checkItem/:checkItemId", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "ci1", state: "complete" } });
      const result = await client.updateChecklistItem("c1", "ci1", { state: "complete" });
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/cards/c1/checkItem/ci1",
        undefined,
        { params: { state: "complete" } },
      );
      expect(result).toEqual({ id: "ci1", state: "complete" });
    });

    it("puts name update to /cards/:cardId/checkItem/:checkItemId", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "ci1", name: "Renamed step" } });
      await client.updateChecklistItem("c1", "ci1", { name: "Renamed step" });
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/cards/c1/checkItem/ci1",
        undefined,
        { params: { name: "Renamed step" } },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Comment operations
  // ---------------------------------------------------------------------------

  describe("getCardComments", () => {
    it("fetches comments with default limit of 10", async () => {
      const comments = [{ id: "a1", type: "commentCard" }];
      mockInstance.get.mockResolvedValue({ data: comments });
      const result = await client.getCardComments("c1");
      expect(mockInstance.get).toHaveBeenCalledWith(
        "/cards/c1/actions",
        { params: { filter: "commentCard", limit: 10 } },
      );
      expect(result).toEqual(comments);
    });

    it("uses custom limit when provided", async () => {
      mockInstance.get.mockResolvedValue({ data: [] });
      await client.getCardComments("c1", 25);
      expect(mockInstance.get).toHaveBeenCalledWith(
        "/cards/c1/actions",
        { params: { filter: "commentCard", limit: 25 } },
      );
    });
  });

  describe("addComment", () => {
    it("posts text to /cards/:id/actions/comments", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "a1", type: "commentCard" } });
      const result = await client.addComment("c1", "Hello world");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/cards/c1/actions/comments",
        undefined,
        { params: { text: "Hello world" } },
      );
      expect(result).toEqual({ id: "a1", type: "commentCard" });
    });
  });

  describe("deleteComment", () => {
    it("deletes /cards/:cardId/actions/:commentId/comments", async () => {
      mockInstance.delete.mockResolvedValue({ data: {} });
      const result = await client.deleteComment("c1", "a1");
      expect(mockInstance.delete).toHaveBeenCalledWith(
        "/cards/c1/actions/a1/comments",
        { params: {} },
      );
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Label operations
  // ---------------------------------------------------------------------------

  describe("getBoardLabels", () => {
    it("fetches labels from /boards/:id/labels", async () => {
      const labels = [{ id: "lbl1", name: "Bug", color: "red" }];
      mockInstance.get.mockResolvedValue({ data: labels });
      const result = await client.getBoardLabels("b1");
      expect(mockInstance.get).toHaveBeenCalledWith(
        "/boards/b1/labels",
        { params: {} },
      );
      expect(result).toEqual(labels);
    });
  });

  describe("createLabel", () => {
    it("posts to /labels with idBoard, name, and color", async () => {
      mockInstance.post.mockResolvedValue({ data: { id: "lbl1", name: "Bug", color: "red" } });
      const result = await client.createLabel("b1", "Bug", "red");
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/labels",
        undefined,
        { params: { idBoard: "b1", name: "Bug", color: "red" } },
      );
      expect(result).toEqual({ id: "lbl1", name: "Bug", color: "red" });
    });
  });

  describe("updateLabel", () => {
    it("puts name update to /labels/:id", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "lbl1", name: "Feature" } });
      const result = await client.updateLabel("lbl1", { name: "Feature" });
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/labels/lbl1",
        undefined,
        { params: { name: "Feature" } },
      );
      expect(result).toEqual({ id: "lbl1", name: "Feature" });
    });

    it("puts color update to /labels/:id", async () => {
      mockInstance.put.mockResolvedValue({ data: { id: "lbl1", color: "blue" } });
      await client.updateLabel("lbl1", { color: "blue" });
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/labels/lbl1",
        undefined,
        { params: { color: "blue" } },
      );
    });
  });

  describe("deleteLabel", () => {
    it("deletes /labels/:id", async () => {
      mockInstance.delete.mockResolvedValue({ data: {} });
      const result = await client.deleteLabel("lbl1");
      expect(mockInstance.delete).toHaveBeenCalledWith(
        "/labels/lbl1",
        { params: {} },
      );
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  describe("search", () => {
    it("searches with default options (cards, limit 10)", async () => {
      const searchResult = { cards: [{ id: "c1" }] };
      mockInstance.get.mockResolvedValue({ data: searchResult });
      const result = await client.search("my query");
      expect(mockInstance.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "my query",
          modelTypes: "cards",
          cards_limit: 10,
          boards_limit: 10,
        },
      });
      expect(result).toEqual(searchResult);
    });

    it("uses custom modelTypes when provided", async () => {
      mockInstance.get.mockResolvedValue({ data: { boards: [] } });
      await client.search("my query", { modelTypes: "boards" });
      expect(mockInstance.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "my query",
          modelTypes: "boards",
          cards_limit: 10,
          boards_limit: 10,
        },
      });
    });

    it("includes idBoards filter when boardId is provided", async () => {
      mockInstance.get.mockResolvedValue({ data: { cards: [] } });
      await client.search("my query", { boardId: "b1" });
      expect(mockInstance.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "my query",
          modelTypes: "cards",
          idBoards: "b1",
          cards_limit: 10,
          boards_limit: 10,
        },
      });
    });

    it("uses custom limit when provided", async () => {
      mockInstance.get.mockResolvedValue({ data: { cards: [] } });
      await client.search("my query", { limit: 50 });
      expect(mockInstance.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "my query",
          modelTypes: "cards",
          cards_limit: 50,
          boards_limit: 50,
        },
      });
    });

    it("combines all options together", async () => {
      mockInstance.get.mockResolvedValue({ data: {} });
      await client.search("sprint", { modelTypes: "cards,boards", boardId: "b2", limit: 5 });
      expect(mockInstance.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "sprint",
          modelTypes: "cards,boards",
          idBoards: "b2",
          cards_limit: 5,
          boards_limit: 5,
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

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

    it("maps 429 to rate limit error message", async () => {
      mockInstance.get.mockRejectedValue({
        response: { status: 429, data: "rate limit exceeded" },
        config: { url: "/boards/b1/lists" },
      });
      await expect(client.getLists("b1")).rejects.toMatchObject({
        status: 429,
        message: "Rate limit hit. Try again in a few seconds.",
        endpoint: "/boards/b1/lists",
      });
    });

    it("formats generic API errors with status code and response data", async () => {
      mockInstance.get.mockRejectedValue({
        response: { status: 500, data: "internal server error" },
        config: { url: "/members/me/organizations" },
      });
      await expect(client.getWorkspaces()).rejects.toMatchObject({
        status: 500,
        message: "Trello API error (500): internal server error",
      });
    });

    it("falls back to the path when config.url is absent", async () => {
      mockInstance.get.mockRejectedValue({
        response: { status: 404, data: "not found" },
        config: {},
      });
      await expect(client.getBoard("missing")).rejects.toMatchObject({
        status: 404,
        endpoint: "/boards/missing",
      });
    });
  });
});
