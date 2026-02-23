---
description: Set up Trello API credentials and project board for the Trello plugin
allowed-tools: mcp__trello__list_workspaces, mcp__trello__list_boards
---

# Trello Setup

Help the user configure their Trello API credentials and optionally set a default board for this project.

## Instructions

Walk the user through these steps:

### Step 1: API Credentials

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

### Step 2: Project Board (optional)

After credentials are verified, ask the user if they want to set a default Trello board for this project.

1. **Ask:** "Would you like to set a default Trello board for this project? This lets other commands like `/trello-cards` skip the board selection step."

2. **If yes**, help them find their board ID:
   - Use `list_boards` to show their boards
   - Let them pick one
   - **How to find it manually:** The board ID is the alphanumeric string in any Trello board URL: `https://trello.com/b/BOARD_ID/board-name`

3. **Save it:** Write a `.trello-board` file in the project root containing just the board ID (nothing else). Example:
   ```
   abc123def456
   ```

4. **If no**, that's fine — skip this step. Commands will ask for a board when needed.

Tell the user: "Other commands like `/trello-boards` and `/trello-cards` will automatically use this board when set."
