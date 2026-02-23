---
description: List and explore your Trello boards
allowed-tools: mcp__trello__list_workspaces, mcp__trello__list_boards, mcp__trello__get_board, mcp__trello__get_lists
---

# Trello Boards

Show the user their Trello boards and let them explore.

## Instructions

1. Check if a `.trello-board` file exists in the project root — if so, use that board ID to show the board and its lists directly
2. Otherwise, use `list_boards` to fetch all boards
3. Present them in a clean formatted list showing: name, URL, open/closed status
4. If the user wants to explore a specific board, use `get_board` and `get_lists` to show its lists and structure
5. Keep output concise — this is for quick orientation, not deep exploration

$ARGUMENTS
