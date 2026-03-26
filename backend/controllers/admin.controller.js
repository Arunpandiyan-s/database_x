const { pool } = require('../utils/transaction.util');
const AdminService = require('../services/admin.service');

class AdminController {
    // ─── POST /api/admin/invite-student ──────────────────────────────────────
    static async inviteStudent(req, res, next) {
        try {
            const service = new AdminService(pool);
            const result = await service.inviteStudent({
                actor: req.user,
                studentEmail: req.body?.studentEmail,
                registerNumber: req.body?.registerNumber,
            });
            return res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── GET /api/admin/users ─────────────────────────────────────────────────
    static async listUsers(req, res, next) {
        try {
            const service = new AdminService(pool);
            const result = await service.listUsers({
                actor: req.user,
                page: req.query.page,
                limit: req.query.limit,
                role: req.query.role,
            });
            return res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── POST /api/admin/users ────────────────────────────────────────────────
    static async createUser(req, res, next) {
        try {
            const service = new AdminService(pool);
            const { email, password, name, role, collegeId, departmentId } = req.body;
            const result = await service.createUser({
                actor: req.user,
                email,
                password,
                name,
                role,
                collegeId,
                departmentId,
            });
            return res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── PUT /api/admin/users/:id ─────────────────────────────────────────────
    static async updateUser(req, res, next) {
        try {
            const service = new AdminService(pool);
            const { role, status, collegeId, departmentId, password } = req.body;
            const result = await service.updateUser({
                actor: req.user,
                id: req.params.id,
                role,
                status,
                collegeId,
                departmentId,
                password,
            });
            return res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── DELETE /api/admin/users/:id ──────────────────────────────────────────
    static async deactivateUser(req, res, next) {
        try {
            const service = new AdminService(pool);
            const result = await service.deactivateUser({
                actor: req.user,
                id: req.params.id,
            });
            return res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── GET /api/admin/roles ─────────────────────────────────────────────────
    static async listAssignableRoles(req, res, next) {
        try {
            const service = new AdminService(pool);
            const result = await service.listAssignableRoles({ actor: req.user });
            return res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = AdminController;
