// Simple Express server for Railway deployment
const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 8080;

// Spawn the MCP server processes
let browserbaseProcess = null;
let stagehandProcess = null;

function startMcpServers() {
  console.log('Starting MCP server processes...');
  
  // Start browserbase
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

// Health check endpoint
app.get('/', (req, res) => {
  res.send('MCP Server is running. Connect using MCP client.');
});

// MCP status endpoint
app.get('/status', (req, res) => {
  const status = {
    browserbase: browserbaseProcess ? 'running' : 'stopped',
    stagehand: stagehandProcess ? 'running' : 'stopped',
    uptime: process.uptime()
  };
  res.json(status);
});

// Restart MCP servers
app.post('/restart', (req, res) => {
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
app.listen(port, '0.0.0.0', () => {
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
  
  process.exit(0);
}); 