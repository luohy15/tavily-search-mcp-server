import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";

const TAVILY_SEARCH_TOOL: Tool = {
    name: "tavily_search",
    description:
        "Performs a web search using the Tavily Search API, optimized for LLMs. " +
        "Use this for broad information gathering, recent events, or when you need diverse web sources. " +
        "Supports search depth, topic selection, time range filtering, and domain inclusion/exclusion.",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query.",
            },
            search_depth: {
                type: "string",
                description: 'The depth of the search. It can be "basic" or "advanced".',
                enum: ["basic", "advanced"],
                default: "basic",
            },
            topic: {
                type: "string",
                description: 'The category of the search. Currently: only "general" and "news" are supported.',
                enum: ["general", "news"],
                default: "general",
            },
            days: {
                type: "number",
                description: "The number of days back from the current date to include in the search results (for news topic).",
                default: 3
            },
            time_range: {
                type: "string",
                description: 'The time range back from the current date to include in the search results. Accepted values include "day","week","month","year" or "d","w","m","y".',
                enum: ["day", "week", "month", "year", "d", "w", "m", "y"],
            },
            max_results: {
                type: "number",
                description: "The maximum number of search results to return.",
                default: 5,
            },
            include_images: {
                type: "boolean",
                description: "Include a list of query-related images in the response.",
                default: false,
            },
            include_image_descriptions: {
                type: "boolean",
                description: "When include_images is set to True, this option adds descriptive text for each image.",
                default: false,
            },
            include_answer: {
                type: "boolean",
                description: "Include a short answer to original query, generated by an LLM based on Tavily's search results.",
                default: false,
            },
            include_raw_content: {
                type: "boolean",
                description: "Include the cleaned and parsed HTML content of each search result.",
                default: false,
            },
            include_domains: {
                type: "array",
                items: {
                    type: "string",
                },
                description: "A list of domains to specifically include in the search results.",
                default: [],
            },
            exclude_domains: {
                type: "array",
                items: {
                    type: "string",
                },
                description: "A list of domains to specifically exclude from the search results.",
                default: [],
            },
        },
        required: ["query"],
    },
};

export const createServer = (apiKey?: string) => {
// Server implementation
    const server = new Server(
        {
            name: "example-servers/tavily-search",
            version: "0.1.0",
        },
        {
            capabilities: {
                tools: {},
            },
        },
    );

// Check for API key
    const TAVILY_API_KEY = apiKey || process.env.TAVILY_API_KEY!;
    if (!TAVILY_API_KEY) {
        console.error("Error: TAVILY_API_KEY environment variable is required");
        if (typeof process !== 'undefined' && process.exit) {
            process.exit(1);
        } else {
            throw new Error("TAVILY_API_KEY environment variable is required");
        }
    }

    interface TavilySearchArgs {
        query: string;
        search_depth?: "basic" | "advanced";
        topic?: "general" | "news";
        days?: number;
        time_range?: "day" | "week" | "month" | "year" | "d" | "w" | "m" | "y";
        max_results?: number;
        include_images?: boolean;
        include_image_descriptions?: boolean;
        include_answer?: boolean;
        include_raw_content?: boolean;
        include_domains?: string[];
        exclude_domains?: string[];
    }

    function isTavilySearchArgs(args: unknown): args is TavilySearchArgs {
        return (
            typeof args === "object" &&
            args !== null &&
            "query" in args &&
            typeof (args as { query: string }).query === "string"
        );
    }

    async function performTavilySearch(args: TavilySearchArgs) {
        const url = "https://api.tavily.com/search";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TAVILY_API_KEY}`,
            },
            body: JSON.stringify({
                ...args
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status} ${response.statusText}\n${await response.text()}`);
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
    }

// Tool handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [TAVILY_SEARCH_TOOL],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const { name, arguments: args } = request.params;

            if (!args) {
                throw new Error("No arguments provided");
            }

            switch (name) {
                case "tavily_search": {
                    if (!isTavilySearchArgs(args)) {
                        throw new Error("Invalid arguments for tavily_search");
                    }
                    const results = await performTavilySearch(args);
                    return {
                        content: [{type: "text", text: results}],
                        isError: false,
                    };
                }
                default:
                    return {
                        content: [{type: "text", text: `Unknown tool: ${name}`}],
                        isError: true,
                    };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });

    return {server};
}
