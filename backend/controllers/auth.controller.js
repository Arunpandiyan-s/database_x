const { pool } = require('../utils/transaction.util');
const AuthService = require('../services/auth.service');

class AuthController {
    static info(_req, res) {
        res.json({
            service: 'Auth Service',
            endpoints: {
                ping: 'GET  /api/v1/auth/ping',
                login: 'POST /api/v1/auth/login',
            },
        });
    }

    static ping(_req, res) {
        res.json({ status: 'auth-service online' });
    }

    static async login(req, res, next) {
        try {
            const bearerToken = req.headers.authorization?.split('Bearer ')[1];
            const service = new AuthService(pool);
            const result = await service.login({
                email: req.body?.email,
                password: req.body?.password,
                bearerToken,
            });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async localLogin(req, res, next) {
        try {
            console.log("BODY:", req.body);
            const { email, password, role } = req.body || {};

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            // Check admission prospects first if student
            if (role === 'student') {
                try {
                    const pResult = await pool.query('SELECT * FROM admission_prospects WHERE email = $1', [email]);
                    if (pResult && pResult.rows && pResult.rows.length > 0) {
                        const p = pResult.rows[0];
                        if (p.temp_password === password) {
                            return res.json({
                                success: true,
                                requirePasswordChange: true,
                                user: { id: p.id, name: p.name, email: p.email, role: 'student', status: p.status }
                            });
                        }
                    }
                } catch (dbErr) {
                    console.error("DB QUERY ERROR (prospects):", dbErr);
                }
            }

            try {
                // Check DB query as requested:
                const result = await pool.query('SELECT * FROM users WHERE email = $1 OR active_email = $1', [email]);
                
                if (!result || !result.rows || result.rows.length === 0) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const user = result.rows[0];
                
                if (!user.password_hash) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const bcrypt = require('bcryptjs');
                const match = await bcrypt.compare(password, user.password_hash);

                if (!match) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                if (user.status !== 'ACTIVE') {
                    return res.status(403).json({ error: 'Account is ' + user.status });
                }

                // If role info is needed, try to get role name
                let roleName = 'student';
                if (user.role_id) {
                    const r = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
                    if (r.rows[0]) roleName = r.rows[0].name;
                }

                return res.json({
                    success: true,
                    user: { id: user.id, email: user.email, role: roleName }
                });

            } catch (dbErr) {
                console.error("DB QUERY ERROR:", dbErr);
                return res.status(401).json({ error: 'Database check failed' });
            }

        } catch (err) {
            console.error("CONTROLLER ERROR:", err);
            return res.status(401).json({ error: 'Internal login error' });
        }
    }

    static async sendEmailOtp(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.sendEmailOtp({ email: req.body?.email });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async verifyEmailOtp(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.verifyEmailOtp({ email: req.body?.email, otp: req.body?.otp });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async inviteStudent(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.inviteStudent(req.body || {}, req.user);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    static async registerStudent(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.registerStudent(req.body || {});
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    static async forgotPassword(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.forgotPassword({
                email: req.body?.email,
                frontendBaseUrl: process.env.FRONTEND_BASE_URL,
            });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async verify(req, res, next) {
        try {
            const token = req.headers.authorization?.split('Bearer ')[1] || req.body?.token;
            const service = new AuthService(pool);
            const result = await service.verifyToken({ token });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async sendAdmissionCredentials(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.sendAdmissionCredentials(req.body || {});
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async addAdmissionProspect(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.addAdmissionProspect(req.body || {});
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    static async listAdmissionProspects(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.listAdmissionProspects();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    static async approveAdmissionProspect(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.approveAdmissionProspect({
                id: req.params.id,
                department: req.body?.department,
                mentorId: req.body?.mentorId || null,
            });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    /** GET /auth/mentors — list all active mentor users with student count */
    static async listMentors(_req, res, next) {
        try {
            const result = await pool.query(
                `SELECT u.id, u.email, u.active_email,
                        COUNT(mm.student_id) AS assigned_count
                 FROM users u
                 LEFT JOIN mentor_mappings mm ON mm.mentor_id = u.id AND mm.active = true
                 WHERE u.role = 'mentor' AND u.status = 'ACTIVE'
                 GROUP BY u.id, u.email, u.active_email
                 ORDER BY u.active_email`
            );
            res.json({ success: true, mentors: result.rows });
        } catch (err) {
            next(err);
        }
    }

    /** GET /auth/mentor-pool?mentorId=<uuid> */
    static async getMentorPool(req, res, next) {
        try {
            const { mentorId } = req.query;
            if (!mentorId) {
                return res.status(400).json({ error: 'mentorId query param is required' });
            }

            // Prospects pushed to this mentor by admin (admission_prospects)
            const prospectsRes = await pool.query(
                `SELECT ap.id, ap.name, ap.email, ap.department, ap.status,
                        ap.created_at AS "createdAt",
                        sp.profile_submitted AS "profileSubmitted",
                        sp.status AS "profileStatus",
                        sp.register_number AS "registerNumber"
                 FROM admission_prospects ap
                 LEFT JOIN users u ON u.email = ap.email OR u.active_email = ap.email
                 LEFT JOIN student_profiles sp ON sp.student_id = u.id
                 WHERE ap.mentor_id = $1 AND ap.status = 'active'
                 ORDER BY ap.created_at DESC`,
                [mentorId]
            );

            // Students linked via mentor_mappings
            const studentsRes = await pool.query(
                `SELECT u.id, u.email, u.active_email AS "activeEmail", u.status,
                        sp.name, sp.register_number AS "registerNumber", sp.department,
                        sp.profile_submitted AS "profileSubmitted",
                        sp.status AS "profileStatus",
                        sp.edit_request_pending AS "editRequestPending"
                 FROM mentor_mappings mm
                 JOIN users u ON u.id = mm.student_id
                 LEFT JOIN student_profiles sp ON sp.student_id = u.id
                 WHERE mm.mentor_id = $1 AND mm.active = true
                 ORDER BY COALESCE(sp.name, u.active_email) ASC`,
                [mentorId]
            );

            res.json({
                success: true,
                prospects: prospectsRes.rows,
                students: studentsRes.rows,
            });
        } catch (err) {
            next(err);
        }
    }

    static async registerStaff(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.registerStaff(req.body || {});
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    static async changePassword(req, res, next) {
        try {
            const service = new AuthService(pool);
            const result = await service.changePassword(req.body || {});
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = AuthController;
