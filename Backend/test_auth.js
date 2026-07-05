// Test Authentication and Authorization
// Run this file with: node test_auth.js

const baseURL = 'http://localhost:5000/api';

// Test 1: Login with valid credentials
async function testLogin() {
    console.log('\n=== Test 1: Login with Valid Credentials ===');
    try {
        const response = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@test.com',
                password: 'admin123'
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.token) {
            console.log('✓ Login successful! Token received.');
            return data.token;
        } else {
            console.log('✗ Login failed - no token received');
            return null;
        }
    } catch (error) {
        console.log('✗ Error:', error.message);
        return null;
    }
}

// Test 2: Access protected route without token
async function testNoToken() {
    console.log('\n=== Test 2: Access Protected Route Without Token ===');
    try {
        const response = await fetch(`${baseURL}/users`, {
            method: 'GET'
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 401) {
            console.log('✓ Correctly rejected - no token provided');
        } else {
            console.log('✗ Should have been rejected!');
        }
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
}

// Test 3: Access protected route with valid token
async function testWithToken(token) {
    console.log('\n=== Test 3: Access Protected Route With Valid Token ===');
    try {
        const response = await fetch(`${baseURL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 200) {
            console.log('✓ Successfully accessed protected route');
        } else {
            console.log('✗ Failed to access protected route');
        }
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
}

// Test 4: Access with invalid token
async function testInvalidToken() {
    console.log('\n=== Test 4: Access With Invalid Token ===');
    try {
        const response = await fetch(`${baseURL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer invalid_token_here'
            }
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 401) {
            console.log('✓ Correctly rejected - invalid token');
        } else {
            console.log('✗ Should have been rejected!');
        }
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
}

// Run all tests
async function runTests() {
    console.log('='.repeat(60));
    console.log('AUTHENTICATION & AUTHORIZATION TESTS');
    console.log('='.repeat(60));

    const token = await testLogin();
    await testNoToken();
    await testInvalidToken();

    if (token) {
        await testWithToken(token);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TESTS COMPLETED');
    console.log('='.repeat(60));
}

runTests();
