const { withTransactionRetry, pool } = require('../utils/transaction.util');
const LeaveRepository = require('../repositories/leave.repository');
const { notify } = require('../utils/notify.util');

class LeaveService {
    static async getLeaves(reqUser, client = null) {
        return await LeaveRepository.findAll(reqUser, client || pool);
    }

    static async createLeave({ reqUser, fromDate, toDate, reason }) {
        if (!fromDate || !toDate || !reason) {
            const err = new Error('fromDate, toDate, and reason are required');
            err.statusCode = 400;
            throw err;
        }
        if (new Date(toDate) < new Date(fromDate)) {
            const err = new Error('toDate cannot be before fromDate');
            err.statusCode = 400;
            throw err;
        }

        return await withTransactionRetry(async (client) => {
            const mentorId = await LeaveRepository.findMentorIdForStudent(reqUser.userId, client);
            const leave = await LeaveRepository.createLeave({
                studentId: reqUser.userId,
                mentorId,
                collegeId: reqUser.collegeId,
                departmentId: reqUser.departmentId,
                fromDate,
                toDate,
                reason,
            }, client);

            if (mentorId) {
                notify(mentorId, 'A student has submitted a new leave request', 'info').catch(() => { });
            }

            return leave;
        }, { maxRetries: 3 });
    }

    static async rejectLeave({ leaveId, remarks }) {
        return await withTransactionRetry(async (client) => {
            const leave = await LeaveRepository.rejectLeave({ id: leaveId, remarks }, client);
            if (!leave) {
                const err = new Error('Leave not found or already finalised');
                err.statusCode = 409;
                throw err;
            }
            notify(leave.student_id, 'Your leave request was rejected', 'warning').catch(() => { });
            return leave;
        }, { maxRetries: 3 });
    }

    static async parentConfirmation({ leaveId }) {
        return await withTransactionRetry(async (client) => {
            const studentId = await LeaveRepository.parentConfirm(leaveId, client);
            if (!studentId) {
                const err = new Error('Leave not found');
                err.statusCode = 404;
                throw err;
            }
            notify(studentId, 'Your parent confirmed the leave request', 'success').catch(() => { });
            return true;
        }, { maxRetries: 3 });
    }

    /**
     * Transition leave request state based on strict state machine.
     * mentor (level 2): pending_mentor -> pending_hod
     * hod / cluster_hod (level >= 3): pending_hod -> approved
     */
    static async approveLeave(leaveId, reqUser) {
        return await withTransactionRetry(async (client, addEvent) => {
            // 1. Fetch with row lock
            const leave = await LeaveRepository.findByIdForUpdate(leaveId, reqUser, client);
            if (!leave) {
                const err = new Error('Leave request not found.');
                err.statusCode = 404;
                throw err;
            }

            // 2. State machine
            let newState;
            const level = reqUser.level || 1;

            if (level === 2 && leave.status === 'pending_mentor') {
                newState = 'pending_hod';
            } else if (level >= 3 && leave.status === 'pending_hod') {
                newState = 'approved';
            } else {
                const conflict = new Error(
                    `Cannot approve leave from status '${leave.status}' as role '${reqUser.role}' (level ${level})`
                );
                conflict.statusCode = 409;
                throw conflict;
            }

            // 3. Update state
            const updated = await LeaveRepository.updateState(leaveId, newState, client);

            // 4. Domain event (for outbox worker if configured)
            addEvent(
                'LEAVE_STATUS_CHANGED',
                reqUser.userId,
                'leave_request',
                leaveId,
                { previous_state: leave.status, new_state: newState }
            );

            // 5. Notify student out-of-band (fire and forget, same tx context)
            notify(leave.student_id, `Your leave was ${newState === 'approved' ? 'approved' : 'moved to HOD review'}`, 'info')
                .catch(() => { });

            return updated;
        }, { maxRetries: 3 });
    }
}

module.exports = LeaveService;
