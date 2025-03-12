import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./tavily.js";
import { DurableObjectState, DurableObject } from "@cloudflare/workers-types";

// Define the message interface
interface Message {
  id: string;
  content: any;
  timestamp: number;
}

/**
 * SessionDO is a Durable Object that manages a single SSE session.
 * It handles the connection, message storage, and message delivery.
 */
export class SessionDO {
  private sessionId: string | null = null;
  private transport: SSEServerTransport | null = null;
  private server: any = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private messages: Message[] = [];
  private active = false;
  private abortController = new AbortController();

  constructor(private state: DurableObjectState, private env: any) {
    // Initialize the Durable Object
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle SSE connection requests
    if (path === "/connect" && request.method === "POST") {
      return this.handleConnect(request);
    }

    // Handle message requests
    if (path === "/message" && request.method === "POST") {
      return this.handleMessage(request);
    }

    // Handle disconnect requests
    if (path === "/disconnect" && request.method === "POST") {
      return this.handleDisconnect();
    }

    // Handle other requests
    return new Response("Not found", { status: 404 });
  }

  /**
   * Handle SSE connection requests
   */
  private async handleConnect(request: Request): Promise<Response> {
    console.log("Handling connect request in Durable Object");

    // If there's already an active connection, close it
    if (this.active) {
      await this.cleanup();
    }
    
    // Get the sessionId from the URL if provided
    const url = new URL(request.url);
    const sessionIdFromUrl = url.searchParams.get("sessionId");
    if (sessionIdFromUrl) {
      console.log(`Using sessionId from URL: ${sessionIdFromUrl}`);
    }

    try {
      // Create a new TransformStream for the SSE connection
      const { readable, writable } = new TransformStream();
      this.writer = writable.getWriter();

      // Create a response with the appropriate headers for SSE
      const response = new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });

      // Create a custom ServerResponse-like object that works with SSEServerTransport
      const customResponse = {
        write: async (data: string) => {
          try {
            if (this.writer) {
              await this.writer.write(new TextEncoder().encode(data));
            }
          } catch (error) {
            console.error("Error writing to SSE stream:", error);
          }
        },
        end: async () => {
          try {
            if (this.writer) {
              await this.writer.close();
              this.writer = null;
            }
          } catch (error) {
            console.error("Error closing SSE stream:", error);
          }
        },
        writeHead: (statusCode: number, headers: Record<string, string>) => {
          // Headers are already set in the response
        },
        setHeader: (name: string, value: string) => {
          // Headers are already set in the response
        },
        getHeader: (name: string) => {
          // Return a mock header value
          return null;
        },
        getHeaderNames: () => {
          // Return mock header names
          return [];
        },
        hasHeader: (name: string) => {
          // Return mock header existence
          return false;
        },
        removeHeader: (name: string) => {
          // Mock header removal
        },
        statusCode: 200,
        // Event handlers
        _eventHandlers: new Map<string, Function[]>(),
        on: function(event: string, handler: Function) {
          if (!this._eventHandlers.has(event)) {
            this._eventHandlers.set(event, []);
          }
          this._eventHandlers.get(event)?.push(handler);
        },
        removeListener: function(event: string, handler: Function) {
          const handlers = this._eventHandlers.get(event);
          if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
              handlers.splice(index, 1);
            }
          }
        },
        emit: function(event: string, ...args: any[]) {
          const handlers = this._eventHandlers.get(event);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(...args);
              } catch (error) {
                console.error(`Error in ${event} handler:`, error);
              }
            });
          }
        }
      };

      // Create a new SSEServerTransport instance
      // @ts-ignore - We're using a custom response object that doesn't match the expected type
      this.transport = new SSEServerTransport("/message", customResponse) as SSEServerTransport;
      
      // Set up error handling for the transport
      this.transport.onerror = (error) => {
        console.error("SSE transport error:", error);
        // Try to clean up
        this.cleanup().catch(console.error);
      };
      
      // Get the server instance
      this.server = createServer(this.env.TAVILY_API_KEY).server;
      
      // Connect the transport to the server
      await this.server.connect(this.transport);
      
      this.active = true;
      
      // Store session state in Durable Object storage
      await this.state.storage.put('active', this.active);
      
      // Set up cleanup when the client disconnects
      this.server.onclose = async () => {
        try {
          await this.cleanup();
          console.log("Client disconnected");
        } catch (error) {
          console.error("Error during client disconnect:", error);
        }
      };

      // Return the response
      return response;
    } catch (error) {
      console.error("Error setting up SSE connection:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  /**
   * Handle message requests
   */
  private async handleMessage(request: Request): Promise<Response> {
    console.log("Handling message request in Durable Object");

    try {
      // Parse the request body
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        console.error("Error parsing request body:", parseError);
        return new Response("Invalid JSON in request body", { status: 400 });
      }

      // Create a message object
      const message: Message = {
        id: crypto.randomUUID(),
        content: body,
        timestamp: Date.now()
      };
      
      console.log(`Processing message ${message.id} in Durable Object`);
      
      // If there's an active connection, send the message immediately
      if (this.active && this.transport) {
        try {
          // Log the message content for debugging
          console.log(`Sending message content: ${JSON.stringify(message.content)}`);
          
          // Send the message through the SSE connection
          await this.transport.handleMessage(message.content);
          console.log(`Sent message ${message.id} to client via SSE`);
          
          // Return a success response
          return new Response("Message sent via SSE", { status: 200 });
        } catch (error) {
          console.error(`Error sending message to client: ${error}`);
          
          // Store the message for later delivery if sending fails
          this.messages.push(message);
          
          // Store messages in Durable Object storage
          await this.state.storage.put('messages', this.messages);
          
          console.log(`Stored message ${message.id} for later delivery`);
          
          return new Response("Message accepted but could not be sent immediately", { status: 202 });
        }
      } else {
        // No active connection, store the message for later delivery
        this.messages.push(message);
        
        // Store messages in Durable Object storage
        await this.state.storage.put('messages', this.messages);
        
        console.log(`No active connection. Stored message ${message.id} for later delivery`);
        
        return new Response("Message accepted for later delivery", { status: 202 });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  /**
   * Handle disconnect requests
   */
  private async handleDisconnect(): Promise<Response> {
    console.log("Handling disconnect request in Durable Object");

    try {
      await this.cleanup();
      return new Response("Disconnected", { status: 200 });
    } catch (error) {
      console.error("Error handling disconnect:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    console.log("Cleaning up resources in Durable Object");

    try {
      // Close the server
      if (this.server) {
        await this.server.close();
        this.server = null;
      }
    } catch (error) {
      console.error("Error closing server:", error);
    }

    try {
      // Close the writer
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
    } catch (error) {
      console.error("Error closing writer:", error);
    }

    try {
      // Clear the transport
      this.transport = null;

      // Clear the active flag
      this.active = false;
      
      // Update storage
      await this.state.storage.put('active', false);

      // Abort any pending operations
      this.abortController.abort();
      this.abortController = new AbortController();
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}
