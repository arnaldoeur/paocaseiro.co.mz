/**
 * Formats a string to have only the first letter capitalized and the rest lowercase.
 * Example: "PÃO CASEIRO" -> "Pão caseiro"
 * Example: "pão caseiro" -> "Pão caseiro"
 */
export const formatProductName = (name: string): string => {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.length === 0) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};
