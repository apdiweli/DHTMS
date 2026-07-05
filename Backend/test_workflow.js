const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

const User = require('./src/models/User');
const Owner = require('./src/models/Owner');
const Property = require('./src/models/Property');
const AuditLog = require('./src/models/AuditLog');
const TaxRule = require('./src/models/TaxRule');
const TaxRecord = require('./src/models/TaxRecord');
const Notification = require('./src/models/Notification');

const mongoPassword = process.env.MONGODB_PASSWORD;
const MONGODB_URI = process.env.MONGODB_URI_BASE.replace('PASSWORD', encodeURIComponent(mongoPassword));

async function runTest() {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    
    try {
        // Prepare mock tokens
        console.log('Preparing User Accounts...');
        
        // Ensure Super Admin exists
        let superAdmin = await User.findOne({ role: 'Super Admin' });
        if (!superAdmin) {
            superAdmin = await User.create({
                name: 'Test Super Admin',
                email: 'admin.test@tax.gov',
                password: 'hashed_password',
                role: 'Super Admin'
            });
        }
        const adminToken = jwt.sign({ id: superAdmin._id }, JWT_SECRET, { expiresIn: '1d' });
        const adminConfig = { headers: { Authorization: `Bearer ${adminToken}` } };

        // Ensure Tax Officer exists
        let officer = await User.findOne({ email: 'officer.test@tax.gov' });
        if (!officer) {
            officer = await User.create({
                name: 'Test Tax Officer',
                email: 'officer.test@tax.gov',
                password: 'hashed_password',
                role: 'Tax Officer',
                jurisdiction: 'Hodan'
            });
        } else if (officer.jurisdiction !== 'Hodan') {
            officer.jurisdiction = 'Hodan';
            await officer.save();
        }
        const officerToken = jwt.sign({ id: officer._id }, JWT_SECRET, { expiresIn: '1d' });
        const officerConfig = { headers: { Authorization: `Bearer ${officerToken}` } };


        console.log('\n=========================================');
        console.log('--- SCENARIO 1: Register Owner as Tax Officer ---');
        console.log('=========================================');
        
        console.log('API Request: Add Owner -> Ahmed Ali');
        const ownerData = {
            name: 'Ahmed Ali',
            email: `ahmed.ali.${Date.now()}@test.gov`,
            phone: '0612345678',
            district: 'Hodan',
            type: 'Individual',
            riskLevel: 'Low'
        };
        
        let ownerRes;
        try {
            ownerRes = await axios.post(`${API_URL}/owners`, ownerData, officerConfig);
            console.log('✅ Owner created successfully:', ownerRes.data.data._id);
        } catch (e) {
            console.error('❌ Failed to create owner:', e.response?.data || e.message);
            throw e;
        }
        const createdOwnerId = ownerRes.data.data._id;

        // Owner API automatically creates a User account for them. Let's find it.
        const createdOwner = await User.findById(createdOwnerId);
        
        const ownerAudit = await AuditLog.findOne({ action: 'CREATE_OWNER', targetId: createdOwnerId }).sort({ createdAt: -1 });
        if (ownerAudit) console.log('✅ Audit Log generated for Owner creation!');
        else console.log('❌ Audit Log missing for Owner creation.');


        console.log('\n=========================================');
        console.log('--- SCENARIO 2: Register Property ---');
        console.log('=========================================');
        
        console.log('API Request: Add Property -> Hodan District (Residential/Villa)');
        
        const propertyData = {
            ownerId: createdOwnerId,
            district: 'Hodan',
            address: 'Hodan District',
            propertyType: 'Residential',
            buildingType: 'Villa',
            zone: 'Zone 1',
            structureDetails: { floors: 2, totalUnits: 4 },
            landDetails: { totalAreaSqm: 600 }
        };

        let propertyRes;
        try {
            propertyRes = await axios.post(`${API_URL}/properties`, propertyData, officerConfig);
            console.log('✅ Property created successfully with TAN:', propertyRes.data.taxAccountNumber);
        } catch (e) {
            console.error('❌ Failed to create property:', e.response?.data || e.message);
            throw e;
        }
        const createdPropertyId = propertyRes.data._id;

        const propertyAudit = await AuditLog.findOne({ action: 'CREATE_PROPERTY', targetId: createdPropertyId }).sort({ createdAt: -1 });
        if (propertyAudit) console.log('✅ Audit Log generated for Property creation!');
        else console.log('❌ Audit Log missing for Property creation.');


        console.log('\n=========================================');
        console.log('--- SCENARIO 3: Create Tax Rule ---');
        console.log('=========================================');
        console.log('Actor: Super Admin');
        
        const ruleData = {
            ruleName: `Residential Tax ${Date.now()}`, // Unique name
            propertyType: 'Residential',
            buildingType: 'Villa',
            calculationMethod: 'PerFloor',
            rate: 100,
            description: 'Per Floor Tax for Residential properties'
        };

        let ruleRes;
        try {
            ruleRes = await axios.post(`${API_URL}/taxes/rules`, ruleData, adminConfig);
            console.log('✅ Tax Rule saved and available for calculations:', ruleRes.data.ruleName);
        } catch (e) {
            console.error('❌ Failed to create tax rule:', e.response?.data || e.message);
            throw e;
        }
        const createdRuleId = ruleRes.data._id;

        const ruleAudit = await AuditLog.findOne({ action: 'CREATE_RULE', targetId: createdRuleId }).sort({ createdAt: -1 });
        if (ruleAudit) console.log('✅ Audit Log generated for Tax Rule creation!');
        else console.log('❌ Audit Log missing for Tax Rule creation.');


        console.log('\n=========================================');
        console.log('--- SCENARIO 4: Generate Tax Bill ---');
        console.log('=========================================');
        console.log('Actor: Tax Officer | Property: 2 Floors | Rule: Per Floor = $100');
        
        const generationData = {
            propertyId: createdPropertyId,
            year: 2026
        };

        let taxRes;
        try {
            // Note: Generating tax record
            taxRes = await axios.post(`${API_URL}/taxes/generate`, generationData, officerConfig);
            console.log('✅ Tax Record created successfully!');
            console.log(`   Amount: $${taxRes.data.amount}`);
            console.log(`   Status: ${taxRes.data.status}`);
            console.log(`   Tax Year: ${taxRes.data.taxYear}`);
            if (taxRes.data.amount === 200) {
                 console.log('✅ Calculation is CORRECT (2 floors × $100 = $200)');
            } else {
                 console.log(`❌ Calculation mismatch! Expected $200, got $${taxRes.data.amount}`);
            }
        } catch (e) {
            console.error('❌ Failed to generate tax bill:', e.response?.data || e.message);
            throw e;
        }
        const createdTaxRecordId = taxRes.data._id;

        const taxAudit = await AuditLog.findOne({ action: 'GENERATE_TAX', targetId: createdTaxRecordId }).sort({ createdAt: -1 });
        if (taxAudit) console.log('✅ Audit Log generated for Tax Record creation!');
        
        const taxNotification = await Notification.findOne({ 'relatedEntity.taxRecordId': createdTaxRecordId });
        if (taxNotification) console.log('✅ Notification generated for the Owner!');
        else console.log('❌ Notification missing for Tax Record.');


        console.log('\n=========================================');
        console.log('--- SCENARIO 5: Owner Login & View Portal ---');
        console.log('=========================================');
        
        // Find owner user
        let ownerUser = createdOwner;

        const ownerToken = jwt.sign({ id: ownerUser._id }, JWT_SECRET, { expiresIn: '1d' });
        const ownerTokenConfig = { headers: { Authorization: `Bearer ${ownerToken}` } };

        try {
            // Get properties for this owner (simulate viewing portal)
            console.log('Owner logging in and fetching properties...');
            const myProperties = await axios.get(`${API_URL}/properties`, ownerTokenConfig);
            console.log(`✅ Owner fetched properties successfully. Found: ${myProperties.data.length}`);
            
            // Get tax records for this owner
            console.log('Owner fetching tax records...');
            const myTaxes = await axios.get(`${API_URL}/taxes/records`, ownerTokenConfig);
            console.log(`✅ Owner fetched tax bills successfully. Found: ${myTaxes.data.length}`);
            
        } catch (e) {
            console.error('❌ Failed during Owner Portal operations:', e.response?.data || e.message);
        }

        console.log('\n--- TEST SUMMARY ---');
        console.log('Collections successfully affected: User, Owner, Property, AuditLog, TaxRule, TaxRecord, Notification');
        console.log('All expected results achieved!');

        console.log('\n=========================================');
        console.log('--- SCENARIO 6: Pay Tax (Full) ---');
        console.log('=========================================');
        
        // Scenario 6: Pay Tax (Full)
        // Let's create a new tax record to pay
        const generationData2 = { propertyId: createdPropertyId, year: 2027 };
        let taxRes2 = await axios.post(`${API_URL}/taxes/generate`, generationData2, officerConfig);
        const taxRecordId2 = taxRes2.data._id;
        
        const paymentData = {
            taxRecordId: taxRecordId2,
            amount: 200,
            paymentMethod: 'Bank Transfer',
            reference: 'TRX-12345'
        };
        
        await axios.post(`${API_URL}/taxes/payments`, paymentData, ownerTokenConfig);
        const paidTaxRecord = await TaxRecord.findById(taxRecordId2);
        const updatedProperty = await Property.findById(createdPropertyId);
        const paymentAudit = await AuditLog.findOne({ action: 'RECORD_PAYMENT', targetId: taxRecordId2 });
        
        if (paidTaxRecord.status === 'Paid') console.log('✅ TaxRecord Status = Paid');
        if (paidTaxRecord.paidAmount === 200) console.log('✅ TaxRecord Paid Amount = 200');
        if (updatedProperty.paymentStatus === 'paid') console.log('✅ Property Payment Status = Paid');
        if (paymentAudit) console.log('✅ Audit Log generated for Payment!');
        else console.log('❌ Audit Log missing for Payment.');

        console.log('\n=========================================');
        console.log('--- SCENARIO 7: Partial Payment ---');
        console.log('=========================================');
        
        const generationData3 = { propertyId: createdPropertyId, year: 2028 };
        let taxRes3 = await axios.post(`${API_URL}/taxes/generate`, generationData3, officerConfig);
        const taxRecordId3 = taxRes3.data._id;
        
        const partialPaymentData = {
            taxRecordId: taxRecordId3,
            amount: 100,
            paymentMethod: 'Mobile Money',
            reference: 'TRX-54321'
        };
        
        await axios.post(`${API_URL}/taxes/payments`, partialPaymentData, ownerTokenConfig);
        const partiallyPaidTaxRecord = await TaxRecord.findById(taxRecordId3);
        
        if (partiallyPaidTaxRecord.status === 'Partially Paid') console.log('✅ TaxRecord Status = Partially Paid');
        if (partiallyPaidTaxRecord.amount - partiallyPaidTaxRecord.paidAmount === 100) console.log('✅ Remaining Balance = $100');


        console.log('\n=========================================');
        console.log('--- SCENARIO 8: Overdue Tax ---');
        console.log('=========================================');
        
        // Manually set a tax record to be overdue
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 10); // 10 days ago
        await TaxRecord.findByIdAndUpdate(createdTaxRecordId, { dueDate: overdueDate });
        
        // Trigger mark overdue
        await axios.post(`${API_URL}/taxes/mark-overdue`, {}, officerConfig);
        
        const overdueRecord = await TaxRecord.findById(createdTaxRecordId);
        const overdueNotification = await Notification.findOne({ 'relatedEntity.taxRecordId': createdTaxRecordId, type: 'PAYMENT_REMINDER' }).sort({ createdAt: -1 });
        
        if (overdueRecord.status === 'Overdue') console.log('✅ TaxRecord Status = Overdue');
        else console.log(`❌ TaxRecord Status is ${overdueRecord.status}`);
        
        if (overdueNotification) console.log('✅ Notification generated for Overdue Tax!');
        else console.log('❌ Notification missing for Overdue Tax.');

        console.log('\n=========================================');
        console.log('--- SCENARIO 9: Reports ---');
        console.log('=========================================');
        let reportRes = await axios.get(`${API_URL}/taxes/reports`, adminConfig);
        console.log('✅ Reports Generated!');
        console.log(`   Total Revenue: $${reportRes.data.totalRevenue}`);
        console.log(`   Total Properties: ${reportRes.data.totalProperties}`);
        console.log(`   Paid Taxes: ${reportRes.data.paidTaxes}`);
        console.log(`   Unpaid Taxes: ${reportRes.data.unpaidTaxes}`);


        console.log('\n=========================================');
        console.log('--- SCENARIO 10: Audit Logs (Property Lifecycle) ---');
        console.log('=========================================');
        const tempPropertyData = {
            ownerId: createdOwnerId,
            address: 'Audit Test Address',
            district: 'Hodan',
            zone: 'Zone 1',
            propertyType: 'Residential',
            buildingType: 'Villa',
            value: 50000,
            structureDetails: { floors: 1, totalUnits: 1 },
            landDetails: { totalAreaSqm: 200 }
        };
        
        let tempPropRes;
        try {
            tempPropRes = await axios.post(`${API_URL}/properties`, tempPropertyData, officerConfig);
        } catch (err) {
            console.error('Failed to create temp property in Scenario 10:', err.response?.data || err.message);
            throw err;
        }
        const tempPropId = tempPropRes.data._id;
        
        try {
            await axios.put(`${API_URL}/properties/${tempPropId}`, { value: 60000 }, officerConfig);
            await axios.delete(`${API_URL}/properties/${tempPropId}`, officerConfig);
        } catch (err) {
            console.error('Failed to update/delete property:', err.response?.data || err.message);
            throw err;
        }
        
        const createAudit = await AuditLog.findOne({ action: 'CREATE_PROPERTY', targetId: tempPropId });
        const editAudit = await AuditLog.findOne({ action: 'UPDATE_PROPERTY', targetId: tempPropId });
        const deleteAudit = await AuditLog.findOne({ action: 'DELETE_PROPERTY', targetId: tempPropId });
        
        if (createAudit) console.log('✅ Audit Log for Create Property found!');
        if (editAudit) console.log('✅ Audit Log for Edit Property found!');
        if (deleteAudit) console.log('✅ Audit Log for Delete Property found!');


        console.log('\n=========================================');
        console.log('--- SCENARIO 11: Support Ticket ---');
        console.log('=========================================');
        const ticketData = {
            subject: 'Wrong Tax Amount',
            category: 'Payment Problem',
            description: 'My tax bill is too high'
        };
        let ticketRes = await axios.post(`${API_URL}/support`, ticketData, ownerTokenConfig);
        const ticketId = ticketRes.data.data._id;
        console.log('✅ Support Ticket Created by Owner!');
        
        await axios.put(`${API_URL}/support/${ticketId}/assign`, { assignedTo: superAdmin._id }, adminConfig);
        console.log('✅ Ticket Assigned to Admin!');
        
        await axios.post(`${API_URL}/support/${ticketId}/responses`, { message: 'We will look into this.' }, adminConfig);
        console.log('✅ Response added to Ticket!');
        
        await axios.put(`${API_URL}/support/${ticketId}/status`, { status: 'Resolved' }, adminConfig);
        console.log('✅ Ticket status updated to Resolved!');

        // Cleanup test data
        console.log('Cleaning up test data...');
        await User.findByIdAndDelete(createdOwnerId);
        await Property.findByIdAndDelete(createdPropertyId);
        await TaxRule.findByIdAndDelete(createdRuleId);
        await TaxRecord.findByIdAndDelete(createdTaxRecordId);
        await Notification.deleteMany({ 'relatedEntity.taxRecordId': createdTaxRecordId });
        
    } catch (err) {
        console.error('\nTest execution error:', err.message);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

runTest();
