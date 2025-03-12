# Project Brief: Tavily Search MCP Server

## Project Overview
The Tavily Search MCP Server is a Model Context Protocol (MCP) server implementation that integrates with the Tavily Search API. It provides optimized search capabilities for Large Language Models (LLMs), allowing them to perform web searches with various controls and filters.

## Core Requirements
1. Provide a web search capability optimized for LLMs
2. Support various search parameters (depth, topic, time range, etc.)
3. Allow content extraction from search results
4. Support domain filtering (inclusion/exclusion)
5. Offer optional features like image inclusion, image descriptions, and LLM-generated answers

## Current Implementation
The project currently has two server implementations:
1. A standard stdio transport server (index.js)
2. An SSE (Server-Sent Events) transport server (sse.js) which uses Express

## Deployment Goal
Deploy the SSE implementation (dist/sse.js) as a Cloudflare Worker to enable serverless hosting with global distribution.

## Technical Stack
- TypeScript
- Node.js
- Express (for the SSE implementation)
- Model Context Protocol SDK
- Tavily Search API
