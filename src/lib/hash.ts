// =====================================================
// PASSWORD HASHING UTILITIES
// =====================================================

/**
 * Simple hash function for non-secure contexts (HTTP on IP)
 * Uses djb2 algorithm - not as secure as SHA-256 but works everywhere
 */
function simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    // Add salt and convert to hex
    const salted = hash ^ 0x5f3759df;
    return Math.abs(salted).toString(16).padStart(8, '0') +
        Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Hash password - uses SHA-256 if available, fallback to simple hash
 */
export async function hashPassword(password: string): Promise<string> {
    // Check if we're in a secure context (localhost or HTTPS)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (e) {
            console.warn("crypto.subtle failed, using fallback hash");
        }
    }

    // Fallback for non-secure contexts (HTTP on IP address)
    console.warn("Using simple hash (non-secure context detected)");
    return simpleHash(password);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}
