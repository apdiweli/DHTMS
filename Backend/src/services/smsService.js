const { Vonage } = require('@vonage/server-sdk');

// Check if Vonage is configured
const isVonageConfigured = process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET;

let vonage = null;

if (isVonageConfigured) {
    try {
        vonage = new Vonage({
            apiKey: process.env.VONAGE_API_KEY,
            apiSecret: process.env.VONAGE_API_SECRET
        });
        console.log('[SMS Service] Vonage Client initialized');
    } catch (error) {
        console.error('[SMS Service] Failed to initialize Vonage:', error.message);
    }
} else {
    console.warn('[SMS Service] Vonage not configured - will use mock mode. Set VONAGE_API_KEY and VONAGE_API_SECRET in .env');
}

async function sendSMS(to, message) {
    if (!to) {
        console.warn('[SMS Service] No recipient phone number provided. Skipping.');
        return;
    }

    // Mock Mode if not configured
    if (!isVonageConfigured || !vonage) {
        console.log('\n=== [SMS Service - Mock Mode] ===');
        console.log(`To: ${to}`);
        console.log(`Message: ${message}`);
        console.log('=================================\n');
        return;
    }

    try {
        const from = process.env.VONAGE_FROM || "TaxSystem";

        await vonage.sms.send({ to, from, text: message })
            .then(resp => {
                // Vonage returns status codes: 0 = success, anything else = failure
                const messageStatus = resp.messages[0].status;
                const messageId = resp.messages[0]['message-id'];

                if (messageStatus === '0') {
                    console.log(`[SMS Service] ✓ SMS sent successfully to ${to} | Message ID: ${messageId}`);
                } else {
                    // Failed to send
                    const errorText = resp.messages[0]['error-text'];
                    console.error(`[SMS Service] ✗ SMS failed to send to ${to}`);
                    console.error(`  Status: ${messageStatus}`);
                    console.error(`  Error: ${errorText}`);
                    console.error(`  Remaining Balance: ${resp.messages[0]['remaining-balance']}`);
                }
            })
            .catch(err => {
                console.error('[SMS Service] ✗ Error sending SMS:', err.message);
                if (err.response && err.response.messages && err.response.messages.length > 0) {
                    const msgError = err.response.messages[0];
                    console.error(`  Vonage Status: ${msgError.status}`);
                    console.error(`  Vonage Error: ${msgError['error-text'] || msgError.errorText}`);
                }
                if (err.code) console.error('  Code:', err.code);
            });

    } catch (error) {
        console.error('[SMS Service] ✗ Error sending SMS:', error.message);
        if (error.code) console.error('  Code:', error.code);
    }
}

module.exports = { sendSMS };
