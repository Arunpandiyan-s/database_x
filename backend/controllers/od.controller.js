const { pool } = require('../utils/transaction.util');
const { notify } = require('../utils/notify.util');
const path = require('path');

class ODController {

    // ─── GET /od ──────────────────────────────────────────────────────────────
    static async getODRequests(req, res, next) {
        try {
            const user = req.user;
            let query, params = [];

            const base = `
                SELECT od.*, sp.name AS student_name, sp.register_number,
                       sp.department, sp.year, sp.section, sp.semester
                FROM od_requests od
                LEFT JOIN student_profiles sp ON sp.student_id = od.student_id
            `;

            if (user.role === 'student') {
                query = base + ` WHERE od.student_id = $1 ORDER BY od.created_at DESC`;
                params = [user.userId];
            } else if (user.role === 'mentor') {
                query = base + ` WHERE od.mentor_id = $1 ORDER BY od.created_at DESC`;
                params = [user.userId];
            } else if (user.role === 'hod') {
                query = base + ` WHERE od.hod_id = $1 ORDER BY od.created_at DESC`;
                params = [user.userId];
            } else if (user.role === 'parent') {
                // Parent sees ODs for their mapped students
                query = base + `
                    WHERE od.student_id IN (
                        SELECT student_id FROM parent_student_mapping WHERE parent_id = $1 AND active = true
                    ) ORDER BY od.created_at DESC`;
                params = [user.userId];
            } else if (user.level >= 4 && user.collegeId) {
                // Cluster HOD / Principal / Admin — college-wide
                query = base + ` WHERE od.college_id = $1 ORDER BY od.created_at DESC`;
                params = [user.collegeId];
            } else {
                query = base + ` ORDER BY od.created_at DESC LIMIT 100`;
            }

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (err) { next(err); }
    }

    // ─── POST /od ─────────────────────────────────────────────────────────────
    static async createOD(req, res, next) {
        try {
            const { dates, reason, daysRequested, parentsInformed, mentorId, hodId } = req.body;
            if (!dates?.length || !reason || !daysRequested) {
                return res.status(400).json({ success: false, message: 'dates, reason, and daysRequested are required' });
            }

            const result = await pool.query(
                `INSERT INTO od_requests
                    (student_id, mentor_id, hod_id, college_id, department_id, dates, reason,
                     parents_informed, days_requested, mentor_approval, hod_approval, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','pending','Pending Mentor Approval')
                 RETURNING *`,
                [
                    req.user.userId,
                    mentorId || null,
                    hodId || null,
                    req.user.collegeId || null,
                    req.user.departmentId || null,
                    Array.isArray(dates) ? dates : [dates],
                    reason,
                    parentsInformed || false,
                    parseInt(daysRequested),
                ]
            );
            const od = result.rows[0];

            // Notify mentor
            if (od.mentor_id) {
                await notify(od.mentor_id, `New OD request awaiting your approval`, 'info');
            }

            res.status(201).json({ success: true, data: od, message: 'OD request submitted successfully' });
        } catch (err) { next(err); }
    }

    // ─── POST /od/:id/upload ──────────────────────────────────────────────────
    static async uploadAttachment(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }
            const { type } = req.query; // brochure | registration_proof | participation_cert
            const allowed = ['brochure', 'registration_proof', 'participation_cert'];
            if (!allowed.includes(type)) {
                return res.status(400).json({ success: false, message: `type must be one of: ${allowed.join(', ')}` });
            }

            const relativePath = path.relative(
                path.join(__dirname, '..'),
                req.file.path
            ).replace(/\\/g, '/');

            const col = `${type}_url`;
            const result = await pool.query(
                `UPDATE od_requests SET "${col}" = $1, updated_at = NOW()
                 WHERE id = $2 AND student_id = $3
                 RETURNING id`,
                [relativePath, req.params.id, req.user.userId]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'OD request not found or not yours' });
            }
            res.json({ success: true, message: 'File uploaded', path: relativePath });
        } catch (err) { next(err); }
    }

    // ─── PUT /od/:id/mentor-approval ──────────────────────────────────────────
    static async mentorApproval(req, res, next) {
        try {
            const { status, remarks } = req.body; // 'approved' | 'rejected'
            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
            }

            const newStatus = status === 'approved'
                ? 'Awaiting HOD Approval'
                : 'Rejected by Mentor';

            const result = await pool.query(
                `UPDATE od_requests
                 SET mentor_approval = $1, status = $2, updated_at = NOW()
                 WHERE id = $3 AND mentor_approval = 'pending'
                 RETURNING *`,
                [status, newStatus, req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(409).json({ success: false, message: 'OD not found or already actioned' });
            }
            const od = result.rows[0];

            // Notify student
            await notify(od.student_id, `Your OD request was ${status} by mentor`, status === 'approved' ? 'success' : 'warning');
            // Notify HOD if approved
            if (status === 'approved' && od.hod_id) {
                await notify(od.hod_id, `OD request requires your approval`, 'info');
            }

            res.json({ success: true, data: od, message: `OD ${status} by mentor` });
        } catch (err) { next(err); }
    }

    // ─── PUT /od/:id/hod-approval ─────────────────────────────────────────────
    static async hodApproval(req, res, next) {
        try {
            const { status } = req.body;
            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
            }

            const newStatus = status === 'approved'
                ? 'Approved — Under Review for Certificate'
                : 'Rejected by HOD';

            const result = await pool.query(
                `UPDATE od_requests
                 SET hod_approval = $1, status = $2, updated_at = NOW()
                 WHERE id = $3 AND hod_approval = 'pending' AND mentor_approval = 'approved'
                 RETURNING *`,
                [status, newStatus, req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(409).json({ success: false, message: 'OD not found, already actioned, or mentor not yet approved' });
            }
            const od = result.rows[0];

            await notify(od.student_id, `Your OD request was ${status} by HOD`, status === 'approved' ? 'success' : 'warning');

            res.json({ success: true, data: od, message: `OD ${status} by HOD` });
        } catch (err) { next(err); }
    }

    // ─── PUT /od/:id/parent-confirmation ──────────────────────────────────────
    static async parentConfirmation(req, res, next) {
        try {
            const result = await pool.query(
                `UPDATE od_requests
                 SET parent_confirmed = true, updated_at = NOW()
                 WHERE id = $1
                 RETURNING student_id`,
                [req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'OD request not found' });
            }
            await notify(result.rows[0].student_id, 'Your parent confirmed the OD request', 'success');
            res.json({ success: true, message: 'OD parent confirmation recorded' });
        } catch (err) { next(err); }
    }
}

module.exports = ODController;
