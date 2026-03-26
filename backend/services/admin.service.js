const bcrypt = require('bcryptjs');
const EmailService = require('./email.service');
const AdminRepository = require('../repositories/admin.repository');

// ── Role hierarchy: which roles can manage which ──────────────────────────────
// admin       → can manage principal, vice_principal
// principal   → can manage vice_principal, cluster_hod
// vice_principal → can manage cluster_hod
// cluster_hod → can manage hod
// hod         → can manage mentor, class_advisor

const ROLE_MANAGED_BY = {
    admin:          ['principal', 'vice_principal', 'technical_director'],
    technical_director: ['admin', 'principal', 'vice_principal'],
    principal:      ['vice_principal', 'cluster_hod'],
    vice_principal: ['cluster_hod'],
    cluster_hod:    ['hod'],
    hod:            ['mentor', 'class_advisor'],
};

function getAllowedTargetRoles(actorRole) {
    return ROLE_MANAGED_BY[actorRole] || [];
}

function canManage(actorRole, targetRole) {
    return getAllowedTargetRoles(actorRole).includes(targetRole);
}

class AdminService {
    constructor(db) {
        this.repo = new AdminRepository(db);
    }

    // ─── Student Invite (legacy) ───────────────────────────────────────────────

    async inviteStudent({ actor, studentEmail, registerNumber }) {
        if (!studentEmail || !registerNumber) {
            const err = new Error('studentEmail and registerNumber are required.');
            err.statusCode = 400;
            throw err;
        }

        const existing = await this.repo.getInviteByEmail(studentEmail);
        if (existing) {
            const err = new Error('Student already invited.');
            err.statusCode = 409;
            throw err;
        }

        const existingUser = await this.repo.getUserByEmail(studentEmail);
        if (existingUser) {
            const err = new Error('User is already registered in the system.');
            err.statusCode = 409;
            throw err;
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        await this.repo.insertStudentInvite({
            studentEmail,
            registerNumber,
            invitedBy: actor.userId,
            otpHash,
            expires,
        });

        await EmailService.sendOTP(studentEmail, otp);
        return { success: true, message: 'Invitation sent' };
    }

    // ─── User Management ──────────────────────────────────────────────────────

    /**
     * List users that the actor is allowed to manage.
     * - admin: sees all principals/vice_principals
     * - principal/VP/etc: sees only users they created (their direct reports)
     */
    async listUsers({ actor, page = 1, limit = 50, role: filterRole }) {
        const actorRole = actor.role;
        const allowed = getAllowedTargetRoles(actorRole);

        if (allowed.length === 0) {
            return { success: true, data: [], total: 0, page: parseInt(page), limit: parseInt(limit) };
        }

        const roles = filterRole && allowed.includes(filterRole) ? [filterRole] : allowed;

        // admin/technical_director see all; others see only their own creations
        const isHeirarchyAdmin = ['admin', 'technical_director'].includes(actorRole);
        const createdBy = isHeirarchyAdmin ? null : (actor.userId || actor.user_id);
        const rolesParam = isHeirarchyAdmin ? null : roles;

        const { rows, total } = await this.repo.listUsers({
            roles: rolesParam,
            createdBy,
            page: parseInt(page),
            limit: parseInt(limit),
        });

        return {
            success: true,
            data: rows.map(r => this.mapUser(r)),
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        };
    }

    mapUser(row) {
        return {
            id: row.id,
            email: row.active_email || row.email,
            name: row.display_name || row.active_email || row.email,
            role: row.role_name,
            roleLevel: row.role_level,
            status: row.status,
            collegeId: row.college_id,
            departmentId: row.department_id,
            createdBy: row.created_by,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        };
    }

    /**
     * Create a new staff user account.
     * The actor's role must be allowed to manage the target role.
     */
    async createUser({ actor, email, password, name, role, collegeId, departmentId }) {
        const actorRole = actor.role;

        if (!email || !password || !role) {
            const err = new Error('email, password, and role are required.');
            err.statusCode = 400;
            throw err;
        }

        if (!canManage(actorRole, role)) {
            const err = new Error(`You do not have permission to create a ${role} account.`);
            err.statusCode = 403;
            throw err;
        }

        // Look up the role record
        const roles = await this.repo.listRoles();
        const roleRow = roles.find(r => r.name === role);
        if (!roleRow) {
            const err = new Error(`Role "${role}" not found.`);
            err.statusCode = 400;
            throw err;
        }

        // Check for duplicate
        const existing = await this.repo.getUserByEmail(email);
        if (existing) {
            const err = new Error('A user with this email already exists.');
            err.statusCode = 409;
            throw err;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const actorId = actor.userId || actor.user_id;

        const user = await this.repo.createUser({
            email,
            passwordHash,
            roleId: roleRow.id,
            collegeId: collegeId || null,
            departmentId: departmentId || null,
            createdBy: actorId,
            name,
        });

        // Audit
        await this.repo.logAudit({
            actorId,
            action: 'USER_CREATED',
            targetId: user.id,
            collegeId: actor.collegeId || null,
            metadata: { email, role, name },
        });

        // Also create in Firebase for SSO (optional, non-blocking)
        try {
            const firebaseAdmin = require('../config/firebase');
            const fbUser = await firebaseAdmin.auth().createUser({
                email,
                password,
                displayName: name || email.split('@')[0],
            });
            await firebaseAdmin.auth().setCustomUserClaims(fbUser.uid, {
                user_id: user.id,
                level: roleRow.level,
            });
            // Link firebase uid
            await this.repo.updateUser({ id: user.id }); // no-op but keeps consistency
        } catch (_) { /* non-critical: local login still works */ }

        return { success: true, data: this.mapUser({ ...user, role_name: role, display_name: name }), message: 'User created successfully.' };
    }

    /**
     * Update an existing user's role / status / department.
     */
    async updateUser({ actor, id, role, status, collegeId, departmentId, password }) {
        const actorRole = actor.role;

        // Fetch target user to validate permission
        const target = await this.repo.getUserById(id);
        if (!target) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        if (!canManage(actorRole, target.role_name)) {
            const err = new Error(`You do not have permission to edit a ${target.role_name} account.`);
            err.statusCode = 403;
            throw err;
        }

        if (role && !canManage(actorRole, role)) {
            const err = new Error(`You do not have permission to assign the ${role} role.`);
            err.statusCode = 403;
            throw err;
        }

        const roles = await this.repo.listRoles();
        const roleId = role ? (roles.find(r => r.name === role)?.id || null) : null;
        const passwordHash = password ? await bcrypt.hash(password, 10) : null;

        const updated = await this.repo.updateUser({
            id,
            roleId,
            status: status || null,
            collegeId: collegeId !== undefined ? (collegeId || null) : null,
            departmentId: departmentId !== undefined ? (departmentId || null) : null,
            passwordHash,
        });

        const actorId = actor.userId || actor.user_id;
        await this.repo.logAudit({
            actorId,
            action: 'USER_UPDATED',
            targetId: id,
            collegeId: actor.collegeId || null,
            metadata: { roleChange: role, statusChange: status },
        });

        return { success: true, data: updated, message: 'User updated successfully.' };
    }

    /**
     * Deactivate (soft-delete) a user.
     */
    async deactivateUser({ actor, id }) {
        const actorRole = actor.role;
        const target = await this.repo.getUserById(id);

        if (!target) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        if (!canManage(actorRole, target.role_name)) {
            const err = new Error(`You do not have permission to remove a ${target.role_name} account.`);
            err.statusCode = 403;
            throw err;
        }

        const result = await this.repo.deactivateUser(id);

        const actorId = actor.userId || actor.user_id;
        await this.repo.logAudit({
            actorId,
            action: 'USER_DEACTIVATED',
            targetId: id,
            collegeId: actor.collegeId || null,
            metadata: { email: target.active_email || target.email },
        });

        // Revoke Firebase session if uid is available
        try {
            const firebaseAdmin = require('../config/firebase');
            const fbUser = await firebaseAdmin.auth().getUserByEmail(target.active_email || target.email);
            await firebaseAdmin.auth().revokeRefreshTokens(fbUser.uid);
        } catch (_) { /* non-critical */ }

        return { success: true, data: result, message: 'User deactivated successfully.' };
    }

    /**
     * List all available roles (filtered to what actor can assign).
     */
    async listAssignableRoles({ actor }) {
        const allowed = getAllowedTargetRoles(actor.role);
        const all = await this.repo.listRoles();
        return {
            success: true,
            data: all.filter(r => allowed.includes(r.name)),
        };
    }
}

module.exports = AdminService;
