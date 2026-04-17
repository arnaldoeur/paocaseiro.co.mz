/**
 * Standardizes a phone number or email to a consistent format for lookup.
 * If it contains '@', it returns the email trimmed and lowered.
 * If it looks like a phone number, it ensures it has the +258 prefix.
 */
export const normalizeIdentifier = (identifier: string): string => {
    const trimmed = identifier.trim();
    
    // If it's an email, just return normalized email
    if (trimmed.includes('@')) {
        return trimmed.toLowerCase();
    }
    
    // Clean all non-digit characters
    let digits = trimmed.replace(/\D/g, '');
    
    // If it's a 9-digit number (Mozambique local), add 258
    if (digits.length === 9) {
        digits = '258' + digits;
    }
    
    // If it's a 12-digit number starting with 258, it's correct
    if (digits.length === 12 && digits.startsWith('258')) {
        return '+' + digits;
    }
    
    // Fallback for cases already having + or other formats
    return trimmed.startsWith('+') ? trimmed : '+' + digits;
};
