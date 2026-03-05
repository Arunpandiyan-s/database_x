const { withTransactionRetry } = require('../utils/transaction.util');
const LeaveRepository = require('../repositories/leave.repository');
const { notify } = require('../utils/notify.util');

class LeaveService {
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
