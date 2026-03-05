/**
 * Enforces the formal Read and Mutate matrices for the ERP Hierarchy
 */
class ScopeService {

    /**
     * Generates a SQL WHERE clause fragment and value array to append to repository queries.
     * Enforces the Read Scope Matrix and College Isolation rule.
     * 
     * @param {string} entityTable - The main table being queried (e.g., 'students', 'leave_requests')
     * @param {Object} scope - The scope object extracted from user claims
     * @param {number} paramStartIndex - The index to start parameterized values at (e.g., 2 if $1 is used)
     * @returns {Object} { clause: string, values: Array }
     */
    static buildScopeWhereClause(entityTable, scope, paramStartIndex = 1) {
        let clause = ` AND ${entityTable}.status != 'ARCHIVED'`;
        let values = [];
        let idx = paramStartIndex;

        // Technical Director / Admin (Level >= 6) -> No college filter, global access
        if (scope.level >= 6) {
            return { clause, values };
        }

        // Default College Isolation for Level 1-5
        clause += ` AND ${entityTable}.college_id = $${idx++}`;
        values.push(scope.collegeId);

        // Principal (Level 5) -> College-wide access
        if (scope.level === 5) {
            return { clause, values };
        }

        // Cluster Head (Level 4) -> Cluster-wide
        if (scope.level === 4) {
            clause += ` AND ${entityTable}.cluster_id = $${idx++}`;
            values.push(scope.clusterId);
            return { clause, values };
        }

        // HOD (Level 3) -> Department-wide
        if (scope.level === 3) {
            clause += ` AND ${entityTable}.department_id = $${idx++}`;
            values.push(scope.departmentId);
            return { clause, values };
        }

        if (scope.level === 2) {
            // Handles queries against mapping table directly vs other entities
            if (entityTable === 'mentor_mappings') {
                clause += ` AND ${entityTable}.mentor_id = $${idx++}`;
                values.push(scope.userId);
            } else {
                clause += ` AND ${entityTable}.student_id IN (
           SELECT student_id FROM mentor_mappings
           WHERE mentor_id = $${idx++} AND active = true
         )`;
                values.push(scope.userId);
            }
            return { clause, values };
        }

        // Student (Level 1) -> Self only
        if (scope.level === 1) {
            if (entityTable === 'users' || entityTable === 'students') {
                clause += ` AND ${entityTable}.id = $${idx++}`; // assuming id is student_id in students context
            } else {
                clause += ` AND ${entityTable}.student_id = $${idx++}`;
            }
            values.push(scope.studentId || scope.userId);
            return { clause, values };
        }

        throw new Error('Invalid Scope Level');
    }

    /**
     * Enforces Mutation Permission Matrix
     */
    static authorizeMutation(action, entityType, scope) {
        // Basic structural authorization
        const matrix = {
            'leave_request': {
                CREATE: [1],
                UPDATE_PENDING_MENTOR: [2],
                UPDATE_PENDING_HOD: [3]
            },
            'profile': {
                UPDATE_DATA: [1],
                UPDATE_STATE: [2]
            }
        };

        const allowedLevels = matrix[entityType]?.[action];
        if (!allowedLevels) {
            return false; // Action unknown or unsupported entity
        }

        if (scope.level >= 6) return true; // Admins can override theoretically, though services handle admin lifecycle manually

        return allowedLevels.includes(scope.level);
    }
}

module.exports = ScopeService;
