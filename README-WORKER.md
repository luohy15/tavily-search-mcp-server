# Tavily Search MCP Server - Cloudflare Worker Deployment

This document provides instructions for deploying the Tavily Search MCP Server as a Cloudflare Worker.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) (v7 or later)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (installed as a dev dependency)
- [Tavily API key](https://tavily.com/)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the worker:

```bash
npm run build:worker
```

3. Set up your Tavily API key as a secret:

```bash
npx wrangler secret put TAVILY_API_KEY
```

When prompted, enter your Tavily API key.

## Local Development

To test the worker locally:

```bash
npm run dev:worker
```

This will start a local development server that simulates the Cloudflare Workers environment.

## Deployment

To deploy the worker to Cloudflare:

```bash
npm run deploy
```

This will build and deploy the worker to your Cloudflare account.

## Usage

Once deployed, your worker will be available at:

```
https://tavily-search-mcp-server.<your-subdomain>.workers.dev
```

### Endpoints

- `GET /sse`: Establishes an SSE connection
- `POST /message`: Sends messages to the server

## Limitations

- The current implementation uses global variables for state management, which may not be ideal in a distributed environment.
- Error handling could be improved with more specific error types and better recovery mechanisms.
- Connection management doesn't handle reconnections well.
- API key handling is currently set as a global environment variable.

## Future Improvements

- Use Durable Objects for state management
- Improve error handling with more specific error types
- Add reconnection logic and session tracking
- Modify the tavily.ts file to accept the API key as a parameter
