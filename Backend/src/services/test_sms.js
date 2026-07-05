require('dotenv').config();
const { Vonage } = require('@vonage/server-sdk');

async function test() {
    console.log("Testing Vonage SMS directly...");
    const vonage = new Vonage({
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET
    });

    try {
        const resp = await vonage.sms.send({
            to: '252615555555',
            from: 'Vonage APIs',
            text: 'Test SMS from backend'
        });
        console.log("Success:", JSON.stringify(resp, null, 2));
    } catch (err) {
        console.log("Error details:");
        console.log(JSON.stringify(err.response, null, 2));
    }
}
test();
