const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testAPI = async () => {
    try {
        console.log('Testing Root Endpoint...');
        const rootRes = await axios.get('http://localhost:5000/');
        console.log('Root Endpoint Success:', rootRes.data);

        console.log('Testing Registration...');
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test Admin',
            email: `admin${Date.now()}@test.com`,
            password: 'password123',
            role: 'Super Admin'
        });
        console.log('Registration Success:', registerRes.data.email);
        const token = registerRes.data.token;

        console.log('Testing Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: registerRes.data.email,
            password: 'password123'
        });
        console.log('Login Success:', loginRes.data.email);

        console.log('Testing Create Owner...');
        const ownerRes = await axios.post(`${API_URL}/owners`, {
            id: `OWN-${Date.now()}`,
            name: 'Test Owner',
            type: 'Individual',
            contact: 'owner@test.com',
            phone: '1234567890',
            district: 'Hodan'
        });
        console.log('Create Owner Success:', ownerRes.data.name);

        console.log('Testing Create Property...');
        const propertyRes = await axios.post(`${API_URL}/properties`, {
            ownerId: ownerRes.data._id,
            address: '123 Test St',
            value: 50000,
            district: 'Hodan'
        });
        console.log('Create Property Success:', propertyRes.data.address);

        console.log('ALL TESTS PASSED');
    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
    }
};

testAPI();
