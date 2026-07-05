const nodemailer = require('nodemailer');

// Check if email is configured
const isEmailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

let transporter = null;

if (isEmailConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    console.log('[Email Service] Email configured with host:', process.env.EMAIL_HOST);
} else {
    console.warn('[Email Service] Email not configured - will use mock mode. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env file');
}

async function sendEmail(to, subject, html) {
    if (!to) {
        console.warn('[Email Service] No recipient email provided. Skipping.');
        return;
    }

    // If email is not configured, log to console
    if (!isEmailConfigured) {
        console.log('\n=== [Email Service - Mock Mode] ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('--- HTML Content (truncated) ---');
        console.log(html.substring(0, 200) + '...');
        console.log('===================================\n');
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Tax System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`[Email Service] ✓ Email sent successfully to ${to} | Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[Email Service] ✗ Error sending email:', error.message);
        throw error;
    }
}

module.exports = { sendEmail };
