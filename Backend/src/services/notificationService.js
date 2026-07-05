const Notification = require('../models/Notification');
const User = require('../models/User');

const emailService = require('./emailService');
const smsService = require('./smsService');

/**
 * Create a notification for a user
 */
async function createNotification(userId, type, title, message, relatedEntity = {}, priority = 'medium') {
    try {
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            relatedEntity,
            priority,
            isRead: false
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Notify property owner when tax is generated
 */
async function notifyTaxGenerated(taxRecord, property, owner) {
    try {
        const title = 'New Tax Generated';
        const message = `Tax of $${taxRecord.amount.toFixed(2)} has been generated for your property at ${property.address} for the year ${taxRecord.taxYear}. Tax Account Number: ${taxRecord.taxAccountNumber}`;

        // 1. In-App Notification (Database)
        const notification = await createNotification(
            owner._id,
            'TAX_GENERATED',
            title,
            message,
            {
                propertyId: property._id,
                taxRecordId: taxRecord._id,
                ownerId: owner._id,
                amount: taxRecord.amount,
                taxYear: taxRecord.taxYear,
                tan: taxRecord.taxAccountNumber
            },
            'high'
        );

        // 2. Email Notification
        if (owner.email) {
            const emailSubject = `Tax Bill Generated - ${property.address}`;
            const emailText = `Dear ${owner.name},\n\nA new tax bill of $${taxRecord.amount.toFixed(2)} has been generated for your property at ${property.address}.\nTax Account Number (TAN): ${taxRecord.taxAccountNumber}\n\nPlease login to your portal to view and pay this bill.\n\nThank you,\nHouse Taxation Management System`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>New Tax Bill Generated</h2>
                    <p>Dear ${owner.name},</p>
                    <p>A new tax bill has been generated for your property.</p>
                    <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Property Address:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${property.address}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tax Account Number (TAN):</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${taxRecord.taxAccountNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tax Year:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${taxRecord.taxYear}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Due:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 1.2em; font-weight: bold;">$${taxRecord.amount.toFixed(2)}</td>
                        </tr>
                    </table>
                    <p>Please login to your dashboard to view details and make a payment.</p>
                    <p>Thank you.</p>
                </div>
            `;
            await emailService.sendEmail(owner.email, emailSubject, emailText, emailHtml);
        }

        // 3. SMS Notification
        if (owner.phone) {
            const smsMessage = `Dear ${owner.name}, a new tax bill of $${taxRecord.amount.toFixed(2)} has been generated for your property at ${property.address}. Tax Year: ${taxRecord.taxYear}. TAN: ${taxRecord.taxAccountNumber}. Please login to pay. Thank you.`;
            smsService.sendSMS(owner.phone, smsMessage).catch(err => console.error("Failed to send SMS:", err));
        }

        return notification;

    } catch (error) {
        console.error('Error notifying tax generation:', error);
        return null;
    }
}

/**
 * Notify initial owner when a property transfer request is initiated
 */
async function notifyOwnerTransferRequest(transfer, property, previousOwner, newOwner) {
    try {
        const title = 'Action Required: Property Transfer Request';
        const message = `A request to transfer your property at ${property.address} to ${newOwner.name} has been initiated. Please log into your portal to review and approve this transfer. Transfer Number: ${transfer.transferNumber}`;

        // 1. In-App Notification
        await createNotification(
            previousOwner._id,
            'TRANSFER_REQUEST_APPROVAL',
            title,
            message,
            {
                transferId: transfer._id,
                propertyId: property._id
            },
            'high'
        );

        // 2. Email Notification
        if (previousOwner.email) {
            const emailSubject = `Action Required: Property Transfer - ${property.address}`;
            const emailText = `Dear ${previousOwner.name},\n\nA request has been initiated to transfer the ownership of your property at ${property.address} to ${newOwner.name}.\nTransfer Number: ${transfer.transferNumber}\n\nIMPORTANT: This transfer requires your explicit approval. Please log into your Owner Portal to review and approve or reject this transfer.\n\nThank you,\nHouse Taxation Management System`;
            await emailService.sendEmail(previousOwner.email, emailSubject, emailText);
        }

        // 3. SMS Notification
        if (previousOwner.phone) {
            const smsText = `House Tax Alert: A transfer request for your property at ${property.address} requires your approval. Please log into your portal.`;
            await smsService.sendSMS(previousOwner.phone, smsText);
        }
    } catch (error) {
        console.error('Error sending transfer request notification to owner:', error);
    }
}

/**
 * Send payment reminder to property owner for unpaid tax
 */
async function notifyPaymentReminder(taxRecord, property, owner) {
    try {
        const daysOverdue = taxRecord.dueDate
            ? Math.floor((new Date() - new Date(taxRecord.dueDate)) / (1000 * 60 * 60 * 24))
            : 0;

        const title = 'Payment Reminder - Tax Due';
        const message = `Reminder: Your tax payment of $${taxRecord.amount.toFixed(2)} for ${property.address} (TAN: ${taxRecord.taxAccountNumber}) is ${taxRecord.status === 'Overdue' ? 'overdue' : 'pending'}. Please pay as soon as possible.`;

        // 1. In-App Notification
        const notification = await createNotification(
            owner._id,
            'PAYMENT_REMINDER',
            title,
            message,
            {
                propertyId: property._id,
                taxRecordId: taxRecord._id,
                ownerId: owner._id,
                amount: taxRecord.amount,
                taxYear: taxRecord.taxYear,
                tan: taxRecord.taxAccountNumber,
                status: taxRecord.status
            },
            'high'
        );

        // 2. Email Notification
        if (owner.email) {
            const emailSubject = `Payment Reminder - Tax Due for ${property.address}`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #dc2626;">Payment Reminder</h2>
                    <p>Dear ${owner.name},</p>
                    <p>This is a reminder that your tax payment is ${taxRecord.status === 'Overdue' ? '<strong style="color: #dc2626;">OVERDUE</strong>' : 'pending'}.</p>
                    <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Property Address:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${property.address}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tax Account Number (TAN):</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${taxRecord.taxAccountNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tax Year:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${taxRecord.taxYear}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Due:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 1.2em; font-weight: bold; color: #dc2626;">$${taxRecord.amount.toFixed(2)}</td>
                        </tr>
                        ${taxRecord.status === 'Partially Paid' ? `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Paid:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${(taxRecord.paidAmount || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Balance Remaining:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">$${(taxRecord.amount - (taxRecord.paidAmount || 0)).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${daysOverdue > 0 ? `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Days Overdue:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #dc2626; font-weight: bold;">${daysOverdue} days</td>
                        </tr>
                        ` : ''}
                    </table>
                    <p style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
                        <strong>Action Required:</strong> Please login to your dashboard and make a payment to avoid penalties.
                    </p>
                    <p>Thank you for your prompt attention to this matter.</p>
                </div>
            `;
            emailService.sendEmail(owner.email, emailSubject, emailHtml).catch(err => console.error("Failed to send reminder email:", err));
        }

        // 3. SMS Notification
        if (owner.phone) {
            const balance = taxRecord.status === 'Partially Paid'
                ? (taxRecord.amount - (taxRecord.paidAmount || 0)).toFixed(2)
                : taxRecord.amount.toFixed(2);

            const smsMessage = `REMINDER: Dear ${owner.name}, your tax payment of $${balance} for ${property.address} (TAN: ${taxRecord.taxAccountNumber}) is ${taxRecord.status === 'Overdue' ? 'OVERDUE' : 'pending'}. Please pay now to avoid penalties.`;
            smsService.sendSMS(owner.phone, smsMessage).catch(err => console.error("Failed to send reminder SMS:", err));
        }

        return notification;

    } catch (error) {
        console.error('Error sending payment reminder:', error);
        return null;
    }
}

/**
 * Notify owner, tax officer and admin when payment is received
 */
async function notifyPaymentReceived(taxRecord, property, amount, paidBy) {
    try {
        const notifications = [];

        const title = amount >= taxRecord.amount ? 'Payment Received - Fully Paid' : 'Partial Payment Received';
        const message = `Payment of $${amount.toFixed(2)} received for property at ${property.address} (TAN: ${taxRecord.taxAccountNumber}). Paid by: ${paidBy}`;

        const relatedEntity = {
            propertyId: property._id,
            taxRecordId: taxRecord._id,
            ownerId: taxRecord.ownerId,
            amount: amount,
            taxYear: taxRecord.taxYear,
            tan: taxRecord.taxAccountNumber
        };

        // Notify the Property Owner (SMS, Email, In-App)
        try {
            const owner = await User.findById(taxRecord.ownerId);
            if (owner) {
                // 1. In-App Notification
                const ownerNotification = await createNotification(
                    owner._id,
                    amount >= taxRecord.amount ? 'PAYMENT_RECEIVED' : 'PAYMENT_PARTIAL',
                    `Payment Confirmation`,
                    `We have successfully received your payment of $${amount.toFixed(2)} for ${property.address}.`,
                    relatedEntity,
                    'high'
                );
                notifications.push(ownerNotification);

                // 2. Email Confirmation
                if (owner.email) {
                    const emailSubject = `Payment Receipt - ${property.address}`;
                    const emailHtml = `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: #16a34a;">Payment Confirmation</h2>
                            <p>Dear ${owner.name},</p>
                            <p>We have successfully received your tax payment.</p>
                            <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Property Address:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${property.address}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tax Account Number:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${taxRecord.taxAccountNumber}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Paid:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #16a34a;">$${amount.toFixed(2)}</td>
                                </tr>
                            </table>
                            <p>Thank you for your prompt payment.</p>
                        </div>
                    `;
                    emailService.sendEmail(owner.email, emailSubject, emailHtml).catch(err => console.error("Failed to send payment email:", err));
                }

                // 3. SMS Confirmation
                if (owner.phone) {
                    const smsMessage = `RECEIPT: Dear ${owner.name}, we received your payment of $${amount.toFixed(2)} for ${property.address} (TAN: ${taxRecord.taxAccountNumber}). Thank you!`;
                    smsService.sendSMS(owner.phone, smsMessage).catch(err => console.error("Failed to send payment SMS:", err));
                }
            }
        } catch (ownerNotifError) {
            console.error('Error sending payment notification to owner:', ownerNotifError);
        }

        // Notify Tax Officer in the same jurisdiction
        const taxOfficers = await User.find({
            role: 'Tax Officer',
            jurisdiction: property.district,
            status: 'Active'
        });

        for (const officer of taxOfficers) {
            const notification = await createNotification(
                officer._id,
                amount >= taxRecord.amount ? 'PAYMENT_RECEIVED' : 'PAYMENT_PARTIAL',
                title,
                message,
                relatedEntity,
                'medium'
            );
            notifications.push(notification);
        }

        // Notify all Super Admins
        const admins = await User.find({
            role: 'Super Admin',
            status: 'Active'
        });

        for (const admin of admins) {
            const notification = await createNotification(
                admin._id,
                amount >= taxRecord.amount ? 'PAYMENT_RECEIVED' : 'PAYMENT_PARTIAL',
                title,
                message,
                relatedEntity,
                'medium'
            );
            notifications.push(notification);
        }

        return notifications;
    } catch (error) {
        console.error('Error notifying payment received:', error);
        return [];
    }
}

/**
 * Get notifications for a user
 */
async function getUserNotifications(userId, unreadOnly = false, limit = 50) {
    try {
        const query = { userId };
        if (unreadOnly) {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('relatedEntity.propertyId', 'address district taxAccountNumber')
            .populate('relatedEntity.ownerId', 'name');

        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );
        return notification;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
    try {
        const result = await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );
        return result;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

/**
 * Delete a notification
 */
async function deleteNotification(notificationId, userId) {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            userId
        });
        return notification;
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}

/**
 * Get unread notification count
 */
async function getUnreadCount(userId) {
    try {
        const count = await Notification.countDocuments({
            userId,
            isRead: false
        });
        return count;
    } catch (error) {
        console.error('Error getting unread count:', error);
        throw error;
    }
}

/**
 * Notify admins of generic system event (in-app + email)
 */
async function notifyAdminEvent(type, title, message, relatedEntity = {}, priority = 'medium') {
    try {
        const admins = await User.find({ role: 'Super Admin', status: 'Active' });
        const notifications = [];

        for (const admin of admins) {
            const notification = await createNotification(
                admin._id,
                type,
                title,
                message,
                relatedEntity,
                priority
            );
            notifications.push(notification);

            // Send email notification to each admin
            if (admin.email) {
                const emailSubject = `[Admin Alert] ${title}`;
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #4f46e5;">${title}</h2>
                        <p>Dear ${admin.name},</p>
                        <p>${message}</p>
                        <p style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 12px; margin: 20px 0;">
                            <strong>Action Required:</strong> Please log into your admin dashboard to review this item.
                        </p>
                        <p>Thank you,<br>House Taxation Management System</p>
                    </div>
                `;
                emailService.sendEmail(admin.email, emailSubject, message, emailHtml).catch(err => console.error("Failed to send admin email:", err));
            }
        }
        return notifications;
    } catch (error) {
        console.error('Error notifying admin event:', error);
        return [];
    }
}

/**
 * Notify admins of large tax generation (> 5000)
 */
async function notifyLargeTax(taxRecord, property) {
    return await notifyAdminEvent(
        'LARGE_TAX',
        'Large Tax Generated',
        `High value tax record of $${taxRecord.amount.toFixed(2)} generated for ${property.address} (TAN: ${taxRecord.taxAccountNumber})`,
        {
            propertyId: property._id,
            taxRecordId: taxRecord._id,
            amount: taxRecord.amount,
            tan: taxRecord.taxAccountNumber
        },
        'high'
    );
}

/**
 * Notify admins of tax edit/cancellation
 */
async function notifyTaxEdited(oldRecord, newRecord, action) {
    const type = action === 'CANCELLED' ? 'TAX_CANCELLED' : 'TAX_EDITED';
    const title = action === 'CANCELLED' ? 'Tax Record Cancelled' : 'Tax Record Edited';
    const message = `Tax record (TAN: ${oldRecord.taxAccountNumber}) has been ${action.toLowerCase()}.`;

    return await notifyAdminEvent(
        type,
        title,
        message,
        {
            taxRecordId: oldRecord._id,
            tan: oldRecord.taxAccountNumber
        },
        'medium'
    );
}

/**
 * Notify admins of officer status change
 */
async function notifyOfficerStatus(officer, status) {
    return await notifyAdminEvent(
        'OFFICER_STATUS',
        'Officer Account Status Changed',
        `Tax Officer ${officer.name} (${officer.email}) has been marked as ${status}.`,
        { userId: officer._id },
        'high'
    );
}

/**
 * Notify admins of owner action (registration/block)
 */
async function notifyOwnerAction(owner, action) {
    return await notifyAdminEvent(
        'OWNER_ACTION',
        `Property Owner ${action}`,
        `Owner ${owner.name} (${owner.id}) has been ${action.toLowerCase()}.`,
        { ownerId: owner._id },
        'medium'
    );
}

module.exports = {
    createNotification,
    notifyTaxGenerated,
    notifyPaymentReminder,
    notifyPaymentReceived,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    notifyAdminEvent,
    notifyOwnerTransferRequest,
    notifyLargeTax,
    notifyTaxEdited,
    notifyOfficerStatus,
    notifyOwnerAction
};
