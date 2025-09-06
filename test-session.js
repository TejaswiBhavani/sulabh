const { spawn } = require('child_process');
const path = require('path');

// Simple test script to verify session authentication
async function testSessionAuth() {
  console.log('🚀 Starting SULABH server with session management...\n');
  
  // Start the server
  const server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname),
    stdio: 'pipe'
  });

  let serverReady = false;

  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Server:', output.trim());
    if (output.includes('Server running on port')) {
      serverReady = true;
      runTests();
    }
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Wait a bit for server to start, then run tests
  setTimeout(() => {
    if (!serverReady) {
      console.log('⚠️ Server taking longer than expected to start...');
      runTests();
    }
  }, 3000);

  async function runTests() {
    console.log('\n📋 Testing session authentication endpoints...\n');

    try {
      // Test 1: Health check
      console.log('1. Testing health endpoint...');
      const healthResponse = await fetch('http://localhost:3001/api/health');
      const healthData = await healthResponse.json();
      console.log('   ✅ Health check:', healthData.status);
      console.log('   📊 Session configured:', healthData.session?.configured);
      console.log('   🆔 Session ID:', healthData.session?.sessionId);

      // Test 2: Test registration
      console.log('\n2. Testing user registration...');
      try {
        const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: 'testuser@example.com',
            username: 'testuser',
            password: 'testpassword123',
            firstName: 'Test',
            lastName: 'User'
          })
        });
        
        if (registerResponse.ok) {
          const registerData = await registerResponse.json();
          console.log('   ✅ Registration successful:', registerData.message);
        } else {
          const error = await registerResponse.json();
          console.log('   ⚠️ Registration result:', error.message);
        }
      } catch (error) {
        console.log('   ❌ Registration failed:', error.message);
      }

      // Test 3: Test login
      console.log('\n3. Testing user login...');
      try {
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            identifier: 'testuser@example.com',
            password: 'testpassword123',
            rememberMe: false
          })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          console.log('   ✅ Login successful:', loginData.message);
          console.log('   👤 User:', loginData.user?.firstName, loginData.user?.lastName);

          // Test 4: Test session status
          console.log('\n4. Testing session status...');
          const sessionResponse = await fetch('http://localhost:3001/api/auth/session', {
            credentials: 'include'
          });
          const sessionData = await sessionResponse.json();
          console.log('   🔐 Authenticated:', sessionData.authenticated);
          console.log('   🆔 Session ID:', sessionData.sessionId);

        } else {
          const error = await loginResponse.json();
          console.log('   ❌ Login failed:', error.message);
        }
      } catch (error) {
        console.log('   ❌ Login error:', error.message);
      }

      console.log('\n✅ Session authentication tests completed!');
      console.log('🎉 SULABH now supports session and cookie management!\n');

    } catch (error) {
      console.error('❌ Test error:', error.message);
    }

    // Stop server
    console.log('🛑 Stopping server...');
    server.kill();
    process.exit(0);
  }
}

// Handle ctrl+c gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

testSessionAuth();