const LeaveService = require('../services/leave.service');
const { pool } = require('../utils/transaction.util');

class LeaveController {
    static mapLeave(row) {
        if (!row) return null;
        return {
            id: row.id,
            studentId: row.student_id,
            studentName: row.student_name || '',
            department: row.department_id || '',
            fromDate: row.from_date ? new Date(row.from_date).toISOString() : '',
            toDate: row.to_date ? new Date(row.to_date).toISOString() : '',
            reason: row.reason || '',
            status: row.status || 'pending_mentor',
            mentorApproval: row.mentor_approval,
            hodApproval: row.hod_approval,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
            mentorId: row.mentor_id || '',
            hodId: row.hod_id || '',
        };
    }

    static async getLeaves(req, res, next) {
        try {
            const leaves = await LeaveService.getLeaves(req.user, req.dbClient || pool);
            res.json({ success: true, data: leaves.map(LeaveController.mapLeave) });
        } catch (err) { next(err); }
    }

    static async createLeave(req, res, next) {
        try {
            const leave = await LeaveService.createLeave({
                reqUser: req.user,
                fromDate: req.body?.fromDate,
                toDate: req.body?.toDate,
                reason: req.body?.reason,
            });
            res.status(201).json({ success: true, data: LeaveController.mapLeave(leave), message: 'Leave request submitted successfully' });
        } catch (err) { next(err); }
    }

    static async approveLeave(req, res, next) {
        try {
            const updatedLeave = await LeaveService.approveLeave(req.params.id, req.user);
            res.json({ success: true, message: 'Leave approved successfully', data: LeaveController.mapLeave(updatedLeave) });
        } catch (err) { next(err); }
    }

    static async rejectLeave(req, res, next) {
        try {
            const leave = await LeaveService.rejectLeave({ leaveId: req.params.id, remarks: req.body?.remarks });
            res.json({ success: true, message: 'Leave rejected', data: LeaveController.mapLeave(leave) });
        } catch (err) { next(err); }
    }

    static async actionLeave(req, res, next) {
        try {
            const { status } = req.body || {};
            if (status === 'approved') {
                const updatedLeave = await LeaveService.approveLeave(req.params.id, req.user);
                return res.json({ success: true, message: 'Leave approved', data: LeaveController.mapLeave(updatedLeave) });
            }
            if (status === 'rejected') {
                const leave = await LeaveService.rejectLeave({ leaveId: req.params.id, remarks: req.body?.remarks });
                return res.json({ success: true, message: 'Leave rejected', data: LeaveController.mapLeave(leave) });
            }
            return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
        } catch (err) { next(err); }
    }

    static async parentConfirmation(req, res, next) {
        try {
            await LeaveService.parentConfirmation({ leaveId: req.params.id });
            res.json({ success: true, message: 'Leave parent confirmation recorded' });
        } catch (err) { next(err); }
    }
}

module.exports = LeaveController;
