# Trello Plugin for Claude Code - Design Document

## Overview

A Claude Code plugin that provides comprehensive, token-efficient Trello management through MCP tools and slash commands. Designed for both personal use and public distribution.

## Decisions

- **Auth:** Environment variables (`TRELLO_API_KEY`, `TRELLO_TOKEN`)
- **Runtime:** Node.js + TypeScript
- **Architecture:** Monolithic MCP server (single process, all tools)
- **Token strategy:** Smart default field filtering per entity type
- **API scope:** Boards, lists, cards, checklists, comments, attachments, workspaces, search, labels CRUD, custom fields
- **UX surface:** MCP tools + slash commands (no autonomous agent)

## Plugin Structure

```
trello/
  plugin.json              # Plugin manifest
  .mcp.json                # MCP server config
  package.json             # Node dependencies
  tsconfig.json
  src/
    index.ts               # MCP server entry, tool registration
    trello-client.ts       # HTTP client wrapping Trello REST API
    types.ts               # Shared TypeScript types
    tools/
      boards.ts            # Board & workspace tools
      lists.ts             # List tools
      cards.ts             # Card CRUD tools
      checklists.ts        # Checklist tools
      comments.ts          # Comment tools
      attachments.ts       # Attachment tools
      search.ts            # Search tools
      labels.ts            # Label CRUD tools
      custom-fields.ts     # Custom field tools
  commands/
    trello-boards.md       # /trello-boards - list/switch boards
    trello-cards.md        # /trello-cards - quick card listing
    trello-search.md       # /trello-search - search across Trello
    trello-setup.md        # /trello-setup - guided auth setup
```

## Tool Inventory (35 tools)

### Boards & Workspaces (5 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `list_workspaces` | List all workspaces the user belongs to | -- |
| `list_boards` | List boards in a workspace or all boards | `workspaceId?`, `fields?` |
| `get_board` | Get board details | `boardId`, `fields?` |
| `get_board_members` | List members of a board | `boardId` |
| `get_board_activity` | Recent activity on a board | `boardId`, `limit?` (default 10) |

### Lists (4 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_lists` | Get all lists on a board | `boardId`, `fields?` |
| `create_list` | Create a new list | `boardId`, `name`, `pos?` |
| `update_list` | Update list name/position/closed | `listId`, `name?`, `pos?`, `closed?` |
| `archive_list` | Archive a list | `listId` |

### Cards (8 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_cards_by_list` | Get cards in a list | `listId`, `fields?` |
| `get_card` | Get full card details | `cardId`, `fields?` |
| `create_card` | Create a card | `listId`, `name`, `desc?`, `due?`, `labels?`, `members?`, `pos?` |
| `update_card` | Update card properties | `cardId`, + any card fields |
| `move_card` | Move card to a different list/board | `cardId`, `listId`, `boardId?` |
| `archive_card` | Archive a card | `cardId` |
| `add_card_member` | Assign member to card | `cardId`, `memberId` |
| `remove_card_member` | Remove member from card | `cardId`, `memberId` |

### Checklists (5 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_checklists` | Get all checklists on a card | `cardId` |
| `create_checklist` | Create a checklist | `cardId`, `name` |
| `delete_checklist` | Delete a checklist | `checklistId` |
| `add_checklist_item` | Add item to checklist | `checklistId`, `name`, `pos?` |
| `update_checklist_item` | Toggle complete or rename | `cardId`, `checkItemId`, `state?`, `name?` |

### Comments (3 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_card_comments` | Get comments on a card | `cardId`, `limit?` |
| `add_comment` | Add comment to card | `cardId`, `text` |
| `delete_comment` | Delete a comment | `cardId`, `commentId` |

### Attachments (2 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_attachments` | List attachments on a card | `cardId` |
| `add_attachment` | Attach URL to card | `cardId`, `url`, `name?` |

### Labels (4 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_board_labels` | Get all labels on a board | `boardId` |
| `create_label` | Create a label | `boardId`, `name`, `color` |
| `update_label` | Update label name/color | `labelId`, `name?`, `color?` |
| `delete_label` | Delete a label | `labelId` |

### Custom Fields (3 tools)

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_custom_fields` | Get custom field definitions on a board | `boardId` |
| `get_card_custom_field_values` | Get custom field values on a card | `cardId` |
| `set_card_custom_field_value` | Set a custom field value | `cardId`, `customFieldId`, `value` |

### Search (1 tool)

| Tool | Description | Key Params |
|------|-------------|------------|
| `search` | Search cards, boards, members | `query`, `modelTypes?`, `boardId?`, `limit?` |

## Token Efficiency Strategy

Every read operation uses smart defaults -- a curated field set that covers 90% of use cases.

### Default Field Sets

| Entity | Default Fields | Full response adds |
|--------|---------------|-------------------|
| Board | `id, name, desc, url, shortUrl, closed` | prefs, labelNames, memberships, powerUps |
| List | `id, name, closed, pos` | subscribed, softLimit, idBoard |
| Card | `id, name, idShort, labels, due, dueComplete, idList, idMembers, shortUrl, closed` | desc, descData, badges, checklists, attachments, pos, cover, dateLastActivity |
| Member | `id, fullName, username` | avatarUrl, bio, initials, memberType |

### Fields Parameter Behavior

1. `fields` omitted or `undefined` -> uses smart default set
2. `fields: "all"` -> no fields param sent to Trello (returns everything)
3. `fields: "name,desc,due"` -> exact fields sent to Trello API

### Default Limits

- `get_board_activity`: limit 10 (Trello default is 50)
- `get_card_comments`: limit 10
- `search`: limit 10

Result: ~50 tokens per card vs ~500+ with full responses.

## Slash Commands

### `/trello-setup`
Guides user through getting Trello API key and token. Outputs env vars to set. Pure instructional markdown.

### `/trello-boards`
Lists all boards, lets user pick one to explore. Uses `list_boards` and `get_lists` tools.

### `/trello-cards`
Quick card listing. Prompts for board and list, calls `get_cards_by_list` with smart defaults.

### `/trello-search`
Wraps the search tool with a prompt for the query. Shows compact formatted results.

## Error Handling

- `401` -> "Invalid API key or token. Run /trello-setup to reconfigure."
- `404` -> "Board/card not found. Check the ID."
- `429` -> "Rate limit hit. Waiting before retry."
- Network errors: 1 retry after 1s delay
- All errors include the failed Trello API endpoint

## Rate Limiting

- Token bucket: 100 requests per 10 seconds per token
- Automatic backoff on 429 responses
- No queuing -- returns error asking user to wait if rate limited

## Testing

- Unit tests: `TrelloClient` methods with mocked HTTP responses
- Integration tests: Run against real Trello board (env-gated)
- Registration tests: All 35 tools register correctly with MCP schema
