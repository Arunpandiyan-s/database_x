const { pool } = require('../utils/transaction.util');

class LeaveRepository {

  /**
   * Fetch leave requests visible to the requesting user.
   * Uses simple role-level scoping rather than the shared ScopeService
   * (leave_requests doesn't have a status='ARCHIVED' lifecycle, only string status values).
   */
  static async findAll(scope, client = pool) {
    let base = `
            SELECT lr.*, sp.name AS student_name, sp.department, sp.year, sp.section
            FROM leave_requests lr
            LEFT JOIN student_profiles sp ON sp.student_id = lr.student_id
        `;
    const params = [];
    const conditions = [];

    if (scope.role === 'student' || scope.level === 1) {
      conditions.push(`lr.student_id = $${params.length + 1}`);
      params.push(scope.userId);
    } else if (scope.role === 'mentor' || scope.level === 2) {
      conditions.push(`lr.mentor_id = $${params.length + 1}`);
      params.push(scope.userId);
    } else if (scope.role === 'hod' || scope.level === 3) {
      conditions.push(`lr.hod_id = $${params.length + 1}`);
      params.push(scope.userId);
    } else if (scope.level < 6 && scope.collegeId) {
      conditions.push(`lr.college_id = $${params.length + 1}`);
      params.push(scope.collegeId);
    }

    if (conditions.length) {
      base += ` WHERE ${conditions.join(' AND ')}`;
    }

    base += ` ORDER BY lr.created_at DESC`;

    const result = await client.query(base, params);
    return result.rows;
  }

  static async findByIdForUpdate(id, scope, client) {
    const result = await client.query(
      `SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return result.rows[0];
  }

  static async updateState(id, newState, client) {
    const result = await client.query(
      `UPDATE leave_requests
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
      [newState, id]
    );
    return result.rows[0];
  }

  static async findMentorIdForStudent(studentId, client) {
    const mentor = await client.query(
      `SELECT mentor_id FROM student_profiles WHERE student_id = $1`,
      [studentId]
    );
    return mentor.rows[0]?.mentor_id || null;
  }

  static async createLeave({ studentId, mentorId, collegeId, departmentId, fromDate, toDate, reason }, client) {
    const result = await client.query(
      `INSERT INTO leave_requests
          (student_id, mentor_id, college_id, department_id, from_date, to_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_mentor')
       RETURNING *`,
      [studentId, mentorId, collegeId || null, departmentId || null, fromDate, toDate, reason]
    );
    return result.rows[0];
  }

  static async rejectLeave({ id, remarks }, client) {
    const result = await client.query(
      `UPDATE leave_requests
       SET status = 'rejected', remarks = $1, updated_at = NOW()
       WHERE id = $2 AND status NOT IN ('approved','rejected','ARCHIVED')
       RETURNING *`,
      [remarks || null, id]
    );
    return result.rows[0] || null;
  }

  static async parentConfirm(id, client) {
    const result = await client.query(
      `UPDATE leave_requests SET parent_confirmed = true, updated_at = NOW()
       WHERE id = $1 RETURNING student_id`,
      [id]
    );
    return result.rows[0]?.student_id || null;
  }
}

module.exports = LeaveRepository;
