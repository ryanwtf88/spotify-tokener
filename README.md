# Spotify Tokener

> **Note:** This project is a unified fork of [idMJA/accessify](https://github.com/idMJA/accessify) and Solify. It combines the token generation capabilities of Accessify with the playlist and recommendation features of Solify into a single, cohesive API.

A robust REST API to generate anonymous Spotify access tokens, fetch full playlists, and retrieve track recommendations using Playwright and Spotify's internal APIs.

## Features

- **Anonymous Token Generation**: Fetches valid Spotify access tokens using browser automation (Playwright).
- **Full Playlist Fetching**: Retrieves all tracks from a playlist (bypassing the 100-track limit of standard scraped responses).
- **Recommendations**: Generates track recommendations based on a seed track.
- **Unified API**: Single endpoint structure for all Spotify-related needs.
- **Concurrency Safe**: Uses semaphores to manage browser resources and token refreshing.
- **Performance**: Built on the Hono framework and optimized for Bun.

## Requirements

- **WSL (Windows Subsystem for Linux)**: Recommended environment for Windows users (Ubuntu distribution).
- **Bun**: Fast JavaScript runtime.
- **Chromium**: Required for Playwright to generate tokens.

## Installation

1.  **Install Bun**:
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

2.  **Install Dependencies**:
    ```bash
    bun install
    ```

3.  **Install Chromium**:
    If you are on Ubuntu/WSL:
    ```bash
    sudo apt update && sudo apt install chromium-browser
    # OR
    sudo snap install chromium
    ```
    Then set `BROWSER_PATH` in your `.env` file.

## Configuration

Create a `.env` file in the root directory:

```properties
PORT=3012
BROWSER_PATH=/snap/bin/chromium  # Adjust path to your Chromium executable
HEADLESS=true
```

## Running the Server

```bash
bun run dev
# OR
bun src/server.ts
```

## API Endpoints

### 1. Get Access Token
Returns a fresh Spotify access token.

- **URL**: `/api/token`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "accessToken": "BQb...",
    "accessTokenExpirationTimestampMs": 1712345678900,
    "isAnonymous": true,
    "clientId": "..."
  }
  ```

### 2. Get Full Playlist
Fetches all tracks from a playlist.

- **URL**: `/playlist/full/:id`
- **Method**: `GET`
- **Query Params**:
  - `limit`: (Optional) Limit the number of tracks.
- **Example**: `http://localhost:3012/playlist/full/37i9dQZF1DXcBWIGoYBM5M`

### 3. Get Recommendations
Get recommendations based on a seed track.

- **URL**: `/recommendations/:id`
- **Method**: `GET`
- **Example**: `http://localhost:3012/recommendations/4PTG3Z6ehGkBFwjybzWkR8`

### 4. Get Full Recommendations
Get recommendations with full track details.

- **URL**: `/recommendations/full/:id`
- **Method**: `GET`

## License

MIT
