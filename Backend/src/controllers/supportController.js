const SupportTicket = require('../models/SupportTicket');
const { createAuditLog } = require('./auditController');

// Create a new support ticket
exports.createTicket = async (req, res) => {
    try {
        const { subject, category, priority, description } = req.body;

        const ticket = new SupportTicket({
            subject,
            category,
            priority: priority || 'Medium',
            description,
            createdBy: req.user._id,
            status: 'Open'
        });

        await ticket.save();
        await ticket.populate('createdBy', 'name email');

        // Log audit
        await createAuditLog({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'CREATE',
            targetType: 'SupportTicket',
            targetId: ticket._id,
            details: `Created support ticket: ${ticket.ticketNumber}`,
            ipAddress: req.ip,
            severity: 'Low'
        });

        res.status(201).json({ success: true, data: ticket, message: 'Support ticket created successfully' });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ success: false, error: 'Failed to create support ticket' });
    }
};

// Get all support tickets (with filters)
exports.getTickets = async (req, res) => {
    try {
        const { status, category, priority } = req.query;
        const filter = {};

        // If not Super Admin, specific visibility rules apply
        if (req.user.role !== 'Super Admin') {
            if (req.user.role === 'Tax Officer') {
                // Tax Officers see tickets they created OR tickets assigned to them
                filter.$or = [
                    { createdBy: req.user._id },
                    { assignedTo: req.user._id }
                ];
            } else {
                // Regular users (Owners) only see tickets they created
                filter.createdBy = req.user._id;
            }
        }

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;

        const tickets = await SupportTicket.find(filter)
            .populate('createdBy', 'name email role')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: tickets });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch support tickets' });
    }
};

// Get a single support ticket
exports.getTicket = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('assignedTo', 'name email')
            .populate('responses.respondedBy', 'name email role');

        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Support ticket not found' });
        }

        // Check permissions
        const isCreator = ticket.createdBy._id.toString() === req.user._id.toString();
        const isAssigned = ticket.assignedTo && ticket.assignedTo._id && ticket.assignedTo._id.toString() === req.user._id.toString();
        const isSuperAdmin = req.user.role === 'Super Admin';
        const isTaxOfficer = req.user.role === 'Tax Officer';

        if (!isSuperAdmin) {
            // For Tax Officers: Must be creator OR assigned
            if (isTaxOfficer) {
                if (!isCreator && !isAssigned) {
                    return res.status(403).json({ success: false, error: 'Access denied' });
                }
            }
            // For regular users (Owners): Must be creator
            else {
                if (!isCreator) {
                    return res.status(403).json({ success: false, error: 'Access denied' });
                }
            }
        }

        res.json({ success: true, data: ticket });
    } catch (error) {
        console.error('Error fetching support ticket:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch support ticket' });
    }
};

// Add a response to a ticket
exports.addResponse = async (req, res) => {
    try {
        const { message } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Support ticket not found' });
        }

        ticket.responses.push({
            message,
            respondedBy: req.user._id,
            respondedAt: new Date()
        });

        // Update status to In Progress if it was Open
        if (ticket.status === 'Open') {
            ticket.status = 'In Progress';
        }

        await ticket.save();
        await ticket.populate('responses.respondedBy', 'name email role');

        // Log audit
        await createAuditLog({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'UPDATE',
            targetType: 'SupportTicket',
            targetId: ticket._id,
            details: `Added response to ticket: ${ticket.ticketNumber}`,
            ipAddress: req.ip,
            severity: 'Low'
        });

        res.json({ success: true, data: ticket, message: 'Response added successfully' });
    } catch (error) {
        console.error('Error adding response:', error);
        res.status(500).json({ success: false, error: 'Failed to add response' });
    }
};

// Update ticket status
exports.updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Support ticket not found' });
        }

        // Only Super Admin can update ticket status
        if (req.user.role !== 'Super Admin') {
            return res.status(403).json({ success: false, error: 'Only Super Admin can update ticket status' });
        }

        ticket.status = status;

        if (status === 'Resolved') {
            ticket.resolvedAt = new Date();
        } else if (status === 'Closed') {
            ticket.closedAt = new Date();
        }

        await ticket.save();

        // Log audit
        await createAuditLog({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'UPDATE',
            targetType: 'SupportTicket',
            targetId: ticket._id,
            details: `Updated ticket ${ticket.ticketNumber} status to: ${status}`,
            ipAddress: req.ip,
            severity: 'Medium'
        });

        res.json({ success: true, data: ticket, message: 'Ticket status updated successfully' });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ success: false, error: 'Failed to update ticket status' });
    }
};

// Assign ticket to a user
exports.assignTicket = async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Support ticket not found' });
        }

        // Only Super Admin can assign tickets
        if (req.user.role !== 'Super Admin') {
            return res.status(403).json({ success: false, error: 'Only Super Admin can assign tickets' });
        }

        ticket.assignedTo = assignedTo;
        await ticket.save();
        await ticket.populate('assignedTo', 'name email');

        // Log audit
        await createAuditLog({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'UPDATE',
            targetType: 'SupportTicket',
            targetId: ticket._id,
            details: `Assigned ticket ${ticket.ticketNumber} to user`,
            ipAddress: req.ip,
            severity: 'Low'
        });

        res.json({ success: true, data: ticket, message: 'Ticket assigned successfully' });
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ success: false, error: 'Failed to assign ticket' });
    }
};
