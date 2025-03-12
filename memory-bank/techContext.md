# Technical Context: Tavily Search MCP Server

## Technologies Used

### Core Technologies
- **TypeScript**: The primary programming language
- **Node.js**: The runtime environment for the server
- **Express**: Web framework used for the SSE implementation
- **Model Context Protocol (MCP)**: Protocol for LLM tool integration
- **Tavily Search API**: External API for web search functionality

### Development Tools
- **npm**: Package manager
- **tsc**: TypeScript compiler
- **shx**: Cross-platform shell commands for npm scripts

### Dependencies
- **@modelcontextprotocol/sdk (1.0.1)**: SDK for implementing MCP servers
- **express (^4.21.1)**: Web framework for the SSE implementation

### Dev Dependencies
- **@types/express (^5.0.0)**: TypeScript types for Express
- **@types/node (^22)**: TypeScript types for Node.js
- **shx (^0.3.4)**: Cross-platform shell commands
- **typescript (^5.6.2)**: TypeScript compiler

## Development Setup

### Project Structure
```
tavily-search-mcp-server/
├── src/
│   ├── index.ts       # Stdio transport implementation
│   ├── sse.ts         # SSE transport implementation
│   └── tavily.ts      # Tavily API integration
├── dist/              # Compiled JavaScript files
├── package.json       # Project configuration
├── tsconfig.json      # TypeScript configuration
└── .env               # Environment variables (not in version control)
```

### Build Process
1. TypeScript files are compiled to JavaScript using `tsc`
2. Output is placed in the `dist/` directory
3. Executable permissions are added to the compiled JavaScript files

### Run Commands
- **Build**: `npm run build`
- **Start (stdio)**: `npm start` or `node dist/index.js`
- **Start (SSE)**: `npm run start:sse` or `node dist/sse.js`

## Technical Constraints

### API Limitations
- **Tavily API Rate Limits**: Depends on the plan (Free tier has limitations)
- **API Key Requirement**: Valid Tavily API key required for operation

### Runtime Constraints
- **Node.js Compatibility**: Requires Node.js environment
- **Environment Variables**: Requires `TAVILY_API_KEY` to be set

### Deployment Constraints
- **Current Deployment Options**:
  - Local Node.js execution
  - Docker container
  - Claude Desktop integration

### Cloudflare Workers Constraints
- **No Node.js Runtime**: Workers run on V8 isolates, not Node.js
- **Limited Compatibility**: Some Node.js APIs not available
- **Express Incompatibility**: Express framework not directly compatible
- **Connection Duration**: Workers have execution time limits
- **Environment Size**: Code size limitations for Workers
- **Streaming Responses**: Different implementation than Node.js streams

## Integration Points

### MCP Integration
- Implements the MCP server interface
- Registers and handles tool requests
- Manages client connections

### Tavily API Integration
- Authenticates with the Tavily API
- Formats and sends search requests
- Processes and returns search results

### Client Integration
- Connects to LLM clients via stdio or SSE
- Provides search tool functionality
- Returns formatted search results
