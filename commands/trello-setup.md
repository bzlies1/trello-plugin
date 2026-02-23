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
