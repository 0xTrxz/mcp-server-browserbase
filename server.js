// Simple Express server for Railway deployment
const express = require('express');
const { spawn } = require('child_process');
const app = express();

// Get PORT from environment (critical for Railway)
const port = process.env.PORT || 8080;

// Log all environment variables for debugging (redacted for security)
console.log('Environment variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
    console.log(`${key}: [REDACTED]`);
  } else {
    console.log(`${key}: ${process.env[key]}`);
  }
});

// Add middleware
app.use(express.json());

// Spawn the MCP server processes
let browserbaseProcess = null;
let stagehandProcess = null;

function startMcpServers() {
  console.log('Starting MCP server processes...');
  
  // Only start processes if API keys are available
  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    console.log('⚠️ Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID - skipping MCP server startup');
    return;
  }
  
  // Start browserbase with inherited environment
  browserbaseProcess = spawn('node', ['browserbase/dist/index.js'], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  browserbaseProcess.stdout.on('data', (data) => {
    console.log(`[Browserbase] ${data}`);
  });
  
  browserbaseProcess.stderr.on('data', (data) => {
    console.error(`[Browserbase Error] ${data}`);
  });
  
  browserbaseProcess.on('close', (code) => {
    console.log(`Browserbase process exited with code ${code}`);
    browserbaseProcess = null;
  });
  
  // Start stagehand
  stagehandProcess = spawn('node', ['stagehand/dist/index.js'], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  stagehandProcess.stdout.on('data', (data) => {
    console.log(`[Stagehand] ${data}`);
  });
  
  stagehandProcess.stderr.on('data', (data) => {
    console.error(`[Stagehand Error] ${data}`);
  });
  
  stagehandProcess.on('close', (code) => {
    console.log(`Stagehand process exited with code ${code}`);
    stagehandProcess = null;
  });
}

// Start MCP servers on startup
startMcpServers();

// Root endpoint
app.get('/', (req, res) => {
  res.send(`MCP Server is running on port ${port}. Use MCP client to connect.`);
});

// MCP status endpoint
app.get('/status', (req, res) => {
  const status = {
    browserbase: browserbaseProcess ? 'running' : 'stopped',
    stagehand: stagehandProcess ? 'running' : 'stopped',
    uptime: process.uptime(),
    port: port,
    environment: process.env.NODE_ENV || 'development'
  };
  res.json(status);
});

// Restart MCP servers
app.post('/restart', (req, res) => {
  console.log('Restart requested');
  
  if (browserbaseProcess) {
    browserbaseProcess.kill();
  }
  
  if (stagehandProcess) {
    stagehandProcess.kill();
  }
  
  startMcpServers();
  res.json({ status: 'restarting' });
});

// Start the Express server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running at http://0.0.0.0:${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  
  if (browserbaseProcess) {
    browserbaseProcess.kill();
  }
  
  if (stagehandProcess) {
    stagehandProcess.kill();
  }
  
  server.close(() => {
    console.log('Express server closed');
    process.exit(0);
  });
}); 