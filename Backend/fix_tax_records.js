const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: __dirname + '/.env' });

const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const MONGODB_URI = process.env.MONGODB_URI_BASE.replace('PASSWORD', MONGODB_PASSWORD);

const TaxRecord = require('./src/models/TaxRecord');

async function fixTaxRecords() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        console.log('Finding tax records with overpayments...');
        // Find records where paidAmount is strictly greater than amount
        const overpaidRecords = await TaxRecord.find({ 
            $expr: { $gt: ["$paidAmount", "$amount"] } 
        });

        console.log(`Found ${overpaidRecords.length} records with overpayments.`);

        let count = 0;
        for (const record of overpaidRecords) {
            console.log(`Fixing TAN: ${record.taxAccountNumber} - Paid: ${record.paidAmount}, Due: ${record.amount}`);
            record.paidAmount = record.amount;
            if (record.paidAmount >= record.amount) {
                record.status = 'Paid';
            }
            await record.save();
            count++;
        }

        console.log(`Successfully fixed ${count} records.`);
    } catch (error) {
        console.error('Error fixing tax records:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database.');
        process.exit(0);
    }
}

fixTaxRecords();
