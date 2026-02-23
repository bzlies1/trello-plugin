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
