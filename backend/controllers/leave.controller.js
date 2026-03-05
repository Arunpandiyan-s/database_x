const LeaveService = require('../services/leave.service');
const LeaveRepository = require('../repositories/leave.repository');
const { pool } = require('../utils/transaction.util');
const { notify } = require('../utils/notify.util');

class LeaveController {

    /**
     * GET /api/v1/leaves
     */
    static async getLeaves(req, res, next) {
        try {
            const leaves = await LeaveRepository.findAll(req.user, req.dbClient || pool);
            res.json({ success: true, data: leaves });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /api/v1/leaves   (student creates)
     */
    static async createLeave(req, res, next) {
        try {
            const { fromDate, toDate, reason } = req.body;
            if (!fromDate || !toDate || !reason) {
                return res.status(400).json({ success: false, message: 'fromDate, toDate, and reason are required' });
            }
            if (new Date(toDate) < new Date(fromDate)) {
                return res.status(400).json({ success: false, message: 'toDate cannot be before fromDate' });
            }

            // Resolve mentor and HOD for this student
            const mentor = await pool.query(
                `SELECT mentor_id FROM student_profiles WHERE student_id = $1`,
                [req.user.userId]
            );
            const mentorId = mentor.rows[0]?.mentor_id || null;

            const result = await pool.query(
                `INSERT INTO leave_requests
                    (student_id, mentor_id, college_id, department_id, from_date, to_date, reason, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_mentor')
                 RETURNING *`,
                [
                    req.user.userId,
                    mentorId,
                    req.user.collegeId || null,
                    req.user.departmentId || null,
                    fromDate,
                    toDate,
                    reason,
                ]
            );
            const leave = result.rows[0];

            // Notify mentor
            if (mentorId) {
                await notify(mentorId, 'A student has submitted a new leave request', 'info');
            }

            res.status(201).json({ success: true, data: leave, message: 'Leave request submitted successfully' });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /api/v1/leaves/:id/approve
     */
    static async approveLeave(req, res, next) {
        try {
            const { id } = req.params;
            const updatedLeave = await LeaveService.approveLeave(id, req.user);
            res.json({ success: true, message: 'Leave approved successfully', data: updatedLeave });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /api/v1/leaves/:id/reject
     */
    static async rejectLeave(req, res, next) {
        try {
            const { remarks } = req.body;
            const result = await pool.query(
                `UPDATE leave_requests
                 SET status = 'rejected', remarks = $1, updated_at = NOW()
                 WHERE id = $2 AND status NOT IN ('approved','rejected','ARCHIVED')
                 RETURNING *`,
                [remarks || null, req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(409).json({ success: false, message: 'Leave not found or already finalised' });
            }
            const leave = result.rows[0];
            await notify(leave.student_id, 'Your leave request was rejected', 'warning');
            res.json({ success: true, message: 'Leave rejected', data: leave });
        } catch (err) {
            next(err);
        }
    }

    /**
     * PUT /api/v1/leaves/:id/approval  (generic approve/reject — used by frontend)
     */
    static async actionLeave(req, res, next) {
        try {
            const { status, remarks } = req.body;
            if (status === 'approved') {
                const updatedLeave = await LeaveService.approveLeave(req.params.id, req.user);
                return res.json({ success: true, message: 'Leave approved', data: updatedLeave });
            }
            if (status === 'rejected') {
                const result = await pool.query(
                    `UPDATE leave_requests
                     SET status = 'rejected', remarks = $1, updated_at = NOW()
                     WHERE id = $2 AND status NOT IN ('approved','rejected','ARCHIVED')
                     RETURNING *`,
                    [remarks || null, req.params.id]
                );
                const leave = result.rows[0];
                if (leave) await notify(leave.student_id, 'Your leave request was rejected', 'warning');
                return res.json({ success: true, message: 'Leave rejected', data: leave });
            }
            return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
        } catch (err) {
            next(err);
        }
    }

    /**
     * PUT /api/v1/leaves/:id/parent-confirmation
     */
    static async parentConfirmation(req, res, next) {
        try {
            const result = await pool.query(
                `UPDATE leave_requests SET parent_confirmed = true, updated_at = NOW()
                 WHERE id = $1 RETURNING student_id`,
                [req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Leave not found' });
            }
            await notify(result.rows[0].student_id, 'Your parent confirmed the leave request', 'success');
            res.json({ success: true, message: 'Leave parent confirmation recorded' });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = LeaveController;
