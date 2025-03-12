import { ExecutionContext, DurableObjectNamespace, DurableObjectStub } from "@cloudflare/workers-types";
import { SessionDO } from "./session-do.js";

// Define the environment interface
interface Env {
  TAVILY_API_KEY: string;
  API_KEY: string; // API key for Bearer token authentication
  SESSION_DO: DurableObjectNamespace;
  [key: string]: any;
}

export { SessionDO };

/**
 * Verifies the Bearer token in the Authorization header
 */
function verifyBearerToken(request: Request, env: Env): boolean {
  // Get the Authorization header
  const authHeader = request.headers.get('Authorization');
  
  // Check if the header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  // Extract the token
  const token = authHeader.substring(7);
  
  // Verify the token against the API_KEY
  return token === env.API_KEY;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle SSE connection requests
    if (path === "/sse" && request.method === "GET") {
      return handleSSERequest(request, env, ctx);
    }

    // Handle message requests
    if (path === "/message" && request.method === "POST") {
      return handleMessageRequest(request, env, ctx);
    }

    // Handle other requests
    return new Response("Not found", { status: 404 });
  }
};

/**
 * Handles SSE connection requests
 */
async function handleSSERequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  console.log("Received SSE connection request");

  // Verify Bearer token authentication
  if (!verifyBearerToken(request, env)) {
    console.log("Authentication failed for SSE connection request");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get the Durable Object stub for this session
    const sessionDO = getSessionDO(env, "test");
    
    // Forward the request to the Durable Object
    // Pass the sessionId in the URL to ensure the Durable Object uses the same sessionId
    const doRequest = new Request(`https://session-do/connect`, {
      method: "POST",
      headers: request.headers,
      body: request.body
    });
    
    // Get the response from the Durable Object
    // @ts-ignore - Type compatibility issues between Cloudflare Workers types and standard types
    const response = await sessionDO.fetch(doRequest);
    
    // Return the response directly
    // @ts-ignore - Type compatibility issues between Cloudflare Workers types and standard types
    return response;
  } catch (error) {
    console.error("Error setting up SSE connection:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

/**
 * Handles message requests
 */
async function handleMessageRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  console.log("Received message request");

  try {
    // Get the Durable Object stub for this session
    const sessionDO = getSessionDO(env, "test");
    
    // Forward the request to the Durable Object
    const doRequest = new Request(`https://session-do/message`, {
      method: "POST",
      headers: request.headers,
      body: request.body
    });
    
    // Return the response from the Durable Object
    // @ts-ignore - Type compatibility issues between Cloudflare Workers types and standard types
    return sessionDO.fetch(doRequest);
  } catch (error) {
    console.error("Error handling message:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

/**
 * Gets the Durable Object stub for a session
 */
function getSessionDO(env: Env, sessionName: string): DurableObjectStub {
  const id = env.SESSION_DO.idFromName(sessionName);
  
  // Get the Durable Object stub
  return env.SESSION_DO.get(id);
}
