import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hostingerService } from '../../services/hostingerService';

// ──────────────────────────────────────────────
// API Tests: hostingerService
// ──────────────────────────────────────────────

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const mockSuccess = (data: any) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
};

const mockHttpError = (status: number) => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: 'fail' }),
  });
};

const mockNetworkError = () => {
  mockFetch.mockRejectedValueOnce(new Error('Network Error'));
};

describe('hostingerService.fetch', () => {
  it('sends POST with correct URL, headers, and body', async () => {
    mockSuccess({ success: true });

    await hostingerService.fetch('get_products');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('action=get_products'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Bearer'),
        }),
      })
    );
  });

  it('includes action in request body', async () => {
    mockSuccess({ ok: true });

    await hostingerService.fetch('get_orders', { status: 'pending' });

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.action).toBe('get_orders');
    expect(body.status).toBe('pending');
  });

  it('throws on HTTP error', async () => {
    mockHttpError(500);
    await expect(hostingerService.fetch('fail')).rejects.toThrow('HTTP error');
  });

  it('throws on network error', async () => {
    mockNetworkError();
    await expect(hostingerService.fetch('fail')).rejects.toThrow('Network Error');
  });
});

describe('hostingerService — Products API', () => {
  it('getProducts calls correct action', async () => {
    mockSuccess({ data: [{ id: '1', name: 'Pão' }] });
    const res = await hostingerService.getProducts();
    expect(res.data).toHaveLength(1);
  });

  it('saveProduct sends product data', async () => {
    mockSuccess({ success: true });
    await hostingerService.saveProduct({ name: 'Bolo', price: 150 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.product_data.name).toBe('Bolo');
  });

  it('deleteProduct sends correct id', async () => {
    mockSuccess({ success: true });
    await hostingerService.deleteProduct('abc-123');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.id).toBe('abc-123');
  });

  it('bulkSaveProducts sends array', async () => {
    mockSuccess({ success: true });
    await hostingerService.bulkSaveProducts([{ name: 'A' }, { name: 'B' }]);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.products).toHaveLength(2);
  });
});

describe('hostingerService — Orders API', () => {
  it('saveOrder sends order data', async () => {
    const order = {
      short_id: 'PC-001',
      customer_name: 'João',
      customer_phone: '841234567',
      total_amount: 500,
      delivery_type: 'pickup' as const,
      items: [{ name: 'Pão', quantity: 5, price: 100 }],
    };
    mockSuccess({ success: true });
    await hostingerService.saveOrder(order);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.customer_name).toBe('João');
    expect(body.items).toHaveLength(1);
  });

  it('getOrders with status filter', async () => {
    mockSuccess({ data: [] });
    await hostingerService.getOrders('pending');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.status).toBe('pending');
  });

  it('updateOrderStatus sends short_id and status', async () => {
    mockSuccess({ success: true });
    await hostingerService.updateOrderStatus('PC-002', 'ready');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.short_id).toBe('PC-002');
    expect(body.status).toBe('ready');
  });
});

describe('hostingerService — Auth API', () => {
  it('authTeam sends credentials', async () => {
    mockSuccess({ token: 'abc', role: 'admin' });
    await hostingerService.authTeam('admin', 'secret');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.username).toBe('admin');
    expect(body.password).toBe('secret');
  });
});

describe('hostingerService — Notifications API', () => {
  it('getNotifications calls correct action', async () => {
    mockSuccess({ data: [] });
    await hostingerService.getNotifications();
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('get_notifications');
  });

  it('markNotificationRead sends id', async () => {
    mockSuccess({ success: true });
    await hostingerService.markNotificationRead('notif-1');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.id).toBe('notif-1');
  });
});

describe('hostingerService — Team API', () => {
  it('getTeam returns team list', async () => {
    mockSuccess({ data: [{ id: '1', name: 'Maria' }] });
    const res = await hostingerService.getTeam();
    expect(res.data[0].name).toBe('Maria');
  });

  it('deleteTeamMember sends id', async () => {
    mockSuccess({ success: true });
    await hostingerService.deleteTeamMember('tm-1');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.id).toBe('tm-1');
  });
});

describe('hostingerService — Cash Sessions API', () => {
  it('openCashSession sends balance and opener', async () => {
    mockSuccess({ success: true });
    await hostingerService.openCashSession('admin', 5000);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.opened_by).toBe('admin');
    expect(body.opening_balance).toBe(5000);
  });

  it('closeCashSession sends closing data', async () => {
    mockSuccess({ success: true });
    await hostingerService.closeCashSession('sess-1', 12000, 'All good');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.id).toBe('sess-1');
    expect(body.closing_balance).toBe(12000);
    expect(body.status).toBe('closed');
  });
});
