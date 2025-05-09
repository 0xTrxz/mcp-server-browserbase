#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { ensureLogDirectory, registerExitHandlers, scheduleLogRotation, setupLogRotation } from "./logging.js";
import http from 'http';

// Run setup for logging
ensureLogDirectory();
setupLogRotation();
scheduleLogRotation();
registerExitHandlers();

// Run the server
async function runServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // For Railway deployment - use PORT env var or default to 8080
  const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
  
  // Create a simple HTTP server to satisfy Railway
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Stagehand MCP Server running. Connect using MCP client.');
  });
  
  httpServer.listen(port, '0.0.0.0', () => {
    server.sendLoggingMessage({
      level: "info",
      data: `Stagehand MCP server HTTP listener started on port ${port}`,
    });
  });
  
  server.sendLoggingMessage({
    level: "info",
    data: "Stagehand MCP server is ready to accept requests",
  });
}

runServer().catch((error) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(errorMsg);
});
