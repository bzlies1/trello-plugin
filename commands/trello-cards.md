---
description: Quick card listing for a board or list
argument-hint: [board-name or list-name]
allowed-tools: mcp__trello__list_boards, mcp__trello__get_lists, mcp__trello__get_cards_by_list
---

# Trello Cards

Show cards quickly with minimal token usage.

## Instructions

1. Check if a `.trello-board` file exists in the project root — if so, use that board ID as the default board
2. If the user specified a board/list in arguments, find it. Otherwise use the default board, or ask which board and list they want.
3. Use `get_cards_by_list` with default fields (token-efficient — no descriptions returned)
4. Present cards in a compact list: name, due date (if set), labels, members
5. If they want full details on a specific card, tell them to ask and you'll fetch it with fields='all'

$ARGUMENTS
