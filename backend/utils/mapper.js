function toCamelCaseKey(key) {
    return String(key)
        .toLowerCase()
        .replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

function toSnakeCaseKey(key) {
    return String(key)
        .replace(/([A-Z])/g, '_$1')
        .replace(/-/g, '_')
        .toLowerCase()
        .replace(/^_+/, '');
}

/**
 * Centralized Data Mapper Utility
 * Converts between snake_case (DB) and camelCase (Frontend)
 */

/**
 * Converts a snake_case object to camelCase
 * @param {Object} obj - Database row object
 * @returns {Object} - Camelized object
 */
function mapDbToCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => mapDbToCamelCase(item));
    }
    
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const camelKey = toCamelCaseKey(key);
            const value = obj[key];
            
            // Recursively convert nested objects
            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                result[camelKey] = mapDbToCamelCase(value);
            } else {
                result[camelKey] = value;
            }
        }
    }
    return result;
}

/**
 * Converts a camelCase object to snake_case (for DB inserts/updates)
 * @param {Object} obj - Frontend object
 * @returns {Object} - Snake_cased object
 */
function mapCamelToSnakeCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => mapCamelToSnakeCase(item));
    }
    
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const snakeKey = toSnakeCaseKey(key);
            const value = obj[key];
            
            // Recursively convert nested objects
            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                result[snakeKey] = mapCamelToSnakeCase(value);
            } else {
                result[snakeKey] = value;
            }
        }
    }
    return result;
}

/**
 * Maps a DB row to a specific DTO structure
 * @param {Object} row - Database row
 * @param {Object} schema - DTO schema mapping
 * @returns {Object} - Mapped object
 */
function mapToDto(row, schema) {
    if (!row) return null;
    
    const result = {};
    for (const key in schema) {
        const mapping = schema[key];
        
        if (typeof mapping === 'string') {
            // Simple field mapping
            result[key] = row[mapping];
        } else if (typeof mapping === 'function') {
            // Custom transformation
            result[key] = mapping(row);
        }
    }
    return result;
}

module.exports = {
    mapDbToCamelCase,
    mapCamelToSnakeCase,
    mapToDto
};
