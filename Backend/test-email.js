require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n=== EMAIL CONFIGURATION TEST ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || '❌ NOT SET');
console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || '❌ NOT SET');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ SET (hidden)' : '❌ NOT SET');
console.log('');

// Check if configured
const isConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
console.log('2. Configuration Status:', isConfigured ? '✓ CONFIGURED' : '❌ NOT CONFIGURED');
console.log('');

if (!isConfigured) {
    console.log('❌ Email is not properly configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env file');
    process.exit(1);
}

// Create transporter
console.log('3. Creating Email Transporter...');
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true, // Enable debug output
    logger: true // Log to console
});

// Test connection
console.log('4. Testing SMTP Connection...');
transporter.verify(function (error, success) {
    if (error) {
        console.log('\n❌ SMTP CONNECTION FAILED:');
        console.log('   Error:', error.message);
        console.log('');

        if (error.message.includes('Invalid login')) {
            console.log('💡 SOLUTION: Your Gmail password is incorrect or you need an App Password');
            console.log('   If you have 2FA enabled on Gmail:');
            console.log('   1. Go to https://myaccount.google.com/apppasswords');
            console.log('   2. Create an App Password');
            console.log('   3. Update EMAIL_PASS in .env with the 16-character password');
            console.log('   4. Restart the server');
        }

        process.exit(1);
    } else {
        console.log('✓ SMTP Connection Successful!');
        console.log('');

        // Send test email
        console.log('5. Sending Test Email...');
        const testEmail = {
            from: process.env.EMAIL_FROM || `"Tax System" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'Test Email - House Tax System',
            html: `
                <h2>✓ Email System Working!</h2>
                <p>This is a test email from your House Taxation Management System.</p>
                <p>If you received this, your email configuration is correct.</p>
                <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            `
        };

        transporter.sendMail(testEmail, (err, info) => {
            if (err) {
                console.log('❌ Failed to send test email:', err.message);
                process.exit(1);
            } else {
                console.log('✓ Test email sent successfully!');
                console.log('   Message ID:', info.messageId);
                console.log('   Check your inbox:', process.env.EMAIL_USER);
                console.log('');
                console.log('=== EMAIL SYSTEM IS WORKING ===');
                process.exit(0);
            }
        });
    }
});
