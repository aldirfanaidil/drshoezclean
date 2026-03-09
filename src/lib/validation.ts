// =====================================================
// INPUT VALIDATION & SANITIZATION UTILITIES
// =====================================================

/**
 * Sanitize string by removing HTML tags and trimming
 */
export function sanitizeString(input: string): string {
    if (!input) return "";
    // Remove HTML tags
    return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validate phone number format (Indonesian: 08xxxxxxxxxx or +628xxxxxxxxxx)
 */
export function validatePhone(phone: string): { valid: boolean; message?: string } {
    const sanitized = phone.replace(/\s|-/g, "");

    // Indonesian phone format
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{7,10}$/;

    if (!sanitized) {
        return { valid: false, message: "Nomor telepon wajib diisi" };
    }

    if (!phoneRegex.test(sanitized)) {
        return { valid: false, message: "Format nomor telepon tidak valid (contoh: 08123456789)" };
    }

    return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; message?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        return { valid: false, message: "Email wajib diisi" };
    }

    if (!emailRegex.test(email)) {
        return { valid: false, message: "Format email tidak valid" };
    }

    return { valid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: string | undefined | null, fieldName: string): { valid: boolean; message?: string } {
    if (!value || !value.trim()) {
        return { valid: false, message: `${fieldName} wajib diisi` };
    }
    return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password) {
        return { valid: false, message: "Password wajib diisi" };
    }

    if (password.length < 6) {
        return { valid: false, message: "Password minimal 6 karakter" };
    }

    return { valid: true };
}

/**
 * Sanitize all string fields in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result = { ...obj };

    for (const key in result) {
        if (typeof result[key] === "string") {
            result[key] = sanitizeString(result[key]) as any;
        }
    }

    return result;
}
