import { hostingerService } from './hostingerService';

export interface UserSession {
    user: any;
    token: string;
}

export type AuthStateChangeHandler = (event: 'SIGNED_IN' | 'SIGNED_OUT', session: UserSession | null) => void;

class AuthService {
    private listeners: AuthStateChangeHandler[] = [];
    private sessionCache: UserSession | null = null;

    constructor() {
        this.loadSession();
    }

    private loadSession() {
        const token = localStorage.getItem('pc_auth_token');
        const userStr = localStorage.getItem('pc_user_data');
        if (token && userStr) {
            try {
                this.sessionCache = { token, user: JSON.parse(userStr) };
            } catch (e) {
                this.sessionCache = null;
            }
        }
    }

    private saveSession(session: UserSession | null) {
        this.sessionCache = session;
        if (session) {
            localStorage.setItem('pc_auth_token', session.token);
            localStorage.setItem('pc_user_data', JSON.stringify(session.user));
            // Backwards compatibility for other components
            localStorage.setItem('pc_auth_phone', session.user.phone || session.user.contact_no || '');
            localStorage.setItem('pc_auth_id', session.user.id || '');
        } else {
            localStorage.removeItem('pc_auth_token');
            localStorage.removeItem('pc_user_data');
            localStorage.removeItem('pc_auth_phone');
            localStorage.removeItem('pc_auth_id');
        }
    }

    private notifyListeners(event: 'SIGNED_IN' | 'SIGNED_OUT') {
        this.listeners.forEach(listener => listener(event, this.sessionCache));
        // Broadcast custom event for other generic components
        window.dispatchEvent(new Event('pc_user_update'));
    }

    async getSession() {
        this.loadSession();
        return { data: { session: this.sessionCache }, error: null };
    }

    onAuthStateChange(handler: AuthStateChangeHandler) {
        this.listeners.push(handler);
        // Immediately fire with current state
        setTimeout(() => handler(this.sessionCache ? 'SIGNED_IN' : 'SIGNED_OUT', this.sessionCache), 0);
        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        this.listeners = this.listeners.filter(l => l !== handler);
                    }
                }
            }
        };
    }

    async signInWithPassword(identifier: string, password?: string) {
        try {
            const data = await hostingerService.fetch('auth_customer', { identifier, password });
            if (data?.success && data.token) {
                const session: UserSession = { user: data.user, token: data.token };
                this.saveSession(session);
                this.notifyListeners('SIGNED_IN');
                return { data, error: null };
            } else {
                return { data: null, error: new Error(data?.error || 'Invalid credentials') };
            }
        } catch (error: any) {
            return { data: null, error };
        }
    }

    async signInWithGoogle(email: string, name: string, avatarUrl: string) {
        try {
            const data = await hostingerService.fetch('auth_customer_google', { email, name, avatar_url: avatarUrl });
            if (data?.success && data.token) {
                // Mock app_metadata format to match supabase's old structure
                const userObj = {
                    ...data.user,
                    app_metadata: { provider: 'google' }
                };
                const session: UserSession = { user: userObj, token: data.token };
                this.saveSession(session);
                this.notifyListeners('SIGNED_IN');
                return { data, error: null };
            } else {
                return { data: null, error: new Error(data?.error || 'Google Login failed') };
            }
        } catch (error: any) {
            return { data: null, error };
        }
    }

    async signUp(email: string, password?: string, name?: string, phone?: string) {
        try {
            const data = await hostingerService.fetch('register_customer', { email, password, name, phone });
            if (data?.success && data.token) {
                const session: UserSession = { user: data.user, token: data.token };
                this.saveSession(session);
                this.notifyListeners('SIGNED_IN');
                return { data, error: null };
            } else {
                return { data: null, error: new Error(data?.error || 'Failed to create account') };
            }
        } catch (error: any) {
            return { data: null, error };
        }
    }

    async updateCurrentUser(updates: any) {
        try {
            const { data: { session } } = await this.getSession();
            if (!session) throw new Error('Not authenticated');
            
            const userData = { ...session.user, ...updates };
            const data = await hostingerService.saveCustomer(userData);
            if (data?.success) {
                const newSession: UserSession = { ...session, user: userData };
                this.saveSession(newSession);
                this.notifyListeners('SIGNED_IN');
                return { data, error: null };
            }
            return { data: null, error: new Error('Failed to update profile') };
        } catch (error: any) {
            return { data: null, error };
        }
    }

    async signOut() {
        this.saveSession(null);
        this.notifyListeners('SIGNED_OUT');
        return { error: null };
    }
}

export const authService = new AuthService();
