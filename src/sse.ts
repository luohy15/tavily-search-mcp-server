import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createServer } from "./tavily.js";

const app = express();

const { server } = createServer();

let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
    console.log("Received connection");
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);

    server.onclose = async () => {
        await server.close();
        console.log("Client disconnected");
    };
});

app.post("/message", async (req, res) => {
    console.log("Received message");
    await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});