const fs = require('fs');
const path = 'c:/Users/arnal/Downloads/paocaseiro.co.mz-20260317T132532Z-1-001/paocaseiro.co.mz/paocaseiro.co.mz/services/email.ts';
let content = fs.readFileSync(path, 'utf8');

// Find the sendEmail function block and replace the fetch part
const startIndex = content.indexOf("export const sendEmail = async (to: string[]");
const endIndex = content.indexOf("console.log('Email sent successfully:', data);", startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const originalBlock = content.substring(startIndex, endIndex);
    
    // Replace the inner logic
    const newBlock = `export const sendEmail = async (to: string[], subject: string, html: string, replyTo?: string, fromOverride?: string, bcc: string[] = [], attachments: any[] = []) => {
    try {
        const finalBcc = Array.from(new Set([...bcc, 'geral@paocaseiro.co.mz']));

        const payload: any = {
            from: fromOverride || DEFAULT_FROM,
            to,
            subject,
            html: brandedEmailLayout(html),
            bcc: finalBcc
        };

        if (replyTo) payload.reply_to = replyTo;
        if (attachments && attachments.length > 0) payload.attachments = attachments;

        const { data, error } = await supabase.functions.invoke('notify-email', { body: payload });

        if (error) {
            console.error('Supabase Email Function Error:', error);
            throw error;
        }

        const responseData = data;
`;
    
    // Find where the brandedEmailLayout call ends and the fetch starts
    // In the broken file, we have the supabase.functions.invoke already there but then legacy junk
    
    // Let's just use a simpler replacement for the whole file if possible, or targeted
    const repairedContent = content.replace(/try \{[\s\S]*?console\.log\('Email sent successfully:', data\);/, 
        `try {
        const finalBcc = Array.from(new Set([...bcc, 'geral@paocaseiro.co.mz']));
        const payload: any = {
            from: fromOverride || DEFAULT_FROM,
            to,
            subject,
            html: brandedEmailLayout(html),
            bcc: finalBcc
        };
        if (replyTo) payload.reply_to = replyTo;
        if (attachments && attachments.length > 0) payload.attachments = attachments;

        const { data, error } = await supabase.functions.invoke('notify-email', { body: payload });
        if (error) throw error;
        const responseData = data;
        console.log('Email sent successfully:', responseData);`);
    
    fs.writeFileSync(path, repairedContent);
    console.log('Repaired email.ts');
} else {
    console.log('Could not find target block in email.ts');
}
