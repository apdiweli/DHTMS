/**
 * TAN (Tax Account Number) Generator
 * Generates unique tax account numbers in format: TAN-YYYY-XXXXXX
 * Example: TAN-2025-000001
 */

const TaxRecord = require('../models/TaxRecord');

/**
 * Generate a unique TAN for a tax record
 * @param {number} year - The tax year
 * @returns {Promise<string>} The generated TAN
 */
async function generateTAN(year = new Date().getFullYear()) {
    try {
        // Find the latest TAN for the given year
        const latestRecord = await TaxRecord.findOne({
            taxAccountNumber: new RegExp(`^TAN-${year}-`)
        }).sort({ createdAt: -1 });

        let sequenceNumber = 1;

        if (latestRecord && latestRecord.taxAccountNumber) {
            // Extract the sequence number from the last TAN
            const parts = latestRecord.taxAccountNumber.split('-');
            if (parts.length === 3) {
                sequenceNumber = parseInt(parts[2]) + 1;
            }
        }

        // Format: TAN-YYYY-XXXXXX (6 digits with leading zeros)
        const tan = `TAN-${year}-${sequenceNumber.toString().padStart(6, '0')}`;

        return tan;
    } catch (error) {
        console.error('Error generating TAN:', error);
        throw new Error('Failed to generate TAN');
    }
}

module.exports = { generateTAN };
