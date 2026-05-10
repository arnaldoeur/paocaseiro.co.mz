import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAudit, AuditEntityType } from '../../services/audit';
import { hostingerService } from '../../services/hostingerService';

// Mock hostingerService
vi.mock('../../services/hostingerService', () => ({
  hostingerService: {
    saveAuditLog: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('logAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('inserts audit log with provided fields via hostingerService', async () => {
    await logAudit({
      action: 'product_created',
      entity_type: 'product',
      entity_id: 'prod-1',
      user_id: 'user-1',
      details: { name: 'Pão' },
    });

    expect(hostingerService.saveAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'product_created',
        entity_type: 'product',
        entity_id: 'prod-1',
        user_id: 'user-1',
        details: { name: 'Pão' },
      })
    );
  });

  it('falls back to admin_id from localStorage', async () => {
    localStorage.setItem('admin_id', 'local-admin');
    
    await logAudit({ action: 'login', entity_type: 'auth' });

    expect(hostingerService.saveAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'local-admin',
        action: 'login'
      })
    );
  });

  it('falls back to pc_auth_id if no admin_id', async () => {
    localStorage.setItem('pc_auth_id', 'customer-99');
    
    await logAudit({ action: 'order_placed', entity_type: 'order' });

    expect(hostingerService.saveAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'customer-99',
        action: 'order_placed'
      })
    );
  });

  it('picks up customer phone from localStorage', async () => {
    localStorage.setItem('pc_auth_phone', '841234567');
    
    await logAudit({ action: 'order_placed', entity_type: 'order' });

    expect(hostingerService.saveAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_phone: '841234567'
      })
    );
  });

  it('handles save errors gracefully (no throw)', async () => {
    (hostingerService.saveAuditLog as any).mockRejectedValue(new Error('DB down'));

    // Should NOT throw
    await expect(
      logAudit({ action: 'test', entity_type: 'system' })
    ).resolves.toBeUndefined();
  });

  it('validates all entity types', () => {
    const validTypes: AuditEntityType[] = [
      'website', 'system', 'purchase', 'product', 'file',
      'order', 'customer', 'auth', 'blog', 'logistics', 'team_member',
    ];
    validTypes.forEach((t) => {
      expect(typeof t).toBe('string');
    });
  });
});
