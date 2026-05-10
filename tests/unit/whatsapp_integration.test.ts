import { describe, it, expect, vi } from 'vitest';
import { sendWhatsAppMessage } from '../../services/whatsapp';

describe('WhatsApp Service Integration', () => {
    it('should format and send a message via Evolution API', async () => {
        // Mock fetch globally
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'sent' })
        });
        global.fetch = mockFetch;

        const result = await sendWhatsAppMessage('258876666903', 'Teste de Unidade');
        
        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('message/sendText/Pao%20caseiro'),
            expect.anything()
        );
    });
});
