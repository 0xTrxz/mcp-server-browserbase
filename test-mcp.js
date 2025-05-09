// Simple test to verify Express server and MCP status
const http = require('http');
const https = require('https');

const testEndpoint = process.env.TEST_URL || 'http://localhost:8080';

console.log('=== MCP Server Test ===');
console.log(`Testing server at: ${testEndpoint}`);

// First test the root endpoint
testRootEndpoint(() => {
  // Then test the status endpoint
  testStatusEndpoint();
});

function testRootEndpoint(callback) {
  console.log('\n1. Testing root endpoint...');
  
  // Choose http or https module based on URL
  const client = testEndpoint.startsWith('https:') ? https : http;
  
  client.get(testEndpoint, (res) => {
    console.log(`HTTP Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response: ${data.trim()}`);
      if (res.statusCode === 200) {
        console.log('✅ Root endpoint is responding');
      } else {
        console.log('⚠️ Root endpoint returned non-200 status code');
      }
      
      // Continue to next test
      callback();
    });
  }).on('error', (err) => {
    console.error(`❌ Root endpoint test failed: ${err.message}`);
    // Try status endpoint anyway
    callback();
  });
}

function testStatusEndpoint() {
  const statusEndpoint = `${testEndpoint}/status`;
  console.log('\n2. Testing status endpoint...');
  
  // Choose http or https module based on URL
  const client = testEndpoint.startsWith('https:') ? https : http;
  
  client.get(statusEndpoint, (res) => {
    console.log(`HTTP Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response: ${data.trim()}`);
      try {
        const status = JSON.parse(data);
        console.log('\nServer Status:');
        console.log('- Browserbase Process:', status.browserbase);
        console.log('- Stagehand Process:', status.stagehand);
        console.log('- Server Uptime:', status.uptime, 'seconds');
        console.log('- Running on Port:', status.port);
        console.log('- Environment:', status.environment);
        
        if (status.browserbase === 'running' && status.stagehand === 'running') {
          console.log('\n✅ Express server is running and child processes are active!');
          console.log('\nMCP server should be ready for N8N integration!');
        } else if (status.browserbase === 'stopped' && status.stagehand === 'stopped') {
          console.log('\n⚠️ Express server is running but MCP processes are not running!');
          console.log('Check if BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are set correctly');
        } else {
          console.log('\n⚠️ Express server is running but some MCP processes are not running!');
        }
      } catch (e) {
        console.log('⚠️ Status endpoint returned invalid JSON:', e.message);
        if (data.includes('Application failed to respond')) {
          console.log('\n❌ Railway application is failing to respond. Deployment may still be in progress or failing.');
          console.log('Check Railway logs for more information.');
        }
      }
    });
  }).on('error', (err) => {
    console.error(`❌ Status endpoint test failed: ${err.message}`);
  });
} 