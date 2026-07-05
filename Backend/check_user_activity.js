const mongoose = require('mongoose');

async function checkAuditLogs() {
    try {
        await mongoose.connect('mongodb://localhost:27017/house-taxation');

        const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));

        // Search audit logs by userName field
        const searchTerm = 'audit_admin_1765349743722@example.com';
        console.log('Searching audit logs for:', searchTerm);

        const logsByUserName = await AuditLog.find({
            userName: searchTerm
        }).sort({ createdAt: -1 });

        console.log('\n=== AUDIT LOGS BY USERNAME ===');
        console.log('Total activities:', logsByUserName.length);

        if (logsByUserName.length > 0) {
            console.log('\nActivities:');
            logsByUserName.forEach((log, i) => {
                const date = new Date(log.createdAt).toLocaleString();
                console.log(`\n${i + 1}. [${date}]`);
                console.log(`   Action: ${log.action}`);
                console.log(`   Details: ${log.details}`);
                if (log.targetType) console.log(`   Target: ${log.targetType} ${log.targetName ? '(' + log.targetName + ')' : ''}`);
                if (log.severity) console.log(`   Severity: ${log.severity}`);
                if (log.ipAddress) console.log(`   IP: ${log.ipAddress}`);
            });
        } else {
            console.log('\nNo activities found for this user.');

            // Show all recent audit logs to help identify the pattern
            console.log('\n=== RECENT AUDIT LOGS (Last 10) ===');
            const recentLogs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(10);
            recentLogs.forEach((log, i) => {
                const date = new Date(log.createdAt).toLocaleString();
                console.log(`${i + 1}. [${date}] ${log.userName} - ${log.action}: ${log.details}`);
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkAuditLogs();
