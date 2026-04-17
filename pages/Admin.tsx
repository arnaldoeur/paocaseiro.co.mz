import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const driverIcon = new L.DivIcon({
  className: 'custom-driver-icon',
  html: `<div style="background-color: #3b2f2f; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #d9a65a; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5h-3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const mapPinIcon = new L.DivIcon({
  className: 'custom-pin-icon',
  html: `<div style="color: #ef4444;"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const QuillBase = ReactQuill as any;
import { Eye, EyeOff, Sparkles, MessageSquare, Trash2, Upload, Send, CheckCircle, Package, TrendingUp, User, LogOut, ShoppingBag, Clock, Menu, X, ChevronRight, Search, Plus, Calendar, MapPin, Truck, Smartphone, Users, MessageCircle, Mail, Download, ChevronLeft, Loader, ShoppingCart, Lock, Unlock, XCircle, CreditCard, Banknote, Printer, FileText, Key, Edit3, Usb, Wifi, Share2, RefreshCw, UserPlus, Bell, Award, BarChart3, ShieldCheck, MailPlus, Box, Store, Zap, LineChart, AlertTriangle, Star, Save, Bot, RotateCw, Image as ImageIcon, Paperclip, ExternalLink, Tv, Settings, Sliders, LayoutDashboard, Globe } from 'lucide-react';
import { AdminSupportAI } from '../components/AdminSupportAI';
import { logAudit } from '../services/audit';
import { Kitchen } from './Kitchen';
import { AnalyticsChart } from '../components/Analytics/AnalyticsChart';
import { AdminPerformanceView } from './admin/AdminPerformanceView';
import { AdminAuditView } from './admin/AdminAuditView';
import { QueueManager } from '../components/admin/QueueManager';
import { AdminNotifications } from '../components/admin/AdminNotifications';
import { AdminDriveView } from './admin/AdminDriveView';
import { AdminMenuView } from './admin/AdminMenuView';
import { AdminBillingView } from '../components/admin/AdminBillingView';
import { AdminNewsletterView } from '../components/admin/AdminNewsletterView';
import { AdminEmailPipelineView } from '../components/admin/AdminEmailPipelineView';
import { generateMasterReport } from '../services/reportGenerator';
import { sendSMS, sendWhatsApp, notifyCustomer } from '../services/sms';
import { sendEmail, sendTeamWelcomeEmail } from '../services/email';
import { supabase, getConnectionMode, setConnectionMode, refreshSupabaseClient, type ConnectionMode, getPublicUrlSafely } from '../services/supabase';
import { printerService } from '../services/printer';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { NotificationService } from '../services/NotificationService';
import { useRealtimeOrders } from '../hooks/useRealtimeOrders';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { AdminBlogView } from '../components/admin/AdminBlogView';

const MAIL_STYLES = `
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px; /* Thinner scrollbar */
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #3b2f2f20;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #d9a65a40;
    }
    /* Thinner horizontal scrollbar for filters */
    .thin-scrollbar::-webkit-scrollbar {
        height: 3px;
    }
    .thin-scrollbar::-webkit-scrollbar-thumb {
        background: #d9a65a20;
        border-radius: 10px;
    }
`;

// --- Types ---
interface Order {
    id?: string;
    customer_id?: string;
    orderId: string;
    paymentRef: string;
    date: string;
    status: 'pending' | 'processing' | 'ready' | 'delivering' | 'arrived' | 'completed' | 'cancelled';
    staff_id?: string;
    driver_id?: string;
    otp?: string;
    total: number;
    amountPaid: number;
    amount_received?: number;
    balance: number;
    payment_method?: string;
    transaction_id?: string;
    customer: {
        name: string;
        phone: string;
        type: 'delivery' | 'pickup' | 'dine_in';
        address?: string;
        tableZone?: string;
        tablePeople?: number;
        notes?: string;
        internal_id?: string;
    };
    items: Array<{
        name: string;
        price: number;
        quantity: number;
    }>;
}

// --- New Types for Logistics ---
interface Driver {
    id: string;
    name: string;
    phone: string;
    vehicle?: string;
    status: 'available' | 'busy' | 'offline';
    base_location?: string;
    alternative_phone?: string;
    email?: string;
}

interface ManualDelivery { // For non-order based deliveries if needed
    id: string;
    customer_name: string;
    address: string;
    phone: string;
    details: string;
    coordinates?: string; // Link or coords
}

const isValidUUID = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const Admin: React.FC = () => {
    // Auth State
    useEffect(() => {
        const styleTag = document.createElement("style");
        styleTag.innerHTML = MAIL_STYLES;
        document.head.appendChild(styleTag);
        return () => { document.head.removeChild(styleTag); };
    }, []);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [adminUser, setAdminUser] = useState<string>('');
    const [adminPhoto, setAdminPhoto] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('admin_sound') !== 'false');
    const [whatsappMenuMode, setWhatsappMenuMode] = useState(false);
    const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false);

    // Sidebar/View State
    const [activeView, setActiveView] = useState<'dashboard' | 'orders' | 'kitchen' | 'stock' | 'pos' | 'delivery' | 'settings' | 'customers' | 'team' | 'logistics' | 'support' | 'support_ai' | 'billing' | 'documents' | 'messages' | 'blog' | 'newsletter' | 'queue' | 'notificacoes'>('dashboard');

    // Real-time Data Hooks
    const [activeToast, setActiveToast] = useState<any>(null);
    const { orders, loading: ordersLoading, refresh: refreshOrders } = useRealtimeOrders((newOrder) => {
        if (newOrder.id) announceOrder(newOrder.id);
    });
    const { notifications: systemLogs, loading: logsLoading } = useRealtimeNotifications((newNotif) => {
        setActiveToast(newNotif);
        // Auto-dismiss after 6 seconds
        setTimeout(() => setActiveToast(null), 6000);
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 768);
    
    // Auto-close sidebar on mobile after navigation
    const handleNavClick = (view: any) => {
        setActiveView(view);
        if (window.innerWidth < 768) setIsSidebarCollapsed(true);
    };

    // --- Voice Notifications (TTS) ---
    const speakQueue = useRef<string[]>([]);
    const isSpeaking = useRef(false);

    const processSpeakQueue = () => {
        if (isSpeaking.current || speakQueue.current.length === 0 || !soundEnabled) {
            if (!soundEnabled) {
                speakQueue.current = [];
                window.speechSynthesis.cancel();
            }
            return;
        }
        
        isSpeaking.current = true;
        const text = speakQueue.current.shift()!;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT';
        utterance.rate = 0.9;
        
        utterance.onend = () => {
            isSpeaking.current = false;
            setTimeout(processSpeakQueue, 500);
        };

        utterance.onerror = () => {
            isSpeaking.current = false;
            processSpeakQueue();
        };

        window.speechSynthesis.speak(utterance);
    };

    const announceOrder = async (orderIdInDB: string) => {
        if (!soundEnabled) return;

        try {
            // Play a small "ping" first
            const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            chime.volume = 0.2;
            chime.play().catch(() => {});

            // Fetch full order details
            const { data: order } = await supabase
                .from('orders')
                .select('*, items:order_items(product_name, quantity)')
                .eq('id', orderIdInDB)
                .single();

            if (order) {
                const displayId = order.orderId || order.id.slice(-4);
                const type = order.customer?.type === 'delivery' ? 'Entrega' : 
                             order.customer?.type === 'pickup' ? 'Levantamento' : 'Cozinha';
                
                const itemsText = (order.items || [])
                    .map((i: any) => `${i.quantity} ${i.product_name}`)
                    .join(', ');

                const text = `Pedido ${displayId}. ${type}. ${itemsText}`;
                speakQueue.current.push(text);
                processSpeakQueue();
            }
        } catch (e) {
            console.error("TTS Error:", e);
        }
    };

    const toggleSound = () => {
        const newVal = !soundEnabled;
        setSoundEnabled(newVal);
        localStorage.setItem('admin_sound', newVal.toString());
        if (!newVal) {
            window.speechSynthesis.cancel();
            speakQueue.current = [];
        }
    };

    const handleExportMaster = async () => {
        try {
            const branding = {
                name: 'Pão Caseiro',
                address: companyInfo?.address || 'Av. Acordo de Lusaka, Xiquelene, Maputo',
                phone: companyInfo?.phone || '+258 87 9146 662',
                email: 'geral@paocaseiro.co.mz',
                website: 'www.paocaseiro.co.mz',
                logo: companyInfo?.logo || '/images/logo_receipt.png',
                issuerName: adminUser || username || 'Supervisor / Admin'
            };
            
            const globalData = {
                orders: orders,
                stock: products,
                kitchen: orders.filter(o => o.status === 'processing' || o.status === 'pending'),
                team: teamMembers,
                customers: customers,
                logs: [] // Fetched in IT Support usually
            };
            
            await generateMasterReport(globalData, branding);
        } catch (error) {
            console.error('Failed to generate master report:', error);
            alert('Falha ao gerar o Master Report.');
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
    const [stockAvailabilityFilter, setStockAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
    const [stockTab, setStockTab] = useState<'overview' | 'management' | 'pricing' | 'menu'>('overview');
    const [selectedMassStockIds, setSelectedMassStockIds] = useState<string[]>([]);
    const [editedMassStock, setEditedMassStock] = useState<Record<string, { stockQuantity: number; unit: string; inStock: boolean; showInMenu: boolean }>>({});
    const [editedMassPricing, setEditedMassPricing] = useState<Record<string, { purchasePrice: number; otherCost: number; marginPercentage: number; finalPrice: number }>>({});
    const [isSavingMassStock, setIsSavingMassStock] = useState(false);
    const [isSavingMassPricing, setIsSavingMassPricing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled' | 'active'>('active');
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const [showMassStockModal, setShowMassStockModal] = useState(false);
    const [showMassPosModal, setShowMassPosModal] = useState(false);
    const [massInput, setMassInput] = useState('');

    // Data State
    const [products, setProducts] = useState<any[]>([]);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

    // Logistics State
    const [logisticsTab, setLogisticsTab] = useState<'dashboard' | 'deliveries' | 'drivers'>('dashboard');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isAddingDriver, setIsAddingDriver] = useState(false);
    const [selectedDriverFile, setSelectedDriverFile] = useState<File | null>(null);
    const [isSupportTicketOpen, setIsSupportTicketOpen] = useState(false);
    const [supportForm, setSupportForm] = useState({ subject: '', message: '', image: null as File | null });
    const [isAddingDelivery, setIsAddingDelivery] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [orderToAssign, setOrderToAssign] = useState<Order | null>(null);
    const [driverForm, setDriverForm] = useState({
        name: '', phone: '', vehicle: '', base_location: '', email: '', alternative_phone: '', avatar_url: ''
    });

    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [memberAvatar, setMemberAvatar] = useState<string | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any | null>(null);
    // POS State
    const [posCart, setPosCart] = useState<any[]>([]);
    const [posCustomer, setPosCustomer] = useState<any>(null);
    const [posOrderType, setPosOrderType] = useState<'takeaway' | 'dine-in' | 'local'>('local');
    const [posSearchTerm, setPosSearchTerm] = useState('');
    const [posCategory, setPosCategory] = useState('all');

    // POS Extensions State
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [lastBarcodeCharTime, setLastBarcodeCharTime] = useState(0);
    const [changeDue, setChangeDue] = useState(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mpesa' | 'ecash' | 'emola'>('cash');
    const [splitPayments, setSplitPayments] = useState<Record<string, number | string>>({});
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [isOpeningSession, setIsOpeningSession] = useState(false);
    const [initialBalance, setInitialBalance] = useState('');
    const [currentBalance, setCurrentBalance] = useState(0);
    const [closeNotes, setCloseNotes] = useState('');
    const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
    const [printerConfig, setPrinterConfig] = useState(() => {
        const saved = localStorage.getItem('pos_printer_config');
        return saved ? JSON.parse(saved) : { type: 'usb', paperSize: '58mm', autoPrint: true };
    });

    const [isPrinterConnected, setIsPrinterConnected] = useState(printerService.isConnected());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Update printer connection status periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const connected = printerService.isConnected();
            if (connected !== isPrinterConnected) {
                setIsPrinterConnected(connected);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [isPrinterConnected]);

    useEffect(() => {
        if (activeView === 'pos' && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [activeView]);

    useEffect(() => {
        const total = posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        const received = Object.values(splitPayments).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) as number;
        if (received > total) {
            setChangeDue(Math.max(0, received - total));
        } else {
            setChangeDue(0);
        }
    }, [splitPayments, posCart]);

    useEffect(() => {
        if (showPaymentModal) {
            setSplitPayments({});
            setPaymentMethod('cash');
            setChangeDue(0);
        }
    }, [showPaymentModal]);

    // Message & System Settings State
    const [companyInfo, setCompanyInfo] = useState({
        name: 'Pão Caseiro',
        legalName: '',
        logo: '',
        email: 'geral@paocaseiro.co.mz',
        phone: '+258 87 9146 662',
        website: 'www.paocaseiro.co.mz',
        regNo: '',
        nuit: '',
        industry: 'Bakery & Food Service',
        country: 'Moçambique',
        province: 'Niassa',
        city: 'Lichinga',
        address: 'Av. Acordo de Lusaka',
        postalCode: '3300',
        slogan: 'O Sabor que Aquece o Coração',
        motto: 'Qualidade em cada fornada',
        currency: 'MT',
        language: 'pt',
        prefix: 'CLI',
        staffPrefix: 'FUNC',
        productPrefix: 'PROD',
        docPrefix: 'DOC'
    });

    const [emailSettings, setEmailSettings] = useState(() => {
        const saved = localStorage.getItem('message_settings');
        return saved ? JSON.parse(saved) : {
            senderId: 'Pão Caseiro',
            user: 'admin',
            icon: '',
            address: 'Lichinga, Av. Acordo de Lusaka',
            phone: '+258 87 9146 662'
        };
    });

    const [activeSettingsTab, setActiveSettingsTab] = useState<'notifications' | 'branding' | 'printer' | 'hardware' | 'profile' | 'team' | 'performance' | 'company' | 'audit'>('profile');
    
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    const fetchAuditLogs = async () => {
        setAuditLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);
            if (!error && data) setAuditLogs(data);
        } catch (e) {
            console.error(e);
        }
        setAuditLoading(false);
    };

    useEffect(() => {
        if (activeSettingsTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeSettingsTab]);

    const [teamNumbers, setTeamNumbers] = useState(() => {
        const saved = localStorage.getItem('team_numbers');
        return saved ? JSON.parse(saved) : {
            admin1: '258879146662',
            admin2: '258846930960',
            kitchen: '',
            chef: '',
            adminEmail: 'geral@paocaseiro.co.mz'
        };
    });

    const [performanceSettings, setPerformanceSettings] = useState({
        dailySalesGoal: 5000,
        monthlyTarget: 150000,
        isAIExtensionEnabled: false
    });

    const [activePerformanceTab, setActivePerformanceTab] = useState<'overview' | 'tracking' | 'productivity' | 'analytics' | 'insights'>('overview');
    const [performanceMetrics, setPerformanceMetrics] = useState({
        totalHours: 0,
        activeStaff: 0,
        ordersToday: 0,
        productivityScore: 0
    });
    const [teamCheckins, setTeamCheckins] = useState<any[]>([]);
    const [performanceSearch, setPerformanceSearch] = useState('');
    const [analyticsTimeFilter, setAnalyticsTimeFilter] = useState<'today' | 'week' | 'month'>('today');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiReportContent, setAiReportContent] = useState<string | null>(null);
    const [isUserCheckedIn, setIsUserCheckedIn] = useState(false);
    const [analyticsFilter, setAnalyticsFilter] = useState<'today' | 'week' | 'month'>('today');
    const [selectedPerformanceMember, setSelectedPerformanceMember] = useState<any | null>(null);

    const [memberForm, setMemberForm] = useState({
        id: 0,
        name: '',
        username: '',
        email: '',
        phone: '',
        role: 'staff',
        password: '',
        avatar_url: ''
    });

    const [showTeamModal, setShowTeamModal] = useState(false);

    const [hardwareConfig, setHardwareConfig] = useState(() => {
        const saved = localStorage.getItem('hardware_config');
        return saved ? JSON.parse(saved) : {
            barcodeEnabled: true,
            barcodeConnection: 'usb',
            barcodeDeviceId: '',
            cashDrawerEnabled: true,
            cashDrawerConnection: 'usb',
            cashDrawerDeviceId: '',
            cameraEnabled: false
        };
    });

    const [dbStatus, setDbStatus] = useState<{ status: 'online' | 'error' | 'loading' | 'offline', message?: string }>({ status: 'offline' });
    const [connectionMode, setConnectionModeState] = useState<ConnectionMode>(getConnectionMode());
    const [isAddingQuickCustomer, setIsAddingQuickCustomer] = useState(false);
    const [quickCustomerForm, setQuickCustomerForm] = useState({ name: '', phone: '', email: '', nuit: '' });

    const [isScanning, setIsScanning] = useState<{ [key: string]: boolean }>({});

    const handleScanDevices = (hwType: 'barcode' | 'cashDrawer', connMode: string) => {
        setIsScanning(prev => ({ ...prev, [hwType]: true }));
        setTimeout(() => {
            setIsScanning(prev => ({ ...prev, [hwType]: false }));
            alert(`Novos dispositivos ${connMode.toUpperCase()} encontrados para ${hwType === 'barcode' ? 'o Leitor' : 'a Gaveta'}.`);
        }, 2000);
    };

    const [showReceiptConfirmation, setShowReceiptConfirmation] = useState(false);
    const [lastOrderData, setLastOrderData] = useState<any>(null);
    const [lastOrderItems, setLastOrderItems] = useState<any[]>([]);

    // Modal/Edit States
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<any>(null);
    const [previewImage, setPreviewImage] = useState('');
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [productVariations, setProductVariations] = useState<any[]>([]);
    const [isEditingMember, setIsEditingMember] = useState(false);
    const [currentMember, setCurrentMember] = useState<any>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [customerLogs, setCustomerLogs] = useState<any[]>([]);
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [customerForm, setCustomerForm] = useState<any>({});
    const [isAdminPasswordPromptOpen, setIsAdminPasswordPromptOpen] = useState(false);
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState('');
    const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);
    const [setPendingAdminActionState, _setPendingAdminAction] = useState<any>(null); // Alias if needed

    const handleExportDatabase = async () => {
        try {
            const tables = ['products', 'customers', 'orders', 'order_items', 'receipts', 'logistics_drivers', 'audit_logs'];
            const exportData: any = {};

            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (!error) exportData[table] = data;
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_paocaseiro_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            await logAudit({
                action: 'DATABASE_EXPORT',
                entity_type: 'system',
                details: { tables: tables }
            });
            
            alert('Base de dados exportada com sucesso!');
        } catch (err) {
            console.error('Export error:', err);
            alert('Falha ao exportar base de dados.');
        }
    };

    const handlePurgeDatabase = async () => {
        if (!confirm('AVISO CRÍTICO: Isto irá apagar TODOS os pedidos, clientes e histórico de faturamento para sempre. Os produtos e fotos serão mantidos. Deseja continuar?')) return;
        
        const password = prompt('Introduza a senha de administração para confirmar a limpeza total:');
        if (password !== 'admin' && password !== '2025') { 
            alert('Senha incorreta. Operação cancelada.');
            return;
        }

        setIsSubmitting(true);
        try {
            const tablesToClear = ['order_items', 'receipts', 'financial_movements', 'audit_logs', 'sms_logs', 'queue_tickets', 'orders', 'customers', 'contact_messages'];
            
            for (const table of tablesToClear) {
                const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
                if (error) console.error(`Erro ao limpar ${table}:`, error);
            }

            await logAudit({
                action: 'DATABASE_PURGE',
                entity_type: 'system',
                details: { tables: tablesToClear, performed_by: username }
            });

            alert('Limpeza de produção concluída com sucesso!');
            window.location.reload(); 
        } catch (err: any) {
            alert('Erro durante a limpeza: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Modal/Edit States (continued) ---
    const [messages, setMessages] = useState<any[]>([]);
    const [messageFolder, setMessageFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [isComposingEmail, setIsComposingEmail] = useState(false);
    const loadCustomerLogs = async (customerId: string) => {
        try {
            const { data, error } = await supabase.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setCustomerLogs(data);
        } catch (e) {
            console.error("Failed to load customer logs", e);
        }
    };

    const loadReceipts = async () => {
        try {
            const { data, error } = await supabase.from('receipts').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setReceipts(data);
        } catch (e) {
            console.error("Failed to load receipts", e);
        }
    };

    const handleOpenCashDrawer = async () => {
        try {
            await printerService.openCashDrawer();
            setIsPrinterConnected(true);
        } catch (e) {
            console.error('Drawer error:', e);
            alert('Erro ao abrir gaveta de dinheiro.');
        }
    };

    const handleOpenSession = () => setIsOpeningSession(true);

    const handleConfirmOpenSession = async () => {
        // Use the authenticated admin's ID from state or localStorage
        const effectiveUserId = userId || localStorage.getItem('admin_id');
        
        if (!effectiveUserId || !isValidUUID(effectiveUserId)) {
            return alert('Erro: Sessão de administrador inválida. Por favor, faça logout e entre novamente.');
        }

        // Verify if user exists in team_members to avoid foreign key violation
        const { data: userData, error: userError } = await supabase
            .from('team_members')
            .select('id')
            .eq('id', effectiveUserId)
            .single();

        if (userError || !userData) {
            console.error('Invalid admin user ID:', effectiveUserId);
            return alert('Erro: Utilizador administrativo não encontrado na base de dados. Por favor, faça logout e entre novamente.');
        }

        const { data, error } = await supabase.from('cash_sessions').insert([{
            opened_by: effectiveUserId,
            opening_balance: parseFloat(initialBalance) || 0,
            status: 'open'
        }]).select();

        if (error) {
            console.error('Error opening session:', error);
            alert('Erro ao abrir sessão: ' + error.message);
        } else {
            setCurrentSession(data[0]);
            setIsOpeningSession(false);
            setInitialBalance('');
            // Ensure state and localStorage are in sync
            if (!userId) setUserId(effectiveUserId);
        }
    };

    const handleCloseSession = () => {
        const total = posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        setCurrentBalance(total); // Suggest current session total
        setShowCloseSessionModal(true);
    };

    const handleConfirmCloseSession = async () => {
        const { error } = await supabase
            .from('cash_sessions')
            .update({
                closed_at: new Date().toISOString(),
                closing_balance: currentBalance,
                status: 'closed',
                notes: closeNotes
            })
            .eq('id', currentSession.id);

        if (error) {
            alert('Erro ao fechar sessão: ' + error.message);
        } else {
            setShowCloseSessionModal(false);
            setCloseNotes('');
            setCurrentSession(null);
        }
    };

    const mockDevices: { [key: string]: { [key: string]: string[] } } = {
        barcode: {
            bluetooth: ['Scanner BT-700', 'Netum E800', 'Eyoyo 2D'],
            usb: ['Scanner USB Generic v1', 'Honeywell 1900', 'Zebra DS2208'],
            wifi: ['Scanner IP-192.168.1.50', 'Scanner IP-192.168.1.55']
        },
        cashDrawer: {
            bluetooth: ['BT-Drawer Pro', 'M-Drawer v2'],
            usb: ['Standard USB Drawer', 'POS-Drawer-80mm'],
            wifi: ['IP-Drawer-Main', 'IP-Drawer-Bar']
        }
    };

    const handleProcessPayment = async () => {
        const total = posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        let finalAmountReceived = Object.values(splitPayments).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
        let finalMethodStr = paymentMethod;

        if (Object.keys(splitPayments).filter(k => Number(splitPayments[k]) > 0).length > 0) {
            if (finalAmountReceived < total) {
                alert('Valor recebido insuficiente nos métodos parciais!');
                return;
            }
            const methods = Object.entries(splitPayments).filter(([k,v]) => Number(v) > 0).map(([k,v]) => `${k.toUpperCase()} (${v}MT)`);
            finalMethodStr = methods.join(' | ');
        } else {
            if (paymentMethod === 'cash') {
                alert('Introduza o valor recebido em dinheiro!');
                return;
            }
            finalAmountReceived = total; // Assume full amount for single non-cash method
        }

        setIsSubmitting(true);
        try {
            const shortId = Math.random().toString(36).substring(7).toUpperCase();
            const orderData = {
                short_id: shortId,
                customer_name: posCustomer?.name || 'Venda Local (Balcão)',
                customer_phone: posCustomer?.contact_no || '',
                customer_email: posCustomer?.email || '',
                customer_nuit: posCustomer?.nuit || '',
                customer_id: posCustomer?.id || null,
                total_amount: total,
                status: 'completed',
                payment_status: 'paid',
                payment_method: finalMethodStr,
                delivery_address: posOrderType.toUpperCase(),
                delivery_type: posOrderType === 'takeaway' ? 'pickup' : 'dine_in',
                amount_paid: total,
                amount_received: finalAmountReceived,
                change_given: changeDue,
                balance: 0,
                cash_session_id: currentSession?.id,
                staff_id: (userId && isValidUUID(userId)) ? userId : null
            };

            const { data: orderResult, error: orderError } = await supabase.from('orders').insert([orderData]).select().single();
            if (orderError) throw orderError;

            // NEW: Log System Event with actionable link
            try {
                const { NotificationService } = await import('../services/NotificationService');
                await NotificationService.createNotification({
                    type: 'order',
                    title: '🛒 Venda POS',
                    message: `Pedido #${orderResult.short_id || orderResult.id.slice(0,6)} — ${orderData.customer_name} — ${orderData.total_amount} MT (${finalMethodStr})`,
                    entity_id: orderResult.id,
                    link: `/admin?view=encomendas`
                });
            } catch (logErr) {
                console.error("Manual order system logging failed:", logErr);
            }

            // Insert items
            const itemsToInsert = posCart.map(i => ({
                order_id: orderResult.id,
                product_id: i.id,
                product_name: i.name,
                price: i.price,
                quantity: i.quantity,
                subtotal: i.price * i.quantity
            }));
            const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // Audit Log
            await logAudit({
                action: 'ORDER_PLACED',
                entity_type: 'order',
                entity_id: orderResult.id,
                details: { total: total, method: paymentMethod, source: 'pos_admin' },
                customer_phone: posCustomer?.contact_no
            });


            // Open Cash Drawer automatically if payment includes cash
            if ((paymentMethod === 'cash' || finalMethodStr.includes('CASH')) && hardwareConfig.cashDrawerEnabled) {
                try {
                    await printerService.openCashDrawer();
                } catch (de) {
                    console.error("Failed to open drawer automatically", de);
                }
            }

            // Handle SMS notification if customer exists
            if (posCustomer?.contact_no && posCustomer.contact_no !== 'N/A') {
                const { notifyPaymentConfirmed } = await import('../services/sms');
                await notifyPaymentConfirmed(orderResult.id, posCustomer.contact_no, shortId);

                try {
                    const { notifyCustomerNewOrderWhatsApp } = await import('../services/whatsapp');
                    const fullOrderForWA = {
                        ...orderData,
                        id: orderResult.id
                    };
                    notifyCustomerNewOrderWhatsApp(fullOrderForWA, itemsToInsert).catch(e => console.error("WA error", e));
                } catch (e) {}
            }

            // --- Printer Support ---
            const printItems = posCart.map(i => ({
                quantity: i.quantity,
                product_name: i.name,
                price: i.price
            }));

            if (printerConfig.autoPrint) {
                try {
                    await printerService.printReceipt(orderData, printItems, printerConfig.paperSize);
                } catch (pe) {
                    console.error("Printing failed", pe);
                }
            }

            setLastOrderData(orderData);
            setLastOrderItems(printItems);
            setShowReceiptConfirmation(true);

            setPosCart([]);
            setPosCustomer(null);
            setShowPaymentModal(false);
            loadOrders();
        } catch (err: any) {
            alert('Erro ao processar venda: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!lastOrderData) return;

        const receiptElement = document.getElementById('pos-receipt-content');
        if (!receiptElement) {
            alert('Erro: Conteúdo do recibo não encontrado.');
            return;
        }

        try {
            // Temporarily disable max-height/overflow to capture full element content
            const originalStyle = receiptElement.getAttribute('style') || '';
            const originalClass = receiptElement.className;

            receiptElement.style.maxHeight = 'none';
            receiptElement.style.overflow = 'visible';
            receiptElement.classList.remove('overflow-y-auto');

            const canvas = await html2canvas(receiptElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowHeight: receiptElement.scrollHeight,
                scrollY: -window.scrollY, // Fix for elements offset by scroll
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('pos-receipt-content');
                    if (el) {
                        el.style.maxHeight = 'none';
                        el.style.overflow = 'visible';
                    }
                }
            });

            // Restore styles
            receiptElement.setAttribute('style', originalStyle);
            receiptElement.className = originalClass;

            const imgData = canvas.toDataURL('image/png');

            // Generate standard 80mm generic receipt width or adjust for A4 depending on length
            // Using a standard receipt roll width of 80mm
            const safeWidth = Math.max(1, canvas.width);
            const safeHeight = Math.max(80, (canvas.height * 80) / safeWidth);

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, safeHeight] // Dynamic height matching the roll
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 80, safeHeight);
            pdf.save(`Recibo_PaoCaseiro_${lastOrderData.short_id}.pdf`);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Erro ao gerar PDF.');
        }
    };

    const handleShareReceipt = async () => {
        if (!lastOrderData) return;

        const shareData = {
            title: `Recibo Pão Caseiro #${lastOrderData.short_id}`,
            text: `Venda de ${lastOrderData.total_amount} MT confirmada na Pão Caseiro.`,
            url: window.location.origin + '/order-receipt/' + lastOrderData.short_id
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback to WhatsApp
                const text = encodeURIComponent(`*Recibo Pão Caseiro*\nPedido: #${lastOrderData.short_id}\nTotal: ${lastOrderData.total_amount} MT\nVer Recibo: ${shareData.url}`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    // --- Persistence ---
    useEffect(() => {
        loadProducts();
        loadReceipts();

        // Legacy persistent local state removed - handled by reactive hooks.
        // Notifications and other real-time data now sync via Supabase.

        const savedMembers = localStorage.getItem('bakery_members');
        if (savedMembers) setTeamMembers(JSON.parse(savedMembers));

        const savedDrivers = localStorage.getItem('bakery_drivers');
        if (savedDrivers) setDrivers(JSON.parse(savedDrivers));

        // Load Admin User
        const savedUser = localStorage.getItem('admin_user');
        const savedUserId = localStorage.getItem('admin_id');
        if (savedUserId && savedUserId !== 'undefined' && savedUserId !== 'null' && isValidUUID(savedUserId)) {
            setUserId(savedUserId);
        }
        if (savedUser) {
            if (savedUser.startsWith('{')) {
                const parsed = JSON.parse(savedUser);
                setUsername(parsed.name || 'Nazir');
            } else {
                setUsername(savedUser);
            }
        } else {
            setUsername('Nazir');
        }
    }, []);

    // Barcode Scanner Listener
    useEffect(() => {
        if (activeView !== 'pos' || !emailSettings.barcodeEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            const now = Date.now();
            if (now - lastBarcodeCharTime > 100) {
                setBarcodeBuffer(e.key);
            } else {
                if (e.key === 'Enter') {
                    const code = barcodeBuffer.trim();
                    if (code) {
                        const product = products.find(p => p.barcode === code || p.sku === code || p.id === code);
                        if (product) {
                            setPosCart(prev => {
                                const existing = prev.find(item => item.id === product.id);
                                if (existing) {
                                    return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
                                } else {
                                    return [...prev, { ...product, quantity: 1 }];
                                }
                            });
                        }
                    }
                    setBarcodeBuffer('');
                } else {
                    setBarcodeBuffer(prev => prev + e.key);
                }
            }
            setLastBarcodeCharTime(now);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeView, barcodeBuffer, lastBarcodeCharTime, products]);

    // --- Logistics Data ---
    const loadMessages = async () => {
        try {
            let query = supabase.from('contact_messages').select('*');

            if (messageFolder === 'trash') {
                query = query.eq('status', 'trash');
            } else if (messageFolder === 'sent') {
                query = query.eq('status', 'replied');
            } else {
                // Inbox status: typically 'unread' or 'read', but NOT 'trash' and NOT 'replied'
                query = query.not('status', 'in', '("trash", "replied")');
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) {
                console.error("Messages Error:", error);
                throw error;
            }
            if (data) {
                console.log(`Loaded ${data.length} messages`);
                setMessages(data);
            }
        } catch (e) {
            console.error("Error loading messages:", e);
            throw e;
        }
    };
    // Poll driver locations when looking at deliveries tab
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeView === 'logistics' && logisticsTab === 'deliveries') {
            // Re-fetch driver coords every 10 secs
            interval = setInterval(() => {
                loadDrivers();
            }, 10000);
        }
        return () => clearInterval(interval);
    }, [activeView, logisticsTab]);

    const loadDrivers = async () => {
        try {
            const { data, error } = await supabase.from('logistics_drivers').select('*').order('name');
            if (error) throw error;
            if (data) {
                const mapped = data.map((d: any) => ({
                    ...d,
                    vehicle: d.vehicle_type // Map vehicle_type from DB to vehicle used in UI
                }));
                setDrivers(mapped);
            }
        } catch (e) {
            console.error("Failed to load drivers", e);
            throw e;
        }
    };

    const handleDriverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setSelectedDriverFile(file);
        // Instant local preview
        setDriverForm({ ...driverForm, avatar_url: URL.createObjectURL(file) });
    };

    const handleSaveDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalAvatarUrl = driverForm.avatar_url;

        // Deferred upload for Driver photo
        if (selectedDriverFile) {
            try {
                const fileExt = selectedDriverFile.name.split('.').pop();
                const fileName = `driver_${Date.now()}.${fileExt}`;
                const { error: uploadErr } = await supabase.storage.from('products').upload(fileName, selectedDriverFile);
                if (uploadErr) throw uploadErr;
                
                finalAvatarUrl = getPublicUrlSafely('products', fileName);
            } catch (err: any) {
                alert('Erro ao carregar foto do motorista: ' + err.message);
                return;
            }
        }

        const driverData = {
            name: driverForm.name,
            phone: driverForm.phone,
            vehicle_type: driverForm.vehicle,
            base_location: driverForm.base_location,
            email: driverForm.email,
            alternative_phone: driverForm.alternative_phone,
            avatar_url: finalAvatarUrl,
            status: 'available'
        };

        try {
            if (selectedDriver) {
                const { error } = await supabase.from('logistics_drivers').update(driverData).eq('id', selectedDriver.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('logistics_drivers').insert([driverData]);
                if (error) throw error;
            }
            
            setIsAddingDriver(false);
            setSelectedDriverFile(null);
            setSelectedDriver(null);
            setDriverForm({ name: '', phone: '', vehicle: '', base_location: '', email: '', alternative_phone: '', avatar_url: '' });
            loadDrivers();
        } catch (err) {
            console.error('Error saving driver:', err);
            alert('Erro ao salvar motorista.');
        }
    };

    const handleDeleteDriver = async (id: string) => {
        if (!confirm('Remover Motorista?')) return;
        await supabase.from('logistics_drivers').delete().eq('id', id);
        loadDrivers();
    };

    const handleDriverStatusChange = async (driverId: string, newStatus: string) => {
        // Optimistic update
        setDrivers(drivers.map(d => d.id === driverId ? { ...d, status: newStatus as any } : d));

        await supabase.from('logistics_drivers').update({ status: newStatus }).eq('id', driverId);
    };

    // Assign Order to Driver
    const handleAssignOrder = async () => {
        if (!selectedDriver || !orderToAssign) return;

        // 1. Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // 2. Update Order in Supabase
        const { error } = await supabase
            .from('orders')
            .update({ status: 'ready', driver_id: selectedDriver.id, otp: otp })
            .eq('short_id', orderToAssign.orderId);

        if (error) return alert("Erro ao atribuir pedido: " + error.message);

        // 3. Notify Driver — rich SMS + WhatsApp link
        const { notifyDriverAssigned } = await import('../services/sms');
        const whatsappUrl = await notifyDriverAssigned(selectedDriver, { ...orderToAssign, otp });

        alert(`Pedido #${orderToAssign.orderId} atribuído a ${selectedDriver.name}!\nSMS de notificação enviado ao motorista.`);

        if (whatsappUrl && confirm("Deseja reforçar com WhatsApp?")) {
            window.open(whatsappUrl, '_blank');
        }

        loadOrders();
        setOrderToAssign(null);
        setSelectedDriver(null);
    };

    const handleCompleteDelivery = (order: Order) => {
        if (!order.otp) {
            alert("Erro: Esta encomenda não tem OTP. Finalize apenas pelo painel de admin.");
            return;
        }
        const inputOtp = prompt(`Para finalizar a entrega #${order.orderId}, peça o OTP ao cliente:`);
        if (inputOtp === order.otp) {
            (async () => {
                await supabase.from('orders').update({ status: 'completed' }).eq('short_id', order.orderId);

                const updatedOrder = { ...order, status: 'completed' as const };
                loadOrders();

                // Notify Customer
                notifyCustomer(updatedOrder, 'status_update').catch(err => console.error("Customer completion status notification failed", err));

                alert("Sucesso! Entrega marcada como concluída.");
            })();
        } else {
            alert("Código OTP Incorreto! A entrega não foi finalizada.");
        }
    };

    const requestAdminAuth = (action: () => void) => {
        setPendingAdminAction(() => action);
        setAdminPasswordInput('');
        setIsAdminPasswordPromptOpen(true);
    };

    const handleVerifyAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        // Verify current admin password
        const { data } = await supabase
            .from('team_members')
            .select('id')
            .eq('id', userId)
            .eq('password', adminPasswordInput)
            .single();

        if (data) {
            setIsAdminPasswordPromptOpen(false);
            if (pendingAdminAction) pendingAdminAction();
        } else {
            alert('Palavra-passe de Administrador Incorreta!');
        }
    };

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        requestAdminAuth(async () => {
            await supabase.from('customers').update({
                name: customerForm.name,
                contact_no: customerForm.contact_no,
                email: customerForm.email,
                nuit: customerForm.nuit,
                date_of_birth: customerForm.date_of_birth,
                whatsapp: customerForm.whatsapp,
                updated_at: new Date().toISOString()
            }).eq('id', selectedCustomer.id);
            alert('Cliente atualizado com sucesso!');
            setIsEditingCustomer(false);
            loadCustomers();
            setSelectedCustomer({ ...selectedCustomer, ...customerForm });
        });
    };

    const handleDeleteCustomer = (id: string) => {
        if (!confirm('ATENÇÃO: Deseja apagar permanentemente este cliente e o seu histórico?')) return;
        requestAdminAuth(async () => {
            await supabase.from('customers').delete().eq('id', id);
            alert('Cliente removido!');
            setSelectedCustomer(null);
            loadCustomers();
        });
    };

    const handleResetCustomerPassword = async (customer: any) => {
        const method = customer.email ?
            (confirm(`Deseja enviar o reset de senha por EMAIL para ${customer.email}?\n(Clique em Cancelar para enviar por SMS para ${customer.contact_no})`) ? 'email' : 'sms')
            : 'sms';

        if (method === 'sms' && !confirm(`Gerar nova palavra-passe e enviar SMS para ${customer.contact_no}?`)) return;

        requestAdminAuth(async () => {
            const newPassword = Math.random().toString(36).slice(-8);
            try {
                const { error: updateError } = await supabase
                    .from('customers')
                    .update({ password: newPassword })
                    .eq('id', customer.id);

                if (updateError) throw updateError;

                if (method === 'email' && customer.email) {
                    const emailHtml = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #3b2f2f;">Reset de Senha - Pão Caseiro</h2>
                            <p>Olá <strong>${customer.name}</strong>,</p>
                            <p>A sua palavra-passe foi redefinida com sucesso.</p>
                            <div style="background: #fcfbf9; padding: 15px; border-radius: 8px; border: 1px solid #d9a65a; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Nova Palavra-passe</p>
                                <h3 style="margin: 5px 0; color: #3b2f2f; font-size: 24px; letter-spacing: 2px;">${newPassword}</h3>
                            </div>
                            <p>Recomendamos que altere a sua senha após o entrar.</p>
                            <p style="color: #888; font-size: 12px; margin-top: 30px;">Zyph Tech Security Team</p>
                        </div>
                    `;
                    await sendEmail([customer.email], 'Nova Palavra-passe - Pão Caseiro', emailHtml);
                    alert(`Sucesso! Nova senha enviada para o email ${customer.email}.`);
                } else {
                    const msg = `Pao Caseiro: A sua senha foi redefinida pela administracao. Nova senha: ${newPassword}`;
                    await sendSMS(customer.contact_no, msg);
                    alert('Palavra-passe redefinida e SMS enviado com sucesso!');
                }
            } catch (error: any) {
                alert('Erro ao resetar senha: ' + error.message);
            }
        });
    };

    const handleResetMemberPassword = async (member: any) => {
        const method = member.email ?
            (confirm(`Deseja enviar o reset de senha por EMAIL para ${member.email}?\n(Clique em Cancelar para ver no ecrã)`) ? 'email' : 'screen')
            : 'screen';

        if (method === 'screen' && !confirm(`Deseja redefinir a senha de ${member.name}?`)) return;

        requestAdminAuth(async () => {
            const newPassword = Math.random().toString(36).slice(-8);
            try {
                const { error: updateError } = await supabase
                    .from('team_members')
                    .update({ password: newPassword })
                    .eq('id', member.id);

                if (updateError) throw updateError;

                if (method === 'email' && member.email) {
                    const emailHtml = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #3b2f2f;">Acesso Equipa - Pão Caseiro</h2>
                            <p>Olá <strong>${member.name}</strong>,</p>
                            <p>A tua palavra-passe de acesso ao painel admin foi redefinida.</p>
                            <div style="background: #fcfbf9; padding: 15px; border-radius: 8px; border: 1px solid #d9a65a; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Nova Palavra-passe</p>
                                <h3 style="margin: 5px 0; color: #3b2f2f; font-size: 24px; letter-spacing: 2px;">${newPassword}</h3>
                            </div>
                            <p>Utilizador: <strong>${member.username}</strong></p>
                            <p style="color: #888; font-size: 12px; margin-top: 30px;">Zyph Tech Security Team</p>
                        </div>
                    `;
                    await sendEmail([member.email], 'Redefinição de Senha Equipa', emailHtml);
                    alert(`Sucesso! Nova senha enviada para ${member.email}.`);
                } else {
                    alert(`Nova palavra-passe para ${member.name}: ${newPassword}\nUsername: ${member.username}`);
                }
                loadTeam();
            } catch (error: any) {
                alert('Erro ao resetar senha: ' + error.message);
            }
        });
    };

    const handleToggleBlockCustomer = (customer: any) => {
        const isCurrentlyBlocked = customer.is_blocked;
        const actionText = isCurrentlyBlocked ? 'Desbloquear' : 'Bloquear';
        if (!confirm(`Deseja ${actionText} o cliente ${customer.name}?`)) return;

        requestAdminAuth(async () => {
            await supabase.from('customers').update({ is_blocked: !isCurrentlyBlocked }).eq('id', customer.id);
            alert(`Cliente ${actionText.toLowerCase()} com sucesso!`);
            loadCustomers();
            setSelectedCustomer({ ...customer, is_blocked: !isCurrentlyBlocked });
        });
    };

    const handleOpenCustomerDetails = async (customer: any) => {
        setSelectedCustomer(customer);
        // Fetch all order logs linking to this customer by their phone
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_phone', customer.contact_no)
            .order('created_at', { ascending: false });

        if (data) setCustomerLogs(data);
    };

    // Dashboard States
    const [currentTime, setCurrentTime] = useState(new Date());
    const [quote, setQuote] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', phone: '', password: '', confirmPassword: '', photo: '' });

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('products').upload(fileName, file); // Using products bucket as generic storage for now

        if (error) {
            alert('Erro ao enviar foto: ' + error.message);
        } else {
            const publicUrl = getPublicUrlSafely('products', fileName);
            setUserForm(prev => ({ ...prev, photo: publicUrl }));
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (userForm.password && userForm.password !== userForm.confirmPassword) {
            alert('As senhas não coincidem!');
            setIsSubmitting(false);
            return;
        }

        try {
            let uid = userId;
            if (!uid) {
                // Try to find by username map if we don't have ID (Legacy session)
                const { data: userProps } = await supabase.from('team_members').select('id').eq('username', username).single();
                if (userProps) uid = userProps.id;
            }

            if (!uid) {
                throw new Error("SESSÃO INVÁLIDA: Por favor faça LOGOUT e LOGIN novamente.");
            }

            const updates: any = {};
            if (userForm.name) updates.name = userForm.name;
            if (userForm.photo) updates.avatar_url = userForm.photo;
            if (userForm.phone) updates.phone = userForm.phone;
            if (userForm.password) updates.password = userForm.password;

            const { error: updateError } = await supabase.from('team_members').update(updates).eq('id', uid);
            if (updateError) throw updateError;

            // Sync with LocalStorage and State
            if (userForm.name) {
                setAdminUser(userForm.name);
                setUsername(userForm.name);
                localStorage.setItem('admin_user', userForm.name);
            }
            if (userForm.photo) {
                setAdminPhoto(userForm.photo);
                localStorage.setItem('admin_photo', userForm.photo);
            }
            if (userForm.phone) {
                localStorage.setItem('admin_phone', userForm.phone);
            }

            if (userForm.password && userForm.phone) {
                await sendSMS(userForm.phone, `Zyph Security: Sua senha de Admin foi alterada com sucesso.`);
            }

            setShowUserModal(false);
            alert('Perfil atualizado com sucesso!');
        } catch (err: any) {
            console.error("Update Error", err);
            alert('Erro: ' + (err.message || 'Falha ao atualizar perfil.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Persistence Init ---
    useEffect(() => {
        let ordersChannel: any;
        let productsChannel: any;

        if (localStorage.getItem('admin_auth') === 'true') {
            setIsAuthenticated(true);
            setCurrentUserRole(localStorage.getItem('admin_role') || 'staff');
            const storedId = localStorage.getItem('admin_id');
            setUserId(storedId && storedId !== 'undefined' && storedId !== 'null' ? storedId : '');
            setAdminUser(localStorage.getItem('admin_user') || '');
            refreshAllData();

            // Setup Real-time Listeners
            (async () => {
                // Orders Listener
                ordersChannel = supabase
                    .channel('orders-changes')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'orders' },
                        (payload: any) => {
                            console.log('Order Updated!', payload);
                            refreshAllData();
                            if (payload.eventType === 'INSERT') {
                                alert(`NOVO PEDIDO RECEBIDO! #${payload.new.short_id}`);
                            }
                            if (payload.eventType === 'UPDATE' && payload.old.payment_status !== 'paid' && payload.new.payment_status === 'paid') {
                                import('../services/sms').then(({ notifyPaymentConfirmed }) => {
                                    notifyPaymentConfirmed(payload.new.orderId || payload.new.id, payload.new.customer_phone, payload.new.short_id);
                                });
                            }
                        }
                    )
                    .subscribe();

                // Products Listener
                productsChannel = supabase
                    .channel('products-changes')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'products' },
                        () => {
                            console.log('Products changed, reloading...');
                            refreshAllData();
                        }
                    )
                    .subscribe();
            })();

            // Redirect Driver
            if (localStorage.getItem('admin_role') === 'driver') {
                setActiveView('logistics');
            }
        }

        return () => {
            if (ordersChannel) ordersChannel.unsubscribe();
            if (productsChannel) productsChannel.unsubscribe();
        };
    }, [isAuthenticated]); // Re-run when authenticated status changes

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Messaging Folder Sync
    useEffect(() => {
        if (isAuthenticated && activeView === 'messages') {
            loadMessages();
        }
    }, [messageFolder, activeView]);

    useEffect(() => {
        if (isAuthenticated && (activeSettingsTab === 'team' || activeSettingsTab === 'performance')) {
            loadTeam();
        }
        if (isAuthenticated && activeSettingsTab === 'profile') {
            const storedUser = localStorage.getItem('admin_user');
            const initialName = (username && username !== 'undefined') ? username :
                (storedUser && storedUser !== 'undefined') ? storedUser : '';

            setUserForm({
                name: initialName,
                phone: localStorage.getItem('admin_phone') || '',
                password: '',
                confirmPassword: '',
                photo: localStorage.getItem('admin_photo') || ''
            });
        }
    }, [activeSettingsTab, isAuthenticated]);

    // Quote
    useEffect(() => {
        const quotes = [
            "A qualidade é a nossa melhor receita.",
            "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
            "Um cliente satisfeito é a melhor estratégia de negócios.",
            "Grandes conquistas começam com bons pães!",
            "A padaria é o coração da comunidade.",
            "Liderança é servir.",
            "Foco no cliente, paixão pelo produto."
        ];
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    // --- Actions ---

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Local fallback credentials (mirrors team_members table in Supabase)
        // Used when network blocks Supabase access
        const localCredentials = [
            { id: '9f4b4a2d-2303-44db-9695-3cd8c5e4be00', username: 'nazir', name: 'Nazir', role: 'admin', password: 'admin123' },
        ];

        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .ilike('username', username)
                .eq('password', password)
                .single();

            if (data) {
                setIsAuthenticated(true);
                setCurrentUserRole(data.role);
                setUserId(data.id);
                setUsername(data.name);
                setAdminUser(data.name);
                setAdminPhoto(data.avatar_url || '');

                localStorage.setItem('admin_auth', 'true');
                localStorage.setItem('admin_role', data.role);
                localStorage.setItem('admin_id', data.id);
                localStorage.setItem('admin_user', data.name);
                if (data.avatar_url) localStorage.setItem('admin_photo', data.avatar_url);

                await logAudit({
                    action: 'ADMIN_LOGIN',
                    entity_type: 'auth',
                    entity_id: data.id,
                    details: { method: 'password', admin_name: data.name }
                });
                refreshAllData();
            } else {
                // Try local fallback if Supabase returned no match
                const localMatch = localCredentials.find(
                    c => c.username === username.toLowerCase() && c.password === password
                );
                if (localMatch) {
                    setIsAuthenticated(true);
                    setCurrentUserRole(localMatch.role);
                    setUserId(localMatch.id);
                    setUsername(localMatch.name);
                    setAdminUser(localMatch.name);
                    setAdminPhoto('');
                    localStorage.setItem('admin_auth', 'true');
                    localStorage.setItem('admin_role', localMatch.role);
                    localStorage.setItem('admin_id', localMatch.id);
                    localStorage.setItem('admin_user', localMatch.name);
                    localStorage.setItem('admin_photo', '');
                    await logAudit({
                        action: 'ADMIN_LOGIN',
                        entity_type: 'auth',
                        entity_id: localMatch.id,
                        details: { method: 'fallback_password', admin_name: localMatch.name }
                    });
                    refreshAllData();
                } else {
                    setError('Credenciais incorretas');
                    await logAudit({
                        action: 'ADMIN_LOGIN_FAILED',
                        entity_type: 'auth',
                        details: { method: 'password', username, reason: 'Invalid credentials' }
                    });
                }
            }
        } catch (err: any) {
            console.error(err);
            // Network error - try local fallback
            const localMatch = localCredentials.find(
                c => c.username === username.toLowerCase() && c.password === password
            );
            if (localMatch) {
                setIsAuthenticated(true);
                setCurrentUserRole(localMatch.role);
                setUserId(localMatch.id);
                setUsername(localMatch.name);
                localStorage.setItem('admin_auth', 'true');
                localStorage.setItem('admin_role', localMatch.role);
                localStorage.setItem('admin_id', localMatch.id);
                localStorage.setItem('admin_user', localMatch.name);
                refreshAllData();
            } else {
                setError('Erro ao conectar. Verifique as credenciais.');
                await logAudit({
                    action: 'ADMIN_LOGIN_FAILED',
                    entity_type: 'auth',
                    details: { method: 'password', username, reason: 'Network/Supabase error: ' + (err?.message || 'Unknown') }
                });
            }
        }
    };

    const handleLogout = async () => {
        const id = localStorage.getItem('admin_id');
        const name = localStorage.getItem('admin_user');
        
        await logAudit({
            action: 'ADMIN_LOGOUT',
            entity_type: 'auth',
            entity_id: id || userId,
            details: { admin_name: name || username }
        });

        setIsAuthenticated(false);
        localStorage.removeItem('admin_auth');
        localStorage.removeItem('admin_role');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_id');
        setUserId('');
        setUsername('');
    };

    // Orders (Supabase)
    const loadOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    items:order_items(*),
                    customers ( internal_id )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mapped: Order[] = data.map((o: any) => ({
                    id: o.id || '',
                    customer_id: o.customer_id || '',
                    orderId: o.short_id || 'N/A',
                    paymentRef: o.payment_ref || '',
                    transaction_id: o.transaction_id || '',
                    date: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
                    status: o.status || 'pending',
                    staff_id: o.staff_id || '',
                    driver_id: o.driver_id || '',
                    otp: o.otp || '',
                    total: Number(o.total_amount || 0),
                    amountPaid: Number(o.amount_paid || 0),
                    amount_received: Number(o.amount_received || o.amount_paid || 0),
                    balance: Number(o.balance || 0),
                    payment_method: o.payment_method || 'cash',
                    customer: {
                        name: o.customer_name || 'Consumidor Final',
                        phone: o.customer_phone || '',
                        type: o.delivery_type || 'takeaway',
                        address: o.delivery_address || '',
                        tableZone: o.table_zone || '',
                        tablePeople: Number(o.table_people || 0),
                        notes: o.notes || '',
                        internal_id: o.customers?.internal_id || ''
                    },
                    items: (o.items || []).map((i: any) => ({
                        name: i.product_name || 'Produto s/ nome',
                        price: Number(i.price || 0),
                        quantity: Number(i.quantity || 0)
                    }))
                }));
                // setOrders is now managed by useRealtimeOrders hook
                refreshOrders(); 
            }
        } catch (e) {
            console.error("Failed to load orders", e);
            throw e;
        }
    };

    // Products (Supabase)
    const loadProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (!error && data) {
            const mapped = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                category: p.category,
                inStock: p.is_available,
                stockQuantity: Number(p.stock_quantity) || 0, // Fixed: UI uses stockQuantity
                taxType: p.tax_type || 'incluso',
                prepTime: p.prep_time,
                deliveryTime: p.delivery_time,
                image: p.image,
                description: p.description,
                show_in_menu: p.show_in_menu !== false, // default true if null
                availability: p.is_available ? 'available' : 'unavailable',
                variations: p.variations || [],
                complements: p.complements || [],
                unit: p.unit || 'un',
                name_en: p.name_en,
                description_en: p.description_en,
                purchasePrice: Number(p.purchase_price) || 0,
                otherCost: Number(p.other_cost) || 0,
                marginPercentage: Number(p.margin_percentage) || 0
            }));
            setProducts(mapped);
        } else if (error) {
            console.error("Failed to load products", error);
            throw error;
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setSelectedImageFile(file);
        // Instant local preview
        setPreviewImage(URL.createObjectURL(file));
    };

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const form = e.target as any;
        const passwordValue = form.password.value;
        
        const memberData: any = {
            name: form.name.value,
            username: form.username.value,
            email: form.email.value,
            role: form.role.value,
            avatar_url: memberAvatar || currentMember?.avatar_url || null
        };

        if (passwordValue) {
            memberData.password = passwordValue;
        } else if (!currentMember) {
            alert('Erro: Palavra-passe é obrigatória para novos membros.');
            setIsSubmitting(false);
            return;
        }

        try {
            if (currentMember) {
                // Update
                const { error } = await supabase.from('team_members').update(memberData).eq('id', currentMember.id);
                if (error) throw error;
                await logAudit({ action: 'UPDATE_TEAM_MEMBER', entity_type: 'team_member', entity_id: currentMember.id, details: { name: memberData.name } });
                alert('Membro atualizado com sucesso!');
            } else {
                // Insert
                memberData.created_at = new Date().toISOString();
                const { data, error } = await supabase.from('team_members').insert([memberData]).select().single();
                if (error) throw error;
                
                await logAudit({ action: 'CREATE_TEAM_MEMBER', entity_type: 'team_member', entity_id: data.id, details: { name: memberData.name } });

                // Send Welcome Email
                if (memberData.email) {
                    await sendTeamWelcomeEmail(
                        memberData.email, 
                        memberData.name, 
                        memberData.username, 
                        passwordValue || 'Contacte o Administrador'
                    );
                }
                
                alert('Novo membro criado com sucesso!');
            }

            setIsEditingMember(false);
            setCurrentMember(null);
            setMemberAvatar(null);
            loadTeam();
        } catch (error: any) {
            console.error('Error saving team member:', error);
            alert('Erro ao salvar membro da equipe: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as any;
        const productData: any = {
            name: form.name.value,
            category: form.category.value,
            price: Number(form.price.value),
            tax_type: form.taxType.value,
            stock_quantity: Number(form.stockQuantity.value) || 0,
            is_available: form.inStock.checked,
            prep_time: form.prepTime.value,
            delivery_time: form.deliveryTime.value,
            unit: form.unit.value,
            name_en: form.name_en?.value || null,
            description_en: form.description_en?.value || null
        };

        // Deferred Image Upload
        if (selectedImageFile) {
            try {
                const fileExt = selectedImageFile.name.split('.').pop();
                const fileName = `product_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('products').upload(fileName, selectedImageFile);
                if (uploadError) throw uploadError;
                
                // Use safe public URL helper
                productData.image = getPublicUrlSafely('products', fileName);

                // Auto-sync with Drive module (Fotos de Produtos)
                try {
                    const { data: folderInfo } = await supabase.from('drive_folders').select('id').eq('name', 'Fotos de Produtos').maybeSingle();
                    await supabase.from('drive_files').insert({
                        name: selectedImageFile.name,
                        path: fileName,
                        size: selectedImageFile.size,
                        type: selectedImageFile.type || 'image/jpeg',
                        folder_id: folderInfo?.id || null,
                        uploaded_by: 'admin'
                    });
                } catch (driveErr) {
                    console.error("Non-critical drive sync error:", driveErr);
                }
            } catch (err: any) {
                alert('Erro ao carregar imagem: ' + err.message);
                setIsSubmitting(false);
                return;
            }
        } else if (previewImage) {
            // Keep existing image if no new file selected
            productData.image = previewImage;
        }

        try {
            let productId = currentProduct?.id;

            if (currentProduct?.id) {
                // UPDATE existing product
                const { error } = await supabase.from('products').update(productData).eq('id', currentProduct.id);
                if (error) throw error;
                await logAudit({ action: 'UPDATE_PRODUCT', entity_type: 'product', entity_id: currentProduct.id, details: { name: productData.name } });
            } else {
                // INSERT new product
                const { data, error } = await supabase.from('products').insert(productData).select().single();
                if (error) throw error;
                if (data) {
                    productId = data.id;
                    await logAudit({ action: 'CREATE_PRODUCT', entity_type: 'product', entity_id: productId, details: { name: productData.name } });
                }
            }

            // Handle Variations
            if (productId) {
                // Delete existing (simple way to sync)
                await supabase.from('product_variations').delete().eq('product_id', productId);

                // Insert current
                if (productVariations.length > 0) {
                    const varsToInsert = productVariations.map(v => ({
                        product_id: productId,
                        name: v.name,
                        price_adjustment: Number(v.price) // Fixed column name mismatch
                    }));
                    await supabase.from('product_variations').insert(varsToInsert);
                }
            }

            loadProducts();
            setIsEditingProduct(false);
            setCurrentProduct(null);
            setProductVariations([]);
        } catch (e: any) {
            console.error("Save Error:", e);
            alert("Erro ao salvar produto: " + (e.message || JSON.stringify(e)));
        }
    };

    const handleDeleteProduct = async (id: any) => {
        if (confirm('Tem certeza?')) {
            try {
                // First, delete any product_variations that reference this product to avoid foreign key constraint errors
                await supabase.from('product_variations').delete().eq('product_id', id);
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (error) throw error;
                await logAudit({ action: 'DELETE_PRODUCT', entity_type: 'product', entity_id: id });
                loadProducts();
            } catch (e: any) {
                console.error("Delete Error:", e);
                alert("Erro ao excluir produto: " + (e.message || JSON.stringify(e)));
            }
        }
    };

    // Team (Supabase)
    const loadTeam = async () => {
        const { data, error } = await supabase.from('team_members').select('*').order('name');
        if (error) {
            console.error("Failed to load team members", error);
            throw error;
        }
        if (data) setTeamMembers(data);
    };

    const loadBranding = async () => {
        try {
            const { data, error } = await supabase.from('settings').select('*');
            if (error) throw error;
            if (data) {
                const settingsMap: any = {};
                data.forEach(s => settingsMap[s.key] = s.value);

                // Update email/message settings
                setEmailSettings(prev => ({
                    ...prev,
                    senderId: settingsMap['branding_name'] || prev.senderId,
                    icon: settingsMap['branding_logo'] || prev.icon,
                    address: settingsMap['branding_address'] || prev.address,
                    phone: settingsMap['branding_phone'] || prev.phone,
                    user: settingsMap['branding_email_user'] || prev.user
                }));

                // Update detailed company info
                setCompanyInfo(prev => ({
                    ...prev,
                    name: settingsMap['branding_name'] || settingsMap['company_name'] || prev.name,
                    legalName: settingsMap['company_legal_name'] || prev.legalName,
                    logo: settingsMap['branding_logo'] || prev.logo,
                    email: settingsMap['branding_email_user'] || settingsMap['company_email'] || prev.email,
                    phone: settingsMap['branding_phone'] || settingsMap['company_phone'] || prev.phone,
                    website: settingsMap['company_website'] || prev.website,
                    regNo: settingsMap['company_reg_no'] || prev.regNo,
                    nuit: settingsMap['company_nuit'] || prev.nuit,
                    industry: settingsMap['company_industry'] || prev.industry,
                    country: settingsMap['company_country'] || prev.country,
                    province: settingsMap['company_province'] || prev.province,
                    city: settingsMap['company_city'] || prev.city,
                    address: settingsMap['branding_address'] || settingsMap['company_address'] || prev.address,
                    postalCode: settingsMap['company_postal_code'] || prev.postalCode,
                    slogan: settingsMap['company_slogan'] || prev.slogan,
                    motto: settingsMap['company_motto'] || prev.motto,
                    currency: settingsMap['company_currency'] || prev.currency,
                    language: settingsMap['company_language'] || prev.language,
                    prefix: settingsMap['company_customer_prefix'] || prev.prefix,
                    staffPrefix: settingsMap['company_staff_prefix'] || prev.staffPrefix,
                    productPrefix: settingsMap['company_product_prefix'] || prev.productPrefix,
                    docPrefix: settingsMap['company_doc_prefix'] || prev.docPrefix
                }));

                // Fetch System Settings (Maintenance Mode)
                const { data: sysData, error: sysError } = await supabase.from('system_settings').select('key, value').in('key', ['whatsapp_menu_mode']);
                if (!sysError && sysData) {
                    const waMode = sysData.find(d => d.key === 'whatsapp_menu_mode');
                    setWhatsappMenuMode(waMode?.value?.active === true);
                }
            }
        } catch (e) {
            console.error("Failed to load branding", e);
        }
    };

    const loadPerformanceMetrics = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Load active sessions (check-out is null)
            const { data: sessions, error: sessionsError } = await supabase
                .from('employee_sessions')
                .select('*')
                .is('check_out', null);

            if (sessionsError) throw sessionsError;

            // 2. Load today's completed orders
            const { data: todayOrders, error: orderError } = await supabase
                .from('orders')
                .select('id, total_amount, status, staff_id')
                .in('status', ['completed', 'paid', 'kitchen', 'shipped'])
                .gte('created_at', today.toISOString());

            if (orderError) throw orderError;

            // 3. Fetch ALL sessions today to sum exact hours worked
            const { data: allTodaySessions } = await supabase
                .from('employee_sessions')
                .select('*')
                .gte('check_in', today.toISOString());
            
            let totalHoursCalculated = 0;
            if (allTodaySessions) {
                allTodaySessions.forEach(s => {
                    if (s.total_hours) {
                        totalHoursCalculated += parseFloat(s.total_hours.toString());
                    } else {
                        const start = new Date(s.check_in).getTime();
                        const stop = s.check_out ? new Date(s.check_out).getTime() : new Date().getTime();
                        totalHoursCalculated += (stop - start) / 3600000;
                    }
                });
            }

            const activeStaffCount = sessions?.length || 0;
            const ordersCount = todayOrders?.length || 0;
            
            // Calculate productivity score
            const score = totalHoursCalculated > 0 ? Math.min(Math.round((ordersCount / totalHoursCalculated) * 50), 100) : 0;

            setPerformanceMetrics({
                totalHours: parseFloat(totalHoursCalculated.toFixed(1)),
                activeStaff: activeStaffCount,
                ordersToday: ordersCount,
                productivityScore: score
            });

            // Map sessions to old state for backward compatibility if needed in UI
            setTeamCheckins(sessions || []);

            // 4. Check if current user is checked in
            if (userId) {
                const isUserIn = sessions?.some(s => s.employee_id === userId) || false;
                setIsUserCheckedIn(isUserIn);
            }

        } catch (e) {
            console.error("Failed to load performance metrics", e);
        }
    };

    const generateAiReportData = async () => {
        try {
            setIsGeneratingAI(true);
            setAiReportContent(null);
            
            const prompt = `Analisa os detalhes do nosso negócio e dá um insight conciso (2 parágrafos no máximo) focado em ações práticas para melhorarmos. Hoje tivemos: ${performanceMetrics.ordersToday} pedidos, produtividade de ${performanceMetrics.productivityScore}%. Equipa em serviço: ${performanceMetrics.activeStaff} pessoas trabalhando um total estimado de ${performanceMetrics.totalHours} horas. O funcionário destaque foi ${computedAiInsights?.topPerformer?.member?.name || 'nenhum destacado ainda'} com ${computedAiInsights?.topPerformer?.count || 0} pedidos. Pico detetado às ${computedAiInsights?.peakHour?.label || 'N/A'}. Mantém um tom muito profissional em português de Portugal.`;
            
            const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || "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";
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "openai/gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: "You are an expert business analytics AI for a bakery." },
                        { role: "user", content: prompt }
                    ]
                })
            });
            
            const data = await res.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                setAiReportContent(data.choices[0].message.content);
            } else {
                setAiReportContent("Não foi possível gerar as análises neste momento. Verifique a configuração da API.");
            }
        } catch (e) {
            console.error("Failed to generate AI insights", e);
            setAiReportContent("Erro de rede ao conectar à IA Analítica.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleUpdateMaintenanceMode = async (enabled: boolean) => {
        setIsUpdatingMaintenance(true);
        try {
            const { error } = await supabase
                .from('system_settings')
                .update({ value: { active: enabled }, updated_at: new Date().toISOString() })
                .eq('key', 'whatsapp_menu_mode');

            if (error) throw error;
            setWhatsappMenuMode(enabled);
            
            await logAudit({
                action: 'UPDATE_WHATSAPP_MAINTENANCE',
                entity_type: 'system',
                details: { enabled }
            });

            alert(`Modo Manutenção (WhatsApp) ${enabled ? 'ACTIVADO' : 'DESACTIVADO'} com sucesso!`);
        } catch (err: any) {
            console.error('Error updating maintenance mode:', err);
            alert('Falha ao atualizar modo de manutenção: ' + err.message);
        } finally {
            setIsUpdatingMaintenance(false);
        }
    };

    const handleCheckIn = async () => {
        if (!userId) return alert("Erro: Utilizador não identificado.");
        try {
            setIsSubmitting(true);
            const { error } = await supabase.from('employee_sessions').insert([{
                employee_id: userId,
                employee_name: username || 'Admin',
                check_in: new Date().toISOString(),
                status: 'active'
            }]);
            if (error) throw error;
            
            // Log to Notification Center
            await NotificationService.logSystemEvent(
                "Check-in Realizado", 
                `${username || 'Admin'} iniciou o turno com sucesso.`, 
                'USER', 
                'success', 
                userId
            );

            alert("Check-in realizado com sucesso! Bom trabalho.");
            loadPerformanceMetrics();
        } catch (e: any) {
            alert("Erro no check-in: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckOut = async () => {
        if (!userId) return alert("Erro: Utilizador não identificado.");
        try {
            setIsSubmitting(true);
            
            // 1. Get the current active session
            const { data: currentSession, error: fetchError } = await supabase
                .from('employee_sessions')
                .select('*')
                .eq('employee_id', userId)
                .is('check_out', null)
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (!currentSession) {
                alert("Nenhuma sessão activa encontrada.");
                setIsUserCheckedIn(false);
                return;
            }

            // 2. Calculate hours
            const start = new Date(currentSession.check_in).getTime();
            const end = new Date().getTime();
            const totalHours = (end - start) / 3600000;

            // 3. Update the session
            const { error: updateError } = await supabase
                .from('employee_sessions')
                .update({ 
                    check_out: new Date().toISOString(),
                    status: 'completed',
                    total_hours: totalHours.toFixed(2)
                })
                .eq('id', currentSession.id);

            if (updateError) throw updateError;
            
            // Log to Notification Center
            await NotificationService.logSystemEvent(
                "Check-out Realizado", 
                `${username || 'Admin'} terminou o turno com sucesso.`, 
                'USER', 
                'info', 
                userId
            );

            alert("Check-out realizado. Até à próxima!");
            loadPerformanceMetrics();
        } catch (e: any) {
            alert("Erro no check-out: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };



    const handleDeleteMember = async (id: string) => {
        if (confirm('Remover membro?')) {
            await supabase.from('team_members').delete().eq('id', id);
            loadTeam();
        }
    };

    // Customers (Supabase)
    const loadCustomers = async () => {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Failed to load customers", error);
            throw error;
        }
        if (data) setCustomers(data);
    };

    const handleSupportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let imageUrl = '';
        if (supportForm.image) {
            const file = supportForm.image;
            const filePath = `tickets/${Date.now()}_${file.name}`;
            await supabase.storage.from('support-tickets').upload(filePath, file);
            imageUrl = getPublicUrlSafely('support-tickets', filePath);
        }

        const body = `*Novo Ticket de Suporte*\n\n*Assunto:* ${supportForm.subject}\n*Mensagem:* ${supportForm.message}\n\n*Imagem:* ${imageUrl || 'N/A'}\n\n*Enviado por:* ${localStorage.getItem('admin_user')}`;

        // WhatsApp API (Zyph Tech)
        window.open(`https://wa.me/258863242532?text=${encodeURIComponent(body)}`, '_blank');

        // Email
        window.location.href = `mailto:supporte@zyph.co.in?subject=Support Ticket: ${supportForm.subject}&body=${encodeURIComponent(body)}`;

        setIsSupportTicketOpen(false);
        setSupportForm({ subject: '', message: '', image: null });
        alert("Ticket criado! A verificar envio via WhatsApp e Email...");
    };

    // --- Consolidated Data Loading ---
    const refreshAllData = async () => {
        setDbStatus({ status: 'loading' });
        try {
            console.log("Refreshing all admin data...");
            // Load base data for all roles
            await Promise.all([
                loadOrders().then(() => console.log("Orders loaded")),
                loadProducts().then(() => console.log("Products loaded")),
                loadMessages().then(() => console.log("Messages loaded")),
                loadDrivers().then(() => console.log("Drivers loaded"))
            ]);

            const rawRole = localStorage.getItem('admin_role') || (currentUserRole || 'staff');
            const role = (rawRole || '').toLowerCase();
            console.log(`Checking extended data for role: ${role}`);

            if (role === 'admin' || role === 'it') {
                await Promise.all([
                    loadTeam().then(() => console.log("Team loaded")),
                    loadCustomers().then(() => console.log("Customers loaded")),
                    loadBranding().then(() => console.log("Branding loaded")),
                    loadPerformanceMetrics().then(() => console.log("Performance metrics loaded"))
                ]);
            }
            setDbStatus({ status: 'online' });
            console.log("Refresh completed successfully");
        } catch (e: any) {
            console.error("Diagnostic: Refresh failed", e);
            let errorMsg = e.message || String(e);

            // Helpful detection for ISP/Network blocks (Supabase returning HTML)
            if (errorMsg.includes('Unexpected token <') || errorMsg.includes('DOCTYPE') || errorMsg.includes('Website Blocked')) {
                errorMsg = "CONEXÃO BLOQUEADA (ISP/VPN necessária). O Supabase está inacessível na sua rede.";
            } else if (errorMsg.includes('Failed to fetch')) {
                errorMsg = "Sem Internet ou Erro de DNS no Backend.";
            }

            setDbStatus({ status: 'error', message: errorMsg });
        }
    };

    const handleToggleConnectionMode = () => {
        const newMode: ConnectionMode = connectionMode === 'proxy' ? 'direct' : 'proxy';
        setConnectionMode(newMode);
        setConnectionModeState(newMode);
        refreshSupabaseClient();
        setTimeout(() => refreshAllData(), 500);
    };

    const handleTestDirectConnection = async () => {
        setDbStatus({ status: 'loading', message: "A testar ligação direta..." });
        try {
            const directUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bbvowyztvzselxphbqmt.supabase.co';
            const res = await fetch(`${directUrl}/rest/v1/`, {
                headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
            });
            const text = await res.text();
            if (text.includes('Website Blocked') || text.includes('DOCTYPE')) {
                alert("LIGAÇÃO DIRETA BLOQUEADA: O seu ISP ainda está a bloquear o Supabase. Use a VPN e mude o modo para Direto se a VPN estiver ativa.");
            } else {
                alert("LIGAÇÃO DIRETA OK: O Supabase está acessível (VPN provavelmente ativa). Pode mudar para o modo Direto.");
            }
        } catch (e) {
            alert("Erro ao testar ligação direta. Verifique a consola.");
        }
        refreshAllData();
    };

    // Stats & Export
    const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    // Stock Stats
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stockQuantity < 10 && p.stockQuantity > 0).length;
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length;

    // Recent Orders (Assuming newer at end, reverse to verify recent)
    const recentOrders = [...orders].reverse().slice(0, 5);

    // Graph Data
    const getLast7DaysSales = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const today = new Date();
        const sales = Array(7).fill(0);
        // This simulates distribution based on today since real dates vary
        // In prod, match date string. For now, mock distribution for visuals.
        return days.map((day, i) => ({
            day,
            value: i === today.getDay() ? totalSales * 0.4 : totalSales * Math.random() * 0.2
        }));
    };
    const salesData = getLast7DaysSales();

    const getHourlyProductionData = () => {
        const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
        const now = new Date();
        const rangeStart = new Date();
        if (analyticsFilter === 'today') {
            rangeStart.setHours(0, 0, 0, 0);
        } else if (analyticsFilter === 'week') {
            rangeStart.setDate(now.getDate() - 7);
            rangeStart.setHours(0, 0, 0, 0);
        } else {
            rangeStart.setDate(now.getDate() - 30);
            rangeStart.setHours(0, 0, 0, 0);
        }
        const filteredForChart = orders.filter(o => {
            const orderDate = new Date(o.date);
            return orderDate >= rangeStart && (o.status === 'completed' || o.status === 'paid');
        });

        const production = hours.map(h => {
            const hourInt = parseInt(h);
            const count = filteredForChart.filter(o => {
                const date = new Date(o.date);
                return date.getHours() >= hourInt && date.getHours() < hourInt + 2;
            }).length;
            return { label: h, value: count };
        });
        return production;
    };
    const hourlyData = getHourlyProductionData();
    const maxProduction = Math.max(...hourlyData.map(d => d.value), 1);

    // AI Insights: computed from real data
    const computedAiInsights = (() => {
        try {
            if (!teamMembers || !teamMembers.length || !orders || !orders.length) return null;

            const memberStats = teamMembers.map((m: any) => {
                const memberOrders = orders.filter(o => o && o.staff_id === m.id && o.status === 'completed');
                return { 
                    member: m, 
                    count: memberOrders.length, 
                    revenue: memberOrders.reduce((s, o) => s + (Number(o.total) || 0), 0) 
                };
            }).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

            const totalCount = memberStats.reduce((s, m) => s + m.count, 0);
            const avg = memberStats.length > 0 ? totalCount / memberStats.length : 0;
            const topPerformer = memberStats[0];
            const pctAbove = avg > 0 && topPerformer ? Math.round(((topPerformer.count - avg) / avg) * 100) : 0;

            const hourlyData = getHourlyProductionData() || [];
            const peakHour = hourlyData.reduce((max, d) => (d.value || 0) > (max.value || 0) ? d : max, hourlyData[0] || { label: 'N/A', value: 0 });
            
            // Safe sort and access instead of .at(-1)
            const sortedHourly = [...hourlyData].sort((a, b) => (b.value || 0) - (a.value || 0));
            const dropHour = sortedHourly.length > 0 ? sortedHourly[sortedHourly.length - 1] : { label: 'N/A', value: 0 };

            return { topPerformer, pctAbove, peakHour, dropHour, memberStats };
        } catch (err) {
            console.error("Error computing AI insights:", err);
            return null;
        }
    })();

    const handleGenerateAIReport = () => {
        const today = new Date().toLocaleDateString('pt-PT');
        const topM = computedAiInsights?.topPerformer;
        const content = [
            `RELATÓRIO DE PERFORMANCE IA – ${companyInfo.name}`,
            `Data: ${today}`,
            '─────────────────────────────────────────',
            '',
            '📊 RESUMO DE EQUIPA',
            `  Total de funcionários analisados: ${teamMembers.length}`,
            `  Total de pedidos concluídos: ${orders.filter(o => o.status === 'completed').length}`,
            `  Receita Total: ${orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0).toLocaleString()} ${companyInfo.currency}`,
            '',
            '🏆 MELHOR DESEMPENHO',
            topM ? `  ${topM.member.name} (${topM.member.role}) – ${topM.count} pedidos – ${topM.revenue.toLocaleString()} ${companyInfo.currency}` : '  Sem dados suficientes.',
            '',
            '⚡ PICO DE PRODUÇÃO',
            `  Maior volume registado: ${computedAiInsights?.peakHour?.label || 'N/A'} com ${computedAiInsights?.peakHour?.value || 0} pedidos`,
            '',
            '📋 RANKING COMPLETO',
            ...(computedAiInsights?.memberStats || []).map((s, i) => `  ${i + 1}. ${s.member.name} – ${s.count} pedidos – ${s.revenue.toLocaleString()} ${companyInfo.currency}`),
            '',
            '─────────────────────────────────────────',
            `Gerado automaticamente por ${companyInfo.name} Admin Panel`,
        ].join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-performance-${today.replace(/\//g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Derived Data
    const filteredOrders = orders.filter(o => {
        // Status Filter
        const matchesStatus =
            statusFilter === 'all' ? true :
                statusFilter === 'active' ? (o.status !== 'completed' && o.status !== 'cancelled') :
                    o.status === statusFilter;

        if (!matchesStatus) return false;

        // Search Query filter
        if (!orderSearchQuery) return true;

        const query = orderSearchQuery.toLowerCase();
        return (
            (o.orderId?.toLowerCase() || '').includes(query) ||
            (o.customer?.name?.toLowerCase() || '').includes(query) ||
            (o.total?.toString() || '').includes(query) ||
            (o.status?.toLowerCase() || '').includes(query)
        );
    });

    const handleMassPosAdd = () => {
        const lines = massInput.split('\n').filter(l => l.trim());
        const itemsToAdd: any[] = [];
        lines.forEach(line => {
            const match = line.match(/(.+?)(?:\s*[xX]\s*|\s+)(\d+)$/);
            if (match) {
                const name = match[1].trim();
                const qty = parseInt(match[2]);
                const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
                if (prod) {
                    itemsToAdd.push({ ...prod, quantity: qty });
                }
            } else {
                const name = line.trim();
                const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
                if (prod) {
                    itemsToAdd.push({ ...prod, quantity: 1 });
                }
            }
        });

        if (itemsToAdd.length > 0) {
            setPosCart(prev => {
                const newCart = [...prev];
                itemsToAdd.forEach(item => {
                    const existing = newCart.find(c => c.id === item.id);
                    if (existing) {
                        existing.quantity += item.quantity;
                    } else {
                        newCart.push({ ...item });
                    }
                });
                return newCart;
            });
            setShowMassPosModal(false);
            setMassInput('');
        } else {
            alert('Nenhum produto correspondente encontrado. Verifique os nomes.');
        }
    };

    const handleMassStockAdd = async () => {
        const lines = massInput.split('\n').filter(l => l.trim());
        const newProds = [];
        for (const line of lines) {
            const parts = line.split(',').map(s => s.trim());
            if (parts.length >= 3) {
                const [name, category, price, stock] = parts;
                newProds.push({
                    name,
                    category,
                    price: Number(price),
                    stockQuantity: Number(stock) || 0,
                    unit: 'un',
                    inStock: (Number(stock) || 0) > 0,
                    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'
                });
            }
        }

        if (newProds.length > 0) {
            try {
                const { error } = await supabase.from('products').insert(newProds);
                if (error) throw error;
                alert(`${newProds.length} produtos adicionados com sucesso!`);
                setMassInput('');
                setShowMassStockModal(false);
                loadProducts();
            } catch (e: any) {
                alert('Erro ao guardar produtos: ' + e.message);
            }
        } else {
            alert('Formato inválido. Use: Nome, Categoria, Preço, [Stock]');
        }
    };

    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
            (p.id && p.id.toString().toLowerCase().includes(stockSearchTerm.toLowerCase()));
        const matchCategory = stockCategoryFilter === 'all' || (p.category && p.category.toLowerCase() === stockCategoryFilter.toLowerCase());
        const matchAvailability = stockAvailabilityFilter === 'all' || 
            (stockAvailabilityFilter === 'available' && p.inStock) || 
            (stockAvailabilityFilter === 'unavailable' && !p.inStock);
        return matchSearch && matchCategory && matchAvailability;
    });

    const handleSaveMassStock = async () => {
        const productIds = Object.keys(editedMassStock);
        if (productIds.length === 0 && selectedMassStockIds.length === 0) {
             alert('Nenhum produto selecionado ou alterado.');
             return;
        }

        setIsSavingMassStock(true);
        try {
            // If we have specific edits in editedMassStock, use those.
            // If we want to apply a single value to all selectedMassStockIds, we need a separate UI flow or massInput parsing.
            // The user requested "colocar todos com a quantidade de stock 10".
            
            let updates: any[] = [];
            
            if (productIds.length > 0) {
                updates = productIds.map(id => {
                    const changes = editedMassStock[id];
                    return supabase.from('products').update({
                        stock_quantity: changes.stockQuantity,
                        unit: changes.unit,
                        is_available: changes.inStock,
                        show_in_menu: changes.showInMenu,
                        sku: changes.sku
                    }).eq('id', id);
                });
            } else if (selectedMassStockIds.length > 0) {
                // If user just selected items and clicked save without individual edits, 
                // we might need a prompt or the "massInput" logic.
                // For now, let's allow the individual edits or the "Set All to X" logic if implemented in the UI.
                alert('Por favor, faça as alterações nos produtos selecionados antes de salvar.');
                setIsSavingMassStock(false);
                return;
            }

            await Promise.all(updates);
            
            alert(`${updates.length} produtos atualizados com sucesso!`);
            setEditedMassStock({});
            setSelectedMassStockIds([]);
            loadProducts();
            setStockTab('overview');
        } catch (e: any) {
            alert('Erro ao guardar as edições em massa: ' + e.message);
        } finally {
            setIsSavingMassStock(false);
        }
    };

    const handleSaveMassPricing = async () => {
        const productIds = Object.keys(editedMassPricing);
        if (productIds.length === 0) return;

        setIsSavingMassPricing(true);
        try {
            const updates = productIds.map(id => {
                const changes = editedMassPricing[id];
                return supabase.from('products').update({
                    purchase_price: changes.purchasePrice,
                    other_cost: changes.otherCost,
                    margin_percentage: changes.marginPercentage,
                    price: changes.finalPrice
                }).eq('id', id);
            });
            await Promise.all(updates);
            
            alert(`${productIds.length} preços atualizados com sucesso!`);
            setEditedMassPricing({});
            loadProducts();
            setStockTab('overview');
        } catch (e: any) {
            alert('Erro ao guardar as edições de preços: ' + e.message);
        } finally {
            setIsSavingMassPricing(false);
        }
    };

    const uniqueCategories = Array.from(new Set(products.map(p => p.category?.toLowerCase() || ''))).filter(Boolean);

    const downloadOrdersCSV = () => {
        const headers = ["ID", "Ref", "Cliente", "Tel", "Data", "Total", "Status", "Items"];
        const rows = orders.map(o => [
            o.orderId, o.paymentRef, o.customer.name, o.customer.phone, o.date, o.total, o.status,
            o.items.map(i => `${i.quantity}x ${i.name}`).join('|')
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `pedidos_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadStockCSV = () => {
        const headers = ["ID", "Produto", "Categoria", "Preço", "Stock", "Unidade", "Status"];
        const rows = products.map((p, index) => [
            `${companyInfo.productPrefix || 'PROD'}-${index + 10}`,
            p.name,
            p.category,
            p.price,
            p.stockQuantity,
            p.unit,
            p.inStock ? 'Disponível' : 'Indisponível'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `stock_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadCustomersCSV = () => {
        const headers = ["ID", "Nome", "Telefone", "Email", "NUIT", "Data Nasc.", "Status"];
        const rows = customers.map(c => [
            c.id, c.name, c.contact_no, c.email || 'N/A', c.nuit || 'N/A', c.date_of_birth || 'N/A',
            c.is_blocked ? 'Bloqueado' : 'Ativo'
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `clientes_paocaseiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Render ---

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center p-6 bg-pattern">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-[#d9a65a]/20">
                    <div className="text-center mb-8">
                        <img src="/logo_on_light.png" alt="Pão Caseiro Logo" className="h-24 mx-auto mb-4 object-contain" />
                        <h1 className="text-2xl font-serif font-bold text-[#3b2f2f]">Admin Pão Caseiro</h1>
                        <p className="text-gray-400 text-sm mt-2">Acesso Restrito</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" title="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] outline-none transition-all" placeholder="Username" autoFocus />
                        <input type="password" title="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] outline-none transition-all" placeholder="Senha" />
                        {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded">{error}</p>}
                        <button type="submit" className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold uppercase tracking-wide hover:shadow-lg hover:scale-[1.02] transition-all">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] overflow-hidden bg-[#f7f1eb] flex flex-col md:flex-row font-sans">
            {/* Mobile Header */}
            <div className="md:hidden bg-[#3b2f2f] text-[#d9a65a] p-4 flex justify-between items-center z-30 shadow-md w-full shrink-0 h-16">
                <div className="flex items-center gap-3">
                    <img src="/logo_on_dark.png" alt="Logo" className="h-8 object-contain" />
                    <span className="font-serif font-bold text-lg text-white">Admin Pão Caseiro</span>
                </div>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1">
                    <Menu size={28} />
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {!isSidebarCollapsed && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" 
                    onClick={() => setIsSidebarCollapsed(true)}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`fixed md:relative top-0 left-0 h-full z-50 bg-[#3b2f2f] text-white transition-transform duration-300 md:transition-all ease-in-out flex flex-col shrink-0 shadow-2xl ${isSidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-20 md:p-4 md:items-center' : 'translate-x-0 w-72 p-6'}`}>
                {/* Scrollable Navigation Area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-1">
                    <div className={`flex items-center gap-3 mb-10 ${isSidebarCollapsed ? 'md:justify-center' : ''} relative hidden md:flex`}>
                        <img src="/logo_on_dark.png" alt="Pão Caseiro Logo" className={`${isSidebarCollapsed ? 'h-10 w-10' : 'h-16 w-16'} object-contain`} />
                        {!isSidebarCollapsed && (
                            <div className="animate-fade-in">
                                <span className="font-serif font-bold text-xl block leading-none">Admin</span>
                                <span className="text-[10px] text-[#d9a65a]/80 uppercase tracking-widest">Painel</span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`absolute -right-10 top-2 bg-white text-[#3b2f2f] p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform hidden md:flex items-center justify-center border border-gray-200 z-50`}
                        >
                            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                    </div>

                    {/* Mobile Close Button Inside Sidebar */}
                    <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                        <span className="font-serif font-bold text-xl">Menu</span>
                        <button onClick={() => setIsSidebarCollapsed(true)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <nav className="space-y-2">
                        {currentUserRole !== 'driver' && (
                            <>
                                <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'dashboard' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Painel Principal">
                                    <LayoutDashboard size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Painel Principal</span>
                                </button>

                                <button onClick={() => handleNavClick('notificacoes')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'notificacoes' ? 'bg-rose-500 text-white shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Notificações">
                                    <Bell size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Notificações</span>
                                </button>
                                
                                <button onClick={() => handleNavClick('orders')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'orders' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Encomendas">
                                    <ShoppingBag size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Encomendas</span>
                                </button>

                                <button onClick={() => handleNavClick('stock')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'stock' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Stock">
                                    <Package size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Stock</span>
                                </button>

                                <button onClick={() => handleNavClick('pos')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'pos' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="POS / Balcão">
                                    <Smartphone size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>POS / Balcão</span>
                                </button>

                                <button onClick={() => handleNavClick('billing')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'billing' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Faturação">
                                    <Banknote size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Faturação</span>
                                </button>

                                <button onClick={() => handleNavClick('documents')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'documents' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Documentos">
                                    <FileText size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Documentos</span>
                                </button>
                            </>
                        )}

                        {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                            <>
                                <button onClick={() => handleNavClick('customers')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'customers' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Clientes">
                                    <Users size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Clientes</span>
                                </button>

                                <div className={`pt-4 pb-2 border-t border-white/5 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                                    <p className="text-[10px] font-black text-[#d9a65a] uppercase tracking-[0.2em] px-3 mb-2 opacity-50">Sistemas de Filas</p>
                                </div>

                                <button onClick={() => handleNavClick('queue')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'queue' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Gestão de Filas">
                                    <Clock size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Gestão de Filas</span>
                                </button>

                                <div className={`grid ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                    <button onClick={() => window.open('/get-ticket', '_blank')} className={`flex items-center gap-2 p-2.5 rounded-xl font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5 ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Kiosk (Senhas)">
                                        <ExternalLink size={18} className="shrink-0" /> 
                                        <span className={`text-xs ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Kiosk</span>
                                    </button>

                                    <button onClick={() => window.open('/tv-senhas', '_blank')} className={`flex items-center gap-2 p-2.5 rounded-xl font-bold transition-all text-gray-400 hover:text-white hover:bg-white/5 ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="TV Display">
                                        <Tv size={18} className="shrink-0" /> 
                                        <span className={`text-xs ${isSidebarCollapsed ? 'md:hidden' : ''}`}>TV Display</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {currentUserRole !== 'driver' && (
                            <button onClick={() => handleNavClick('messages')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'messages' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Mensagens">
                                <Mail size={22} className="shrink-0" /> 
                                <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Mensagens {messages.some(m => m.status === 'unread') && <span className="w-2 h-2 bg-red-500 rounded-full inline-block ml-2"></span>}</span>
                            </button>
                        )}

                        <button onClick={() => handleNavClick('support_ai')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'support_ai' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Suporte IT">
                            <Sparkles size={22} className="shrink-0" /> 
                            <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Suporte IT</span>
                        </button>

                        <button onClick={() => handleNavClick('logistics')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'logistics' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Logística">
                            <Truck size={22} className="shrink-0" /> 
                            <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Logística</span>
                        </button>

                        <button onClick={() => handleNavClick('kitchen')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'kitchen' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Cozinha (KDS)">
                            <LayoutDashboard size={22} className="shrink-0" /> 
                            <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Cozinha (KDS)</span>
                        </button>

                        {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                            <>
                                <button onClick={() => handleNavClick('blog')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'blog' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Blog / CMS">
                                    <FileText size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Blog / CMS</span>
                                </button>
                                
                                <button onClick={() => handleNavClick('settings')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeView === 'settings' ? 'bg-[#d9a65a] text-[#3b2f2f] shadow-lg translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Definições">
                                    <Settings size={22} className="shrink-0" /> 
                                    <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Definições</span>
                                </button>
                            </>
                        )}
                    </nav>
                </div>

                {/* Sidebar Footer Section - Fixed at Bottom */}
                <div className="flex flex-col gap-4 mt-auto pt-6 border-t border-white/5 bg-[#2d2424]/50 rounded-t-3xl p-4 shrink-0">
                    <button 
                        onClick={isUserCheckedIn ? handleCheckOut : handleCheckIn} 
                        disabled={isSubmitting}
                        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 ${isSidebarCollapsed ? 'md:justify-center' : ''} ${isUserCheckedIn ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        title={isUserCheckedIn ? 'Terminar Turno (Saída)' : 'Iniciar Turno (Entrada)'}
                    >
                        <Clock size={22} className={`shrink-0 ${isUserCheckedIn ? 'animate-pulse' : ''}`} /> 
                        <div className={`flex flex-col text-left ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">Status Atual:</span>
                            <span className="text-[11px] font-black uppercase tracking-wider leading-none mt-1">{isUserCheckedIn ? 'EM SERVIÇO (Sair)' : 'FORA DE SERVIÇO (Entrar)'}</span>
                        </div>
                    </button>

                    <button onClick={handleLogout} className={`flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors w-full p-3 hover:bg-white/5 rounded-xl ${isSidebarCollapsed ? 'md:justify-center' : ''}`} title="Sair do Painel">
                        <LogOut size={22} className="shrink-0" /> 
                        <span className={`font-bold uppercase tracking-widest text-[12px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Sair do Painel</span>
                    </button>

                    {!isSidebarCollapsed && (
                        <div className="mt-4 pt-4 border-t border-gray-700/30 text-center flex flex-col items-center justify-center animate-fade-in">
                            <img src="/logo_on_dark.png" alt="Pão Caseiro Logo" className="w-20 h-auto opacity-70 hover:opacity-100 transition-opacity drop-shadow-lg" />
                            <p className="text-[9px] text-gray-500 mt-2 italic max-w-[150px] mx-auto leading-tight font-serif">"O sabor que aquece o coração"</p>
                        </div>
                    )}
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto relative flex flex-col ${activeView === 'logistics' ? 'bg-white' : 'p-6 md:p-10'} pt-20 md:pt-10 shadow-inner`}>
                {/* Global Header */}
                <div className="flex justify-between items-center mb-8 gap-4 hidden md:flex shrink-0">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-serif font-black text-[#3b2f2f] uppercase tracking-tighter">
                            {activeView === 'dashboard' ? 'Painel de Controlo' : 
                             activeView === 'orders' ? 'Gestão de Pedidos' :
                             activeView === 'stock' ? 'Inventário e Stock' :
                             activeView === 'customers' ? 'Base de Clientes' :
                             activeView === 'pos' ? 'Ponto de Venda' :
                             activeView === 'messages' ? 'Centro de Mensagens' :
                             activeView === 'support_ai' ? 'Zyph AI' :
                             activeView === 'logistics' ? 'Logística e Entregas' :
                             activeView === 'kitchen' ? 'Cozinha e KDS' :
                             activeView === 'blog' ? 'Blog e CMS' :
                             activeView === 'notificacoes' ? 'Centro de Notificações' :
                             activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                        </h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {new Date().toLocaleDateString('pt-MZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleSound} 
                            className={`p-3 rounded-2xl transition-all shadow-sm ${soundEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                            title={soundEnabled ? "Desativar Voz de Notificação" : "Ativar Voz de Notificação"}
                        >
                            {soundEnabled ? <Bell size={20} /> : <EyeOff size={20} />}
                        </button>
                        <div className="flex flex-col items-end">
                            <span className="font-black text-[#3b2f2f] text-sm uppercase">{username}</span>
                            <span className="text-[10px] text-[#d9a65a] font-bold uppercase tracking-tighter">{currentUserRole}</span>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="bg-red-50 text-red-600 p-3 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm group"
                            title="Sair"
                        >
                            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                </div>

                {activeView === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Compact Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                            <div
                                onClick={() => { setActiveView('orders'); setStatusFilter('pending'); }}
                                className="bg-white py-6 px-4 rounded-3xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={32} /></div>
                                <h3 className="text-3xl font-black text-[#d9a65a] mb-1 leading-none">{pendingOrders}</h3>
                                <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest leading-none mt-1">Pendentes</p>
                            </div>

                            <div
                                onClick={() => setActiveView('stock')}
                                className="bg-white py-6 px-4 rounded-3xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><Package size={32} /></div>
                                <h3 className="text-3xl font-black text-[#d9a65a] mb-1 leading-none">{totalProducts}</h3>
                                <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest leading-none mt-1">Produtos</p>
                                {lowStockProducts > 0 && <span className="absolute top-2 left-2 text-[8px] text-red-500 font-black bg-red-50 px-2 py-0.5 rounded-full">{lowStockProducts} Low</span>}
                            </div>

                            <div
                                onClick={() => setActiveView('logistics')}
                                className="bg-white py-6 px-4 rounded-3xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><Truck size={32} /></div>
                                <h3 className="text-3xl font-black text-[#3b2f2f] mb-1 leading-none">{orders.filter(o => o.customer?.type === 'delivery' && o.status === 'pending').length}</h3>
                                <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest leading-none mt-1">Entregas</p>
                            </div>

                            <div
                                onClick={() => { setActiveView('logistics'); setLogisticsTab('drivers'); }}
                                className="bg-white py-6 px-4 rounded-3xl shadow-sm border border-[#d9a65a]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={32} /></div>
                                <h3 className="text-3xl font-black text-[#3b2f2f] mb-1 leading-none">{drivers.filter(d => d.status === 'available').length}</h3>
                                <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest leading-none mt-1">Motoristas</p>
                            </div>

                            <div
                                onClick={() => setActiveView('logistics')}
                                className="bg-[#3b2f2f] py-6 px-4 rounded-3xl shadow-sm border border-[#d9a65a]/20 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-white flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><MapPin size={32} /></div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                    <h3 className="text-3xl font-black text-white leading-none">{drivers.filter(d => d.status === 'busy').length}</h3>
                                </div>
                                <p className="text-[#d9a65a] text-[10px] uppercase font-black tracking-widest leading-none mt-1">Live</p>
                            </div>

                            <div
                                onClick={() => setActiveView('orders')}
                                className="bg-[#d9a65a] py-6 px-4 rounded-3xl shadow-sm border border-[#3b2f2f]/10 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={32} /></div>
                                <h3 className="text-3xl font-black text-[#3b2f2f] mb-1 leading-none">
                                    {orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()} <span className="text-sm">MT</span>
                                </h3>
                                <p className="text-[#3b2f2f]/60 text-[10px] uppercase font-black tracking-widest leading-none mt-1">Total Vendas</p>
                            </div>
                        </div>

                        {/* Performance & Activity Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Performance Chart */}
                            <div className="lg:col-span-3">
                                <AnalyticsChart orders={orders} teamMembers={teamMembers} onExportMaster={handleExportMaster} />
                            </div>

                            {/* Recent Activity (Compact) */}
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col h-full max-h-[240px] lg:max-h-full">
                                <h3 className="text-sm font-black text-[#3b2f2f] uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Clock size={16} className="text-[#d9a65a]" /> Recentes
                                </h3>
                                <div className="space-y-3 overflow-y-auto pr-1 thin-scrollbar">
                                    {recentOrders.length === 0 ? (
                                        <p className="text-gray-400 text-[10px] text-center py-4 font-bold uppercase">Sem atividade.</p>
                                    ) : (
                                        recentOrders.slice(0, 5).map((o, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50/50 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-[#d9a65a]/10 group">
                                                <div className={`p-1.5 rounded-xl ${o.status === 'completed' ? 'bg-green-50 text-green-500' : o.status === 'pending' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>
                                                    {o.status === 'completed' ? <CheckCircle size={14} /> : o.status === 'pending' ? <Clock size={14} /> : <X size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-[#3b2f2f] text-[11px] truncate">{o.customer?.name || 'Cliente'}</p>
                                                    <p className="text-[9px] font-bold text-gray-400">{o.total} MT • {o.items?.length || 0} itens</p>
                                                </div>
                                                <span className="text-[8px] font-black text-gray-300 uppercase shrink-0">
                                                    {o.date && typeof o.date === 'string' && o.date.includes(',') ? o.date.split(',')[1]?.trim() : (o.date ? new Date(o.date).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A')}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button
                                    onClick={() => setActiveView('orders')}
                                    className="mt-4 w-full py-2 bg-gray-50 hover:bg-[#d9a65a]/10 text-gray-400 hover:text-[#d9a65a] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Ver Todos
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders View */}
                {activeView === 'orders' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-[#fcfbf9]">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-[#3b2f2f]">Pedidos</h2>
                                <span className="bg-[#3b2f2f] text-white text-xs font-bold px-2 py-1 rounded-full">{orders.length}</span>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                                <div className="relative w-full md:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Search size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar pedido..."
                                        value={orderSearchQuery}
                                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:border-[#d9a65a] focus:ring-1 focus:ring-[#d9a65a] outline-none transition-all shadow-sm"
                                    />
                                    {orderSearchQuery && (
                                        <button
                                            onClick={() => setOrderSearchQuery('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            title="Limpar pesquisa"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    {(['active', 'all', 'pending', 'completed', 'cancelled'] as const).map(s => (
                                        <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${statusFilter === s ? 'bg-white text-[#d9a65a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : s}</button>
                                    ))}
                                </div>
                                <button onClick={downloadOrdersCSV} className="bg-[#d9a65a]/10 text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#d9a65a] hover:text-white transition-colors">Exportar CSV</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b">
                                    <tr><th className="p-4 w-16">ID</th><th className="p-4">Data</th><th className="p-4">Cliente</th><th className="p-4">Total</th><th className="p-4">Pagamento</th><th className="p-4">Status</th><th className="p-4">Tipo</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredOrders.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-gray-400">Nenhum pedido encontrado.</td></tr> : filteredOrders.map(order => (
                                        <tr key={order.orderId} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 font-mono text-xs font-bold text-gray-400">#{order.orderId}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{new Date(order.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-[#3b2f2f]">{order.customer?.name || 'Cliente'}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {order.customer?.type || 'N/A'} • {order.customer?.phone || 'Sem contato'}</div>
                                            </td>
                                            <td className="p-4 font-bold text-[#d9a65a]">{(order.total || 0).toLocaleString()} MT</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.status === 'completed' || order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {order.status === 'completed' || order.status === 'paid' ? 'Pago' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-orange-100 text-orange-700' : order.status === 'kitchen' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>{order.status}</span></td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.customer?.type === 'delivery' ? 'bg-blue-50 text-blue-600' : 'bg-yellow-50 text-yellow-700'}`}>{order.customer?.type === 'delivery' ? 'Entrega' : (order.customer?.type === 'pickup' ? 'Takeaway' : (order.customer?.type === 'dine_in' ? 'Local' : 'N/A'))}</span></td>
                                            <td className="p-4 text-right flex items-center justify-end gap-2">
                                                <button
                                                    disabled={!isPrinterConnected}
                                                    onClick={async () => {
                                                        try {
                                                            await printerService.printReceipt({
                                                                short_id: order.orderId,
                                                                created_at: order.date,
                                                                total_amount: order.total,
                                                                payment_method: 'cash' // Assuming cash for quick re-print/drawer open if needed
                                                            }, order.items.map(i => ({
                                                                quantity: i.quantity,
                                                                product_name: i.name,
                                                                price: i.price
                                                            })), printerConfig.paperSize);
                                                        } catch (e) {
                                                            alert('Erro ao imprimir: ' + (e as any).message);
                                                        }
                                                    }}
                                                    className={`p-2 rounded-lg border transition-all ${isPrinterConnected ? 'text-[#d9a65a] border-[#d9a65a]/20 hover:bg-[#d9a65a] hover:text-white' : 'text-gray-300 border-gray-100 cursor-not-allowed'}`}
                                                    title={isPrinterConnected ? 'Imprimir Recibo' : 'Impressora Desconectada'}
                                                >
                                                    <Printer size={14} />
                                                </button>
                                                <button onClick={() => setSelectedOrder(order)} className="text-[#3b2f2f] border border-gray-200 hover:bg-[#3b2f2f] hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all">Ver Pedido</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Notifications View */}
                {activeView === 'notificacoes' && (
                    <div className="h-[calc(100vh-200px)] animate-fade-in">
                        <AdminNotifications />
                    </div>
                )}

                {/* Stock View */}
                {activeView === 'stock' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#d9a65a]/10 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fcfbf9]">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-[#3b2f2f]">Stock</h2>
                                <span className="bg-[#3b2f2f] text-white text-xs font-bold px-2 py-1 rounded-full">{products.length}</span>
                            </div>
                            {/* Stock Search Bar */}
                            <div className="flex gap-2">
                                <button onClick={() => setShowMassStockModal(true)} className="bg-white text-[#d9a65a] border border-[#d9a65a]/20 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                                    <Plus size={16} /> Adição em Massa
                                </button>
                                <button onClick={downloadStockCSV} className="bg-white text-[#3b2f2f] border border-[#d9a65a]/20 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                                    <Download size={16} /> Exportar Stock
                                </button>
                                <button onClick={() => { setCurrentProduct(null); setProductVariations([]); setPreviewImage(''); setIsEditingProduct(true); }} className="bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:brightness-110 transition-all">+ Novo Produto</button>
                            </div>
                        </div>
                        {/* Aba de Navegação do Stock */}
                        <div className="flex gap-6 pt-4 mb-2 px-6 border-b border-gray-100">
                            <button 
                                onClick={() => setStockTab('overview')} 
                                className={`pb-3 font-bold text-sm tracking-wide uppercase transition-colors ${stockTab === 'overview' ? 'border-b-2 border-[#d9a65a] text-[#d9a65a]' : 'text-gray-400 hover:text-[#3b2f2f]'}`}
                            >
                                Visão Geral
                            </button>
                            <button 
                                onClick={() => setStockTab('management')} 
                                className={`pb-3 font-bold text-sm tracking-wide uppercase transition-colors flex items-center gap-2 ${stockTab === 'management' ? 'border-b-2 border-[#d9a65a] text-[#d9a65a]' : 'text-gray-400 hover:text-[#3b2f2f]'}`}
                            >
                                Gestão em Massa
                                {Object.keys(editedMassStock).length > 0 && (
                                    <span className="bg-[#d9a65a] text-white text-[10px] px-2 py-0.5 rounded-full">
                                        {Object.keys(editedMassStock).length} mods
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => setStockTab('pricing')} 
                                className={`pb-3 font-bold text-sm tracking-wide uppercase transition-colors flex items-center gap-2 ${stockTab === 'pricing' ? 'border-b-2 border-[#d9a65a] text-[#d9a65a]' : 'text-gray-400 hover:text-[#3b2f2f]'}`}
                            >
                                Precificação
                                {Object.keys(editedMassPricing).length > 0 && (
                                    <span className="bg-[#d9a65a] text-white text-[10px] px-2 py-0.5 rounded-full">
                                        {Object.keys(editedMassPricing).length} mods
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => setStockTab('menu')} 
                                className={`pb-3 font-bold text-sm tracking-wide uppercase transition-colors flex items-center gap-2 ${stockTab === 'menu' ? 'border-b-2 border-[#d9a65a] text-[#d9a65a]' : 'text-gray-400 hover:text-[#3b2f2f]'}`}
                            >
                                📋 Menu
                            </button>
                        </div>

                        {/* Stock Search Bar & Filter */}
                        <div className="mx-auto mb-4 relative max-w-4xl w-full px-6 flex flex-col sm:flex-row gap-3 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={stockSearchTerm}
                                    onChange={(e) => setStockSearchTerm(e.target.value)}
                                    placeholder="Pesquisar produto por nome ou ID..."
                                    className="w-full pl-10 p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#d9a65a] bg-gray-50/50"
                                />
                            </div>
                            <select
                                value={stockCategoryFilter}
                                onChange={(e) => setStockCategoryFilter(e.target.value)}
                                className="p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#d9a65a] bg-gray-50/50 min-w-[150px] capitalize cursor-pointer"
                            >
                                <option value="all">Todas as Categorias</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat as string} value={cat as string}>{cat as string}</option>
                                ))}
                            </select>
                            <select
                                value={stockAvailabilityFilter}
                                onChange={(e) => setStockAvailabilityFilter(e.target.value as any)}
                                className="p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#d9a65a] bg-gray-50/50 min-w-[150px] cursor-pointer"
                            >
                                <option value="all">Todas Disponibilidades</option>
                                <option value="available">Em Stock</option>
                                <option value="unavailable">Esgotado</option>
                            </select>
                            
                            {stockTab === 'management' && selectedMassStockIds.length > 0 && (
                                <div className="flex gap-2 mr-auto bg-[#d9a65a]/10 p-2 rounded-xl border border-[#d9a65a]/20 items-center animate-fade-in shadow-inner">
                                    <span className="text-xs font-black text-[#3b2f2f] uppercase tracking-wider px-3 border-r border-[#d9a65a]/30">
                                        {selectedMassStockIds.length} Sel.
                                    </span>
                                    <button 
                                        onClick={() => {
                                            setEditedMassStock(prev => {
                                                const next = { ...prev };
                                                selectedMassStockIds.forEach(id => {
                                                    const p = products.find(prod => prod.id === id);
                                                    if (!p) return;
                                                    const existing = next[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '', showInMenu: p.show_in_menu };
                                                    const newState = { ...existing, inStock: true };
                                                    if (newState.stockQuantity === p.stockQuantity && newState.unit === p.unit && newState.inStock === p.inStock && newState.sku === (p.sku || '') && newState.showInMenu === p.show_in_menu) {
                                                        delete next[id];
                                                    } else {
                                                        next[id] = newState;
                                                    }
                                                });
                                                return next;
                                            });
                                        }}
                                        className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm focus:outline-none"
                                    >
                                        Marcar Disponível
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditedMassStock(prev => {
                                                const next = { ...prev };
                                                selectedMassStockIds.forEach(id => {
                                                    const p = products.find(prod => prod.id === id);
                                                    if (!p) return;
                                                    const existing = next[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '', showInMenu: p.show_in_menu };
                                                    const newState = { ...existing, inStock: false };
                                                    if (newState.stockQuantity === p.stockQuantity && newState.unit === p.unit && newState.inStock === p.inStock && newState.sku === (p.sku || '') && newState.showInMenu === p.show_in_menu) {
                                                        delete next[id];
                                                    } else {
                                                        next[id] = newState;
                                                    }
                                                });
                                                return next;
                                            });
                                        }}
                                        className="bg-red-100 text-red-800 hover:bg-red-200 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm focus:outline-none"
                                    >
                                        Marcar Esgotado
                                    </button>
                                    <div className="h-6 w-px bg-gray-200 mx-1"></div>
                                    <button 
                                        onClick={() => {
                                            setEditedMassStock(prev => {
                                                const next = { ...prev };
                                                selectedMassStockIds.forEach(id => {
                                                    const p = products.find(prod => prod.id === id);
                                                    if (!p) return;
                                                    const existing = next[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '', showInMenu: p.show_in_menu };
                                                    const newState = { ...existing, showInMenu: true };
                                                    if (newState.stockQuantity === p.stockQuantity && newState.unit === p.unit && newState.inStock === p.inStock && newState.sku === (p.sku || '') && newState.showInMenu === p.show_in_menu) {
                                                        delete next[id];
                                                    } else {
                                                        next[id] = newState;
                                                    }
                                                });
                                                return next;
                                            });
                                        }}
                                        className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm focus:outline-none"
                                    >
                                        Mostrar no Menu
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditedMassStock(prev => {
                                                const next = { ...prev };
                                                selectedMassStockIds.forEach(id => {
                                                    const p = products.find(prod => prod.id === id);
                                                    if (!p) return;
                                                    const existing = next[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '', showInMenu: p.show_in_menu };
                                                    const newState = { ...existing, showInMenu: false };
                                                    if (newState.stockQuantity === p.stockQuantity && newState.unit === p.unit && newState.inStock === p.inStock && newState.sku === (p.sku || '') && newState.showInMenu === p.show_in_menu) {
                                                        delete next[id];
                                                    } else {
                                                        next[id] = newState;
                                                    }
                                                });
                                                return next;
                                            });
                                        }}
                                        className="bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm focus:outline-none"
                                    >
                                        Ocultar do Menu
                                    </button>
                                </div>
                            )}

                            {stockTab === 'management' && Object.keys(editedMassStock).length > 0 && (
                                <button 
                                    onClick={handleSaveMassStock} 
                                    disabled={isSavingMassStock}
                                    className={`bg-[#d9a65a] text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:brightness-110 flex items-center gap-2 transition-all whitespace-nowrap ${isSavingMassStock ? 'opacity-50 cursor-not-allowed' : 'animate-bounce'}`}
                                >
                                    <Save size={16} />
                                    {isSavingMassStock ? 'A Guardar...' : `Guardar ${Object.keys(editedMassStock).length} Alterações`}
                                </button>
                            )}
                            {stockTab === 'pricing' && Object.keys(editedMassPricing).length > 0 && (
                                <button 
                                    onClick={handleSaveMassPricing} 
                                    disabled={isSavingMassPricing}
                                    className={`bg-[#d9a65a] text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:brightness-110 flex items-center gap-2 transition-all whitespace-nowrap ${isSavingMassPricing ? 'opacity-50 cursor-not-allowed' : 'animate-bounce'}`}
                                >
                                    <Save size={16} />
                                    {isSavingMassPricing ? 'A Guardar...' : `Guardar ${Object.keys(editedMassPricing).length} Preços`}
                                </button>
                            )}
                        </div>
                        <div className={stockTab === 'menu' ? 'overflow-y-auto max-h-[calc(100vh-310px)] custom-scrollbar p-4' : 'overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar'}>
                            {stockTab === 'menu' ? (
                                <div>
                                    <AdminMenuView
                                        products={products.map((p: any) => ({
                                            id: p.id,
                                            name: p.name,
                                            price: p.price,
                                            category: p.category || 'Outros',
                                            description: p.description,
                                            image_url: p.image,
                                            inStock: p.inStock,
                                            showInMenu: p.show_in_menu !== false,
                                            internal_id: p.internal_id
                                        }))}
                                        companyInfo={{
                                            name: companyInfo.name,
                                            phone: companyInfo.phone,
                                            email: companyInfo.email,
                                            address: companyInfo.address,
                                            slogan: companyInfo.slogan,
                                            logo: companyInfo.logo,
                                            website: companyInfo.website
                                        }}
                                    />
                                </div>
                            ) : stockTab === 'pricing' ? (
                                <table className="w-full text-left">
                                    <thead className="bg-[#d9a65a]/10 text-xs uppercase font-bold text-[#3b2f2f] border-b sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="p-4">Produto</th>
                                            <th className="p-4 w-36">Custo Compra (MT)</th>
                                            <th className="p-4 w-36">Outro Custo (MT)</th>
                                            <th className="p-4 w-32 text-center">Margem (%)</th>
                                            <th className="p-4 w-40 text-right">Preço Venda (MT)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredProducts.map((p) => {
                                            const editedState = editedMassPricing[p.id];
                                            const currentPurchase = editedState ? editedState.purchasePrice : p.purchasePrice || 0;
                                            const currentOther = editedState ? editedState.otherCost : p.otherCost || 0;
                                            const currentMargin = editedState ? editedState.marginPercentage : p.marginPercentage || 0;
                                            const isEdited = !!editedState;
                                            
                                            // Calcula preço final
                                            const totalCost = currentPurchase + currentOther;
                                            const currentFinalPrice = editedState ? editedState.finalPrice : p.price || 0;

                                            const updatePricing = (field: 'purchasePrice' | 'otherCost' | 'marginPercentage', value: number) => {
                                                setEditedMassPricing(prev => {
                                                    const existing = prev[p.id] || { 
                                                        purchasePrice: p.purchasePrice || 0, 
                                                        otherCost: p.otherCost || 0, 
                                                        marginPercentage: p.marginPercentage || 0,
                                                        finalPrice: p.price || 0 
                                                    };
                                                    
                                                    const newState = { ...existing, [field]: value };
                                                    const newTotalCost = newState.purchasePrice + newState.otherCost;
                                                    newState.finalPrice = Math.round(newTotalCost + (newTotalCost * (newState.marginPercentage / 100)));
                                                    
                                                    if (newState.purchasePrice === (p.purchasePrice || 0) && 
                                                        newState.otherCost === (p.otherCost || 0) && 
                                                        newState.marginPercentage === (p.marginPercentage || 0)) {
                                                        const copy = { ...prev };
                                                        delete copy[p.id];
                                                        return copy;
                                                    }
                                                    return { ...prev, [p.id]: newState };
                                                });
                                            };

                                            return (
                                                <tr key={p.id} className={`transition-colors ${isEdited ? 'bg-[#d9a65a]/5' : 'hover:bg-gray-50'}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {p.image ? <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><Package size={16} /></div>}
                                                            <div>
                                                                <span className="font-bold text-[#3b2f2f] block">{p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase()}</span>
                                                                <span className="text-[10px] text-gray-400">Preço Original: {p.price} MT</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <input 
                                                            type="number" 
                                                            value={currentPurchase}
                                                            onChange={(e) => updatePricing('purchasePrice', Number(e.target.value))}
                                                            className={`w-24 p-2 text-sm border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#d9a65a]/50 ${isEdited && editedState.purchasePrice !== p.purchasePrice ? 'border-[#d9a65a] bg-yellow-50 text-[#3b2f2f]' : 'border-gray-200 text-gray-700'}`}
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <input 
                                                            type="number" 
                                                            value={currentOther}
                                                            onChange={(e) => updatePricing('otherCost', Number(e.target.value))}
                                                            className={`w-24 p-2 text-sm border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#d9a65a]/50 ${isEdited && editedState.otherCost !== p.otherCost ? 'border-[#d9a65a] bg-yellow-50 text-[#3b2f2f]' : 'border-gray-200 text-gray-700'}`}
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <input 
                                                            type="number" 
                                                            value={currentMargin}
                                                            onChange={(e) => updatePricing('marginPercentage', Number(e.target.value))}
                                                            className={`w-20 p-2 text-sm border rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#d9a65a]/50 ${isEdited && editedState.marginPercentage !== p.marginPercentage ? 'border-[#d9a65a] bg-yellow-50 text-[#3b2f2f]' : 'border-gray-200 text-gray-700'}`}
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className={`text-lg font-black ${isEdited && editedState.finalPrice !== p.price ? 'text-[#d9a65a] animate-pulse' : 'text-gray-400'}`}>
                                                            {currentFinalPrice.toLocaleString()} MT
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredProducts.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-10 text-center text-gray-400 italic">
                                                    Nenhum produto corresponde aos filtros atuais.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : stockTab === 'overview' ? (
                                <table className="w-full text-left">
                                    <thead className="bg-[#3b2f2f] text-xs uppercase font-bold text-[#d9a65a] border-b sticky top-0 z-10">
                                        <tr><th className="p-4 w-16">ID</th><th className="p-4">Produto</th><th className="p-4">Preço</th><th className="p-4">Qtd</th><th className="p-4">Unidade</th><th className="p-4">Disponibilidade</th><th className="p-4 text-right">Ações</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredProducts.map((p, index) => (
                                            <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="p-4 text-[10px] font-mono text-gray-400 max-w-[50px] truncate" title={p.id}>
                                                    {companyInfo.productPrefix || 'PROD'}-{index + 10}
                                                </td>
                                                <td className="p-4 flex items-center gap-3">
                                                    {p.image ? <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><Package size={16} /></div>}
                                                    <div>
                                                        <span className="font-bold text-[#3b2f2f] block">{p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase()}</span>
                                                        <span className="text-xs text-gray-400 capitalize">{p.category}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-[#d9a65a]">{p.price} MT</td>
                                                <td className="p-4 text-sm font-bold text-gray-600">{p.stockQuantity}</td>
                                                <td className="p-4 text-sm text-gray-500">{p.unit}</td>
                                                <td className="p-4"><span className={`w-2 h-2 rounded-full inline-block mr-2 ${p.inStock ? 'bg-green-500' : 'bg-red-500'}`}></span><span className="text-xs text-gray-500">{p.inStock ? 'Disponível' : 'Indisponível'}</span></td>
                                                <td className="p-4 text-right space-x-2">
                                                    <button onClick={() => { setCurrentProduct(p); setProductVariations(p.variations || []); setPreviewImage(p.image || ''); setIsEditingProduct(true); }} className="text-blue-500 font-bold text-xs hover:underline">Editar</button>
                                                    <button onClick={async () => {
                                                        try {
                                                            await supabase.from('products').update({ is_available: !p.inStock }).eq('id', p.id);
                                                            loadProducts();
                                                        } catch(e) {}
                                                    }} className={`${p.inStock ? 'text-orange-500' : 'text-green-500'} font-bold text-xs hover:underline`}>{p.inStock ? 'Esgotar' : 'Disponibilizar'}</button>
                                                    <button onClick={() => { setCurrentProduct({ ...p, id: undefined, name: p.name + ' (Cópia)' }); setProductVariations(p.variations || []); setPreviewImage(p.image || ''); setIsEditingProduct(true); }} className="text-purple-500 font-bold text-xs hover:underline">Duplicar</button>
                                                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 font-bold text-xs hover:underline">Remover</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-10 text-center text-gray-400 italic">
                                                    Nenhum produto corresponde aos filtros atuais.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-[#3b2f2f] text-[#d9a65a] font-bold">
                                        <tr>
                                            <td colSpan={3} className="p-4 text-right">TOTAIS (Overview)</td>
                                            <td className="p-4">{filteredProducts.reduce((sum, p) => sum + (p.stockQuantity || 0), 0)} un</td>
                                            <td className="p-4 text-right" colSpan={3}>
                                                Valor Inventário Mz: {filteredProducts.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.price || 0)), 0).toLocaleString()} MT
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <>
                                    {selectedMassStockIds.length > 0 && (
                                        <div className="p-4 bg-[#d9a65a]/5 border-b border-[#d9a65a]/20 flex flex-wrap items-center gap-6 animate-slide-down">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-[#3b2f2f] text-[#d9a65a] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                                    {selectedMassStockIds.length} selecionados
                                                </span>
                                            </div>
                                            <div className="h-6 w-px bg-gray-200"></div>
                                            
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Definir Qtd</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Ex: 10" 
                                                        className="w-20 p-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#d9a65a] outline-none"
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            if (isNaN(val)) return;
                                                            selectedMassStockIds.forEach(id => {
                                                                const p = filteredProducts.find(prod => prod.id === id);
                                                                if (p) {
                                                                    setEditedMassStock(prev => ({
                                                                        ...prev,
                                                                        [id]: { ...(prev[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '' }), stockQuantity: val }
                                                                    }));
                                                                }
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Unidade</label>
                                                    <select 
                                                        className="p-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#d9a65a] outline-none"
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            selectedMassStockIds.forEach(id => {
                                                                const p = filteredProducts.find(prod => prod.id === id);
                                                                if (p) {
                                                                    setEditedMassStock(prev => ({
                                                                        ...prev,
                                                                        [id]: { ...(prev[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '' }), unit: val }
                                                                    }));
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Manter</option>
                                                        <option value="un">un</option>
                                                        <option value="kg">kg</option>
                                                        <option value="g">g</option>
                                                        <option value="l">l</option>
                                                        <option value="ml">ml</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Estado</label>
                                                    <select 
                                                        className="p-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#d9a65a] outline-none"
                                                        onChange={(e) => {
                                                            if (!e.target.value) return;
                                                            const val = e.target.value === 'true';
                                                            selectedMassStockIds.forEach(id => {
                                                                const p = filteredProducts.find(prod => prod.id === id);
                                                                if (p) {
                                                                    setEditedMassStock(prev => ({
                                                                        ...prev,
                                                                        [id]: { ...(prev[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '', showInMenu: p.show_in_menu }), inStock: val }
                                                                    }));
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Manter</option>
                                                        <option value="true">Disponível</option>
                                                        <option value="false">Esgotado</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">No Menu?</label>
                                                    <select 
                                                        className="p-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#d9a65a] outline-none"
                                                        onChange={(e) => {
                                                            if (!e.target.value) return;
                                                            const val = e.target.value === 'true';
                                                            selectedMassStockIds.forEach(id => {
                                                                const p = filteredProducts.find(prod => prod.id === id);
                                                                if (p) {
                                                                    setEditedMassStock(prev => ({
                                                                        ...prev,
                                                                        [id]: { ...(prev[id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '', showInMenu: p.show_in_menu }), showInMenu: val }
                                                                    }));
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Manter</option>
                                                        <option value="true">Mostrar</option>
                                                        <option value="false">Ocultar</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <table className="w-full text-left">
                                    <thead className="bg-[#d9a65a]/10 text-xs uppercase font-bold text-[#3b2f2f] border-b sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="p-4 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={filteredProducts.length > 0 && selectedMassStockIds.length === filteredProducts.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedMassStockIds(filteredProducts.map(p => p.id));
                                                        } else {
                                                            setSelectedMassStockIds([]);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded text-[#d9a65a] focus:ring-[#d9a65a] cursor-pointer"
                                                />
                                            </th>
                                            <th className="p-4">Produto</th>
                                            <th className="p-4 w-32">SKU / Código</th>
                                            <th className="p-4 w-32">Quantidade</th>
                                            <th className="p-4 w-32">Unidade</th>
                                            <th className="p-4 w-32 text-center">Disponibilidade</th>
                                            <th className="p-4 w-32 text-center">No Menu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredProducts.map((p) => {
                                            const editedState = editedMassStock[p.id];
                                            const currentQuantity = editedState ? editedState.stockQuantity : p.stockQuantity;
                                            const currentUnit = editedState ? editedState.unit : p.unit;
                                            const currentAvailability = editedState ? editedState.inStock : p.inStock;
                                            const currentShowInMenu = editedState ? editedState.showInMenu : p.show_in_menu;
                                            const currentSku = editedState ? editedState.sku : (p.sku || '');
                                            const isEdited = !!editedState;

                                            const updateProduct = (field: 'stockQuantity' | 'unit' | 'inStock' | 'sku' | 'showInMenu', value: any) => {
                                                setEditedMassStock(prev => {
                                                    const existing = prev[p.id] || { stockQuantity: p.stockQuantity, unit: p.unit, inStock: p.inStock, sku: p.sku || '', showInMenu: p.show_in_menu };
                                                    const newState = { ...existing, [field]: value };
                                                    
                                                    // If new values match original exactly, remove from edits payload
                                                    if (newState.stockQuantity === p.stockQuantity && newState.unit === p.unit && newState.inStock === p.inStock && newState.sku === (p.sku || '') && newState.showInMenu === p.show_in_menu) {
                                                        const copy = { ...prev };
                                                        delete copy[p.id];
                                                        return copy;
                                                    }
                                                    return { ...prev, [p.id]: newState };
                                                });
                                            };

                                            return (
                                                <tr key={p.id} className={`transition-colors ${isEdited ? 'bg-[#d9a65a]/5' : 'hover:bg-gray-50'}`}>
                                                    <td className="p-4 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedMassStockIds.includes(p.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedMassStockIds(prev => [...prev, p.id]);
                                                                } else {
                                                                    setSelectedMassStockIds(prev => prev.filter(id => id !== p.id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded text-[#d9a65a] focus:ring-[#d9a65a] cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {p.image ? <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><Package size={16} /></div>}
                                                            <div>
                                                                <span className="font-bold text-[#3b2f2f] block">{p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase()}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">ID Ref: {companyInfo.productPrefix}-{p.id.substring(0,6).toUpperCase()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <input 
                                                            type="text" 
                                                            value={currentSku}
                                                            onChange={(e) => updateProduct('sku', e.target.value)}
                                                            placeholder={`Ex: ${companyInfo.productPrefix || 'PROD'}-001`}
                                                            className={`w-24 p-2 text-sm border rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#d9a65a]/50 ${isEdited && editedState.sku !== p.sku ? 'border-[#d9a65a] bg-yellow-50' : 'border-gray-200 uppercase'}`}
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <input 
                                                            type="number" 
                                                            value={currentQuantity}
                                                            onChange={(e) => updateProduct('stockQuantity', Number(e.target.value))}
                                                            className={`w-20 p-2 text-sm border rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#d9a65a]/50 ${isEdited && editedState.stockQuantity !== p.stockQuantity ? 'border-[#d9a65a] bg-yellow-50' : 'border-gray-200'}`}
                                                            min="0"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={currentUnit}
                                                            onChange={(e) => updateProduct('unit', e.target.value)}
                                                            className={`w-full p-2 text-sm border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#d9a65a]/50 ${isEdited && editedState.unit !== p.unit ? 'border-[#d9a65a] bg-yellow-50' : 'border-gray-200'}`}
                                                        >
                                                            <option value="un">un</option>
                                                            <option value="kg">kg</option>
                                                            <option value="g">g</option>
                                                            <option value="l">l</option>
                                                            <option value="ml">ml</option>
                                                            <option value="porcao">porção</option>
                                                            <option value="fatia">fatia</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => updateProduct('inStock', !currentAvailability)}
                                                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${currentAvailability ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}
                                                        >
                                                            {currentAvailability ? 'Disponível' : 'Esgotado'}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => updateProduct('showInMenu', !currentShowInMenu)}
                                                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${currentShowInMenu ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                                                        >
                                                            {currentShowInMenu ? 'Visível' : 'Oculto'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredProducts.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-10 text-center text-gray-400 italic">
                                                    Nenhum produto corresponde aos filtros atuais.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-[#d9a65a]/10 text-[#3b2f2f] font-bold">
                                        <tr>
                                            <td colSpan={2} className="p-4 text-right border-t border-[#d9a65a]/20">TOTAIS (Gestão em Massa)</td>
                                            <td colSpan={2} className="p-4 text-center border-t border-[#d9a65a]/20">{filteredProducts.reduce((sum, p) => sum + (p.stockQuantity || 0), 0)} unidades físicas</td>
                                            <td colSpan={3} className="border-t border-[#d9a65a]/20"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </>
                            )}
                        </div>
                    </div>
                )}



                        {/* Customers View (Consolidated and Improved) */}
                        {activeView === 'customers' && (
                            <div className="bg-white rounded-[40px] shadow-2xl border border-[#d9a65a]/10 overflow-hidden animate-fade-in flex flex-col h-full min-h-[600px]">
                                <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-[#fcfbf9] gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-[#3b2f2f] p-3 rounded-2xl text-[#d9a65a]">
                                            <Users size={32} />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-serif font-black text-[#3b2f2f] uppercase tracking-tighter leading-none">Clientes</h2>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{customers.length} registos ativos</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        <button
                                            onClick={downloadCustomersCSV}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-gray-100 text-[#3b2f2f] rounded-[2rem] text-xs font-black uppercase tracking-widest hover:border-[#d9a65a] hover:bg-[#d9a65a]/5 transition-all shadow-sm"
                                        >
                                            <Download size={18} /> Exportar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setQuickCustomerForm({ name: '', phone: '', email: '', nuit: '' });
                                                setIsAddingCustomer(true);
                                            }}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-[#3b2f2f] text-[#d9a65a] rounded-[2rem] text-xs font-black uppercase tracking-widest hover:shadow-2xl hover:brightness-110 transition-all"
                                        >
                                            <Plus size={18} /> Novo Cliente
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border-b border-gray-50">
                                    <div className="relative max-w-2xl">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                        <input 
                                            type="text" 
                                            placeholder="Pesquisar por nome, telefone ou ID (ex: CLI-001)..." 
                                            className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#d9a65a]/30 focus:bg-white rounded-[2rem] outline-none transition-all font-medium text-sm text-[#3b2f2f] shadow-inner"
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50/50 text-[10px] uppercase font-black tracking-[0.2em] text-gray-400 border-b border-gray-100">
                                            <tr>
                                                <th className="p-6">Perfil do Cliente</th>
                                                <th className="p-6">Informação Fiscal / Contacto</th>
                                                <th className="p-6">Histórico & Status</th>
                                                <th className="p-6 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {customers
                                                .filter(c => 
                                                    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
                                                    (c.contact_no && c.contact_no.includes(customerSearch)) ||
                                                    (c.internal_id && c.internal_id.toLowerCase().includes(customerSearch.toLowerCase())) ||
                                                    (c.id && c.id.toLowerCase().includes(customerSearch.toLowerCase()))
                                                )
                                                .map((c: any) => (
                                                <tr key={c.id} className="hover:bg-[#d9a65a]/5 transition-colors group">
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-[#d9a65a] font-serif font-black text-xl group-hover:bg-white transition-colors">
                                                                {c.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-[#3b2f2f] group-hover:text-[#d9a65a] transition-colors">{c.name}</div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] font-black px-2 py-0.5 bg-[#3b2f2f] text-white rounded-full font-mono">
                                                                        {c.internal_id || `${companyInfo.prefix}-${c.id.substring(0,4).toUpperCase()}`}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Desde {new Date(c.created_at).toLocaleDateString('pt-PT')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                                                <Smartphone size={14} className="text-[#d9a65a]" /> {c.contact_no}
                                                            </div>
                                                            {c.email && <div className="text-xs text-gray-400 flex items-center gap-2"><Mail size={12} /> {c.email}</div>}
                                                            {c.nuit && <div className="text-[10px] font-black text-[#3b2f2f]/40 uppercase tracking-widest mt-1">NUIT: {c.nuit}</div>}
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${c.is_blocked ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{c.is_blocked ? 'Bloqueado' : 'Conta Ativa'}</span>
                                                            </div>
                                                            <div className="text-[9px] font-bold text-[#d9a65a] bg-[#d9a65a]/10 px-2 py-1 rounded-lg w-fit uppercase tracking-tighter">Cliente Registado</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => { setSelectedCustomer(c); loadCustomerLogs(c.id); }} 
                                                                className="p-3 bg-gray-50 text-gray-400 hover:bg-[#3b2f2f] hover:text-[#d9a65a] rounded-2xl transition-all"
                                                                title="Ver Ficha Completa"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { setCustomerForm(c); setIsEditingCustomer(true); }} 
                                                                className="p-3 bg-gray-50 text-gray-400 hover:bg-[#d9a65a] hover:text-[#3b2f2f] rounded-2xl transition-all"
                                                                title="Editar Perfil"
                                                            >
                                                                <Edit3 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {customers.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-20 text-center">
                                                        <div className="flex flex-col items-center gap-4 text-gray-300">
                                                            <Users size={64} className="opacity-20" />
                                                            <p className="font-serif italic text-lg opacity-50">Nenhum cliente encontrado na base de dados.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Add Customer Modal (NEW) */}
                        {isAddingCustomer && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }} 
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl relative overflow-hidden"
                                >
                                    <button onClick={() => setIsAddingCustomer(false)} title="Fechar" className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition-colors">
                                        <X size={28} />
                                    </button>
                                    
                                    <div className="mb-8">
                                        <div className="bg-[#d9a65a]/10 w-16 h-16 rounded-3xl flex items-center justify-center text-[#d9a65a] mb-6">
                                            <UserPlus size={32} />
                                        </div>
                                        <h3 className="text-3xl font-serif font-black text-[#3b2f2f] uppercase tracking-tighter">Novo Cliente</h3>
                                        <p className="text-sm text-gray-400 font-medium mt-2 tracking-tight">Registe um novo cliente manualmente na base de dados.</p>
                                    </div>

                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setIsSubmitting(true);
                                        try {
                                            const { data, error } = await supabase.from('customers').insert({
                                                name: quickCustomerForm.name,
                                                contact_no: quickCustomerForm.phone,
                                                email: quickCustomerForm.email,
                                                nuit: quickCustomerForm.nuit
                                            }).select().single();
                                            
                                            if (error) throw error;
                                            
                                            alert('Cliente registado com sucesso!');
                                            setIsAddingCustomer(false);
                                            loadCustomers();
                                        } catch (err: any) {
                                            alert('Erro ao registar cliente: ' + (err.code === '23505' ? 'Este número de telefone já existe.' : err.message));
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }} className="space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo *</label>
                                                <input 
                                                    required 
                                                    placeholder="Ex: João Silva" 
                                                    value={quickCustomerForm.name} 
                                                    onChange={e => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })} 
                                                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#d9a65a]/30 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Telemóvel *</label>
                                                <input 
                                                    required 
                                                    placeholder="Ex: 840000000" 
                                                    value={quickCustomerForm.phone} 
                                                    onChange={e => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })} 
                                                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#d9a65a]/30 focus:bg-white rounded-2xl outline-none transition-all font-bold text-[#d9a65a] font-mono text-lg"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                                                    <input 
                                                        type="email"
                                                        placeholder="cliente@email.com" 
                                                        value={quickCustomerForm.email} 
                                                        onChange={e => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })} 
                                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#d9a65a]/30 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">NUIT</label>
                                                    <input 
                                                        placeholder="Ex: 123456789" 
                                                        value={quickCustomerForm.nuit} 
                                                        onChange={e => setQuickCustomerForm({ ...quickCustomerForm, nuit: e.target.value })} 
                                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#d9a65a]/30 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700 font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                className="w-full bg-[#3b2f2f] text-[#d9a65a] py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
                                            >
                                                {isSubmitting ? <Loader size={20} className="animate-spin" /> : <><Plus size={20} /> Registar Cliente</>}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}

                        {/* Customer Details Modal */}
                        {selectedCustomer && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">Ficha de Cliente</h3>
                                        <button onClick={() => { setSelectedCustomer(null); setCustomerLogs([]); }} title="Fechar" className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 border-b pb-2">Detalhes Principais</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">ID Cliente</p>
                                                    <p className="font-bold text-[#d9a65a] text-lg">{selectedCustomer.internal_id || 'S/N'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Nome</p>
                                                    <p className="font-bold text-[#3b2f2f]">{selectedCustomer.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Telefone Principal</p>
                                                    <p className="font-bold text-[#3b2f2f]">{selectedCustomer.contact_no}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Email</p>
                                                    <p className="font-bold text-gray-700">{selectedCustomer.email || 'Não Defenido'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">NUIT</p>
                                                    <p className="font-mono text-gray-700">{selectedCustomer.nuit || 'S/N'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 border-b pb-2">Informações Adicionais</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Data de Nascimento</p>
                                                    <p className="font-bold text-gray-700">{selectedCustomer.date_of_birth ? new Date(selectedCustomer.date_of_birth).toLocaleDateString('pt-PT') : 'Não Definida'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">WhatsApp Link</p>
                                                    <p className="font-bold text-gray-700">{selectedCustomer.whatsapp || 'Igual ao Principal (Padrão)'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Membro Desde</p>
                                                    <p className="font-bold text-gray-700">{new Date(selectedCustomer.created_at).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-[#d9a65a] font-bold uppercase">Último Acesso / Atualização</p>
                                                    <p className="font-mono text-gray-700">{selectedCustomer.updated_at ? new Date(selectedCustomer.updated_at).toLocaleString() : 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Actions Card */}
                                    {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-8">
                                            <h4 className="text-sm font-bold text-red-800 uppercase mb-4 border-b border-red-200 pb-2 flex items-center gap-2">
                                                Ações Avançadas (Admin)
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => { setCustomerForm(selectedCustomer); setIsEditingCustomer(true); }} className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">Editar Perfil</button>
                                                <button onClick={() => handleResetCustomerPassword(selectedCustomer)} className="bg-white text-orange-600 border border-orange-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors">Reset de Senha (SMS)</button>
                                                <button onClick={() => handleToggleBlockCustomer(selectedCustomer)} className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                                                    {selectedCustomer.is_blocked ? 'Desbloquear Acesso' : 'Bloquear Cliente'}
                                                </button>
                                                <button onClick={() => handleDeleteCustomer(selectedCustomer.id)} className="bg-red-600 text-white border border-red-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors ml-auto">Apagar Conta</button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex justify-between items-center">
                                            Histórico de Pedidos
                                            <span className="bg-[#d9a65a] text-[#3b2f2f] px-2 py-0.5 rounded-full text-[10px]">{customerLogs.length} Compras</span>
                                        </h4>
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                            {customerLogs.length > 0 ? (
                                                <div className="max-h-60 overflow-y-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-500 sticky top-0">
                                                            <tr>
                                                                <th className="p-3">Ref</th>
                                                                <th className="p-3">Data</th>
                                                                <th className="p-3">Total</th>
                                                                <th className="p-3">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {customerLogs.map((log: any) => (
                                                                <tr key={log.id} className="hover:bg-white transition-colors">
                                                                    <td className="p-3 font-mono text-gray-500">{log.short_id || log.id.slice(0, 8)}</td>
                                                                    <td className="p-3 text-gray-600">{new Date(log.created_at).toLocaleDateString('pt-PT')}</td>
                                                                    <td className="p-3 font-bold text-[#d9a65a]">{Number(log.total_amount).toLocaleString()} MT</td>
                                                                    <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${log.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{log.status}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 text-sm">Este cliente ainda não efetuou nenhuma compra.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer Editing Modal */}
                        {isEditingCustomer && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                                <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">Editar Cliente</h3>
                                        <button onClick={() => setIsEditingCustomer(false)} title="Fechar" className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                                    </div>
                                    <form onSubmit={handleUpdateCustomer} className="space-y-4">
                                        {customerForm.internal_id && (
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ID do Cliente</p>
                                                <p className="text-sm font-bold text-[#d9a65a] font-mono">{customerForm.internal_id}</p>
                                            </div>
                                        )}
                                        <div><label htmlFor="customer-name" className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label><input id="customer-name" required value={customerForm.name || ''} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        <div><label htmlFor="customer-phone" className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone Principal</label><input id="customer-phone" required value={customerForm.contact_no || ''} onChange={e => setCustomerForm({ ...customerForm, contact_no: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        <div><label htmlFor="customer-email" className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input id="customer-email" type="email" value={customerForm.email || ''} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label htmlFor="customer-nuit" className="block text-xs font-bold text-gray-500 uppercase mb-1">NUIT</label><input id="customer-nuit" value={customerForm.nuit || ''} onChange={e => setCustomerForm({ ...customerForm, nuit: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                            <div><label htmlFor="customer-dob" className="block text-xs font-bold text-gray-500 uppercase mb-1">Nascimento (YYYY-MM-DD)</label><input id="customer-dob" type="date" title="Data de Nascimento" value={customerForm.date_of_birth || ''} onChange={e => setCustomerForm({ ...customerForm, date_of_birth: e.target.value })} className="w-full p-2 border rounded-lg focus:border-[#d9a65a] outline-none" /></div>
                                        </div>
                                        <button type="submit" className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-lg font-bold mt-4 hover:shadow-lg">Salvar Modificações</button>
                                    </form>
                                </div>
                            </div>
                        )}


                {/* Documents / Drive View */}
                {activeView === 'documents' && (
                    <div className="animate-fade-in bg-white rounded-3xl shadow-sm border border-[#d9a65a]/10 min-h-full h-[calc(100vh-140px)] overflow-hidden">
                        <AdminDriveView />
                    </div>
                )}

                {isEditingMember && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">{currentMember ? 'Editar Membro' : 'Novo Membro da Equipa'}</h3>
                                <button onClick={() => { setIsEditingMember(false); setCurrentMember(null); setMemberAvatar(null); }} title="Fechar" className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveMember} className="space-y-4">
                                {currentMember?.internal_id && (
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID do Colaborador</p>
                                            <p className="text-sm font-bold text-[#d9a65a] font-mono">{currentMember.internal_id}</p>
                                        </div>
                                        <div className="text-[10px] bg-[#3b2f2f] text-white px-2 py-1 rounded-md font-bold font-mono">
                                            ACTIVO
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col items-center gap-4 mb-4">
                                    <div className="w-24 h-24 rounded-full bg-gray-50 border-2 border-[#d9a65a]/20 flex items-center justify-center overflow-hidden relative group">
                                        {(memberAvatar || currentMember?.avatar_url) ? (
                                            <img src={memberAvatar || currentMember?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <Users size={32} className="text-gray-300" />
                                        )}
                                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Upload size={20} className="text-white" />
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                title="Carregar nova foto"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const fileName = `avatars/${Date.now()}_${file.name}`;
                                                    const { error } = await supabase.storage.from('products').upload(fileName, file);
                                                    if (error) return alert('Erro: ' + error.message);
                                                    const url = getPublicUrlSafely('products', fileName);
                                                    setMemberAvatar(url);
                                                }}
                                            />
                                        </label>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foto de Perfil</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                    <input required name="name" title="Nome Completo" defaultValue={currentMember?.name} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Utilizador (Login)</label>
                                    <input required name="username" title="Nome de Utilizador" defaultValue={currentMember?.username} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Para Recuperação)</label>
                                    <input name="email" title="Email" defaultValue={currentMember?.email} type="email" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Palavra-passe {currentMember && '(Opcional se não quiser alterar)'}</label>
                                    <input name="password" title="Palavra-passe" type="password" required={!currentMember} placeholder={currentMember ? 'Deixar em branco para manter a atual' : ''} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Papel / Acesso</label>
                                    <select required name="role" title="Papel / Acesso" defaultValue={currentMember?.role || 'staff'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none">
                                        <option value="admin">Administrador Geral</option>
                                        <option value="it">Suporte TI</option>
                                        <option value="staff">Equipa (Staff)</option>
                                        <option value="vendas">Vendas</option>
                                        <option value="driver">Motorista (Parceiro Drive)</option>
                                        <option value="kitchen">Cozinha</option>
                                    </select>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-xl hover:bg-[#c89549] transition-colors shadow-lg flex justify-center items-center gap-2">
                                        {isSubmitting ? <span className="w-4 h-4 border-2 border-[#3b2f2f] border-t-transparent rounded-full animate-spin"></span> : 'Guardar Membro'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeView === 'messages' && (
                        <div className="h-[calc(100vh-140px)] animate-fade-in flex border border-[#3b2f2f]/10 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm shadow-2xl">
                            {/* Mail Sidebar */}
                            <div className="w-16 md:w-48 bg-[#3b2f2f] text-white flex flex-col p-2 md:p-4 gap-2 border-r border-white/10 shrink-0">
                                <button onClick={() => { setIsComposingEmail(true); setSelectedMessage(null); }} className={`flex items-center justify-center md:justify-start gap-3 p-3 mb-2 rounded-xl transition-all ${isComposingEmail ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'bg-white/10 text-white hover:bg-[#d9a65a] hover:text-[#3b2f2f] hover:shadow-lg'}`}>
                                    <Plus size={18} /> <span className="hidden md:inline">Compor Email</span>
                                </button>
                                <button onClick={() => { setMessageFolder('inbox'); setIsComposingEmail(false); }} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${messageFolder === 'inbox' && !isComposingEmail ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Mail size={18} /> <span className="hidden md:inline">Entrada</span>
                                </button>
                                <button onClick={() => { setMessageFolder('sent'); setIsComposingEmail(false); }} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${messageFolder === 'sent' && !isComposingEmail ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Send size={18} /> <span className="hidden md:inline">Enviados</span>
                                </button>
                                <button onClick={() => { setMessageFolder('trash'); setIsComposingEmail(false); }} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${messageFolder === 'trash' && !isComposingEmail ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Trash2 size={18} /> <span className="hidden md:inline">Lixo</span>
                                </button>
                                <button onClick={() => setActiveView('settings')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeView === 'settings' ? 'bg-[#d9a65a] text-[#3b2f2f] font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <Sparkles size={18} /> <span className="hidden md:inline">Definições</span>
                                </button>
                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <button onClick={() => loadMessages()} className="w-full flex items-center gap-3 p-3 text-gray-400 hover:text-[#d9a65a] transition-all text-xs uppercase font-bold tracking-widest">
                                        <Clock size={16} /> <span className="hidden md:inline">Atualizar</span>
                                    </button>
                                </div>
                            </div>

                            {/* Message List */}
                            <div className={`flex-1 transition-all flex h-full ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
                                <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col bg-white">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-[#3b2f2f] uppercase tracking-wider text-[10px]">
                                            {messageFolder === 'inbox' ? 'Caixa de Entrada' : messageFolder === 'sent' ? 'Mensagens Enviadas' : 'Lixeira'}
                                        </h3>
                                        <span className="text-[10px] bg-[#d9a65a]/20 text-[#3b2f2f] px-2 py-0.5 rounded-full font-bold">
                                            {messages.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                                        {messages.length === 0 ? (
                                            <div className="p-12 text-center flex flex-col items-center gap-4 text-gray-300">
                                                <div className="p-4 bg-gray-50 rounded-full"><Mail size={32} /></div>
                                                <p className="text-sm italic">Vazio...</p>
                                            </div>
                                        ) : (
                                            messages.map((msg: any) => (
                                                <div
                                                    key={msg.id}
                                                    onClick={async () => {
                                                        setSelectedMessage(msg);
                                                        setIsComposingEmail(false);
                                                        if (msg.status === 'unread') {
                                                            await supabase.from('contact_messages').update({ status: 'read' }).eq('id', msg.id);
                                                            // Update local state instead of full reload for smoother UX
                                                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
                                                        }
                                                    }}
                                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-[#f7f1eb]/50 transition-all relative group ${selectedMessage?.id === msg.id ? 'bg-[#f7f1eb] border-l-4 border-l-[#d9a65a]' : ''} ${msg.status === 'unread' ? 'bg-[#d9a65a]/5 shadow-inner' : ''}`}
                                                >
                                                    {msg.status === 'unread' && <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>}
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-[9px] uppercase font-bold tracking-tighter ${msg.status === 'unread' ? 'text-[#d9a65a]' : 'text-gray-400'}`}>
                                                            {new Date(msg.created_at).toLocaleDateString('pt-PT')}
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm truncate pr-4 ${msg.status === 'unread' ? 'font-black text-[#3b2f2f]' : 'text-[#3b2f2f]/80'}`}>{msg.name}</p>
                                                    <p className="text-[11px] text-gray-400 truncate mt-0.5 group-hover:text-gray-600 transition-colors">
                                                        {messageFolder === 'sent' && msg.reply_content ? `Re: ${msg.reply_content}` : msg.message}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Message Detail View */}
                            <div className={`flex-[2] bg-white h-full flex flex-col ${(selectedMessage || isComposingEmail) ? 'flex' : 'hidden lg:flex'}`}>
                                {isComposingEmail ? (
                                    <div className="flex flex-col h-full animate-fade-in bg-[#fcfbf9]">
                                        {/* Header */}
                                        <div className="p-6 border-b border-gray-100 bg-white flex flex-wrap gap-4 justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => setIsComposingEmail(false)} aria-label="Cancelar" className="lg:hidden p-2 text-gray-400 hover:text-[#3b2f2f] hover:bg-gray-100 rounded-full transition-all"><ChevronLeft size={20} /></button>
                                                <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Compor Nova Mensagem</h2>
                                            </div>
                                            <button onClick={() => setIsComposingEmail(false)} className="hidden lg:flex p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><X size={20} /></button>
                                        </div>
                                        <div className="flex-[1] p-8 overflow-y-auto custom-scrollbar">
                                            <div className="max-w-3xl mx-auto bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-[0_10px_40px_rgba(217,166,90,0.05)] text-[#3b2f2f]">
                                                <form onSubmit={async (e: any) => {
                                                    e.preventDefault();
                                                    const to = (e.target as any).to.value;
                                                    const subject = (e.target as any).subject.value;
                                                    const body = (e.target as any).body.value;
                                                    if (!to || !subject || !body) return;

                                                    const fileInput = (e.target as any).attachments as HTMLInputElement;
                                                    const files = fileInput.files;
                                                    const parsedAttachments: any[] = [];
                                                    
                                                    if (files && files.length > 0) {
                                                        for(let i=0; i<files.length; i++) {
                                                            const file = files[i];
                                                            const base64 = await new Promise<string>((resolve) => {
                                                                const reader = new FileReader();
                                                                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                                                                reader.readAsDataURL(file);
                                                            });
                                                            parsedAttachments.push({ filename: file.name, content: base64 });
                                                        }
                                                    }

                                                    setIsSubmitting(true);
                                                    try {
                                                        const { sendEmail } = await import('../services/email');
                                                        const emailHtml = `
                                                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #d9a65a; padding: 20px; border-radius: 10px;">
                                                                <h2 style="color: #3b2f2f; margin-top: 0;">${subject}</h2>
                                                                <p style="white-space: pre-wrap; font-size: 16px; line-height: 1.5; color: #444;">${body}</p>
                                                                <hr style="border-top: 1px solid #eee; margin: 30px 0 20px;">
                                                                <p style="font-size: 12px; color: #999; text-align: center;">Pão Caseiro - O Sabor que Aquece o Coração</p>
                                                            </div>
                                                        `;
                                                        
                                                        const result = await sendEmail(
                                                            [to], 
                                                            subject, 
                                                            emailHtml, 
                                                            undefined, 
                                                            undefined, 
                                                            [], 
                                                            parsedAttachments
                                                        );
                                                        
                                                        if (result.success) {
                                                            alert('Email enviado com sucesso!');
                                                            setIsComposingEmail(false);
                                                        } else {
                                                            alert('Erro ao enviar email: ' + result.error);
                                                        }
                                                    } catch (err: any) {
                                                        alert('Erro interno: ' + err.message);
                                                    } finally {
                                                        setIsSubmitting(false);
                                                    }
                                                }} className="flex flex-col gap-6">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-4 mb-2 block">Para (Email de Destino)</label>
                                                        <input name="to" type="email" required placeholder="cliente@exemplo.com" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#d9a65a] transition-all font-medium text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-4 mb-2 block">Assunto</label>
                                                        <input name="subject" type="text" required placeholder="Exemplo: Resposta à sua Sugestão" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#d9a65a] transition-all font-medium text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-4 mb-2 block">Mensagem</label>
                                                        <textarea name="body" rows={12} required placeholder="Escreva a mensagem aqui..." className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none focus:border-[#d9a65a] transition-all resize-none text-sm leading-relaxed custom-scrollbar shadow-inner"></textarea>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-4 mb-2 block flex items-center gap-2"><Paperclip size={12}/> Anexos <span className="text-gray-300 normal-case tracking-normal">(Opcional)</span></label>
                                                        <input name="attachments" type="file" multiple className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#d9a65a] transition-all text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#d9a65a]/10 file:text-[#3b2f2f] hover:file:bg-[#d9a65a]/20 cursor-pointer" />
                                                    </div>
                                                    <div className="flex justify-end pt-4">
                                                        <button
                                                            type="submit"
                                                            disabled={isSubmitting}
                                                            className="bg-[#3b2f2f] text-[#d9a65a] px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#d9a65a] hover:text-[#3b2f2f] hover:scale-105 active:scale-100 transition-all flex items-center gap-3 shadow-[0_10px_20px_rgba(59,47,47,0.2)] disabled:opacity-50 disabled:scale-100"
                                                        >
                                                            {isSubmitting ? <span className="w-4 h-4 border-2 border-[#d9a65a] border-t-transparent rounded-full animate-spin"></span> : <><Send size={14} /> Enviar Confirmação</>}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                ) : selectedMessage ? (
                                    <div className="flex flex-col h-full animate-fade-in">
                                        {/* Header */}
                                        <div className="p-6 border-b border-gray-100 bg-[#fcfbf9] flex flex-wrap gap-4 justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => setSelectedMessage(null)} aria-label="Voltar para lista" className="lg:hidden p-2 text-gray-400 hover:text-[#3b2f2f] hover:bg-gray-100 rounded-full transition-all"><ChevronLeft size={20} /></button>
                                                <div>
                                                    <h2 className="text-2xl font-serif font-bold text-[#3b2f2f] mb-1">{selectedMessage.name}</h2>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="text-sm font-medium bg-[#d9a65a]/10 text-[#3b2f2f] px-3 py-1 rounded-full">{selectedMessage.email}</span>
                                                        <span className="text-sm text-gray-400">•</span>
                                                        <span className="text-sm text-gray-500 font-mono">{selectedMessage.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const newStatus = selectedMessage.status === 'unread' ? 'read' : 'unread';
                                                        await supabase.from('contact_messages').update({ status: newStatus }).eq('id', selectedMessage.id);
                                                        loadMessages();
                                                        setSelectedMessage({ ...selectedMessage, status: newStatus });
                                                    }}
                                                    title={selectedMessage.status === 'unread' ? "Marcar como lida" : "Marcar como não lida"}
                                                    className={`p-2 rounded-xl border transition-all ${selectedMessage.status === 'unread' ? 'bg-[#d9a65a] text-[#3b2f2f] border-transparent shadow-lg' : 'hover:bg-white border-gray-100 text-gray-400 hover:text-[#d9a65a] bg-gray-50'}`}
                                                >
                                                    {selectedMessage.status === 'unread' ? <CheckCircle size={20} /> : <Mail size={20} />}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Deseja mover esta mensagem para o lixo?')) return;
                                                        await supabase.from('contact_messages').update({ status: 'trash' }).eq('id', selectedMessage.id);
                                                        loadMessages();
                                                        setSelectedMessage(null);
                                                    }}
                                                    title="Mover para o Lixo"
                                                    className="p-2 hover:bg-red-500 hover:text-white rounded-xl border border-gray-100 transition-all text-gray-400 bg-gray-50"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-8 overflow-y-auto bg-gray-50/20 custom-scrollbar">
                                            <div className="max-w-3xl mx-auto">
                                                <div className="bg-white p-10 rounded-[2.5rem] border border-[#d9a65a]/10 shadow-[0_10px_40px_rgba(217,166,90,0.05)] text-[#3b2f2f] relative group">
                                                    <div className="absolute top-8 left-8 text-[#d9a65a]/10 group-hover:text-[#d9a65a]/20 transition-colors"><Sparkles size={48} /></div>
                                                    <div className="relative z-10">
                                                        <div className="flex items-center gap-2 mb-6 text-gray-300">
                                                            <div className="h-px w-8 bg-gray-100"></div>
                                                            <span className="uppercase tracking-[0.2em] text-[10px] font-bold italic">Mensagem Original</span>
                                                            <div className="h-px flex-1 bg-gray-100"></div>
                                                        </div>
                                                        <p className="text-lg leading-relaxed font-serif text-[#3b2f2f]/90 whitespace-pre-wrap">
                                                            {messageFolder === 'sent' && selectedMessage.reply_content ? selectedMessage.reply_content : selectedMessage.message}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Reply Editor */}
                                                <div className="mt-12 pt-12 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <h4 className="text-sm uppercase font-black tracking-[0.2em] text-[#3b2f2f] flex items-center gap-3">
                                                            <div className="p-2 bg-[#d9a65a] text-[#3b2f2f] rounded-lg shadow-lg"><Send size={18} /></div>
                                                            Enviar Resposta
                                                        </h4>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">Email: {selectedMessage.email}</span>
                                                    </div>
                                                    <form onSubmit={async (e: any) => {
                                                        e.preventDefault();
                                                        const response = (e.target as any).response.value;
                                                        if (!response) return;

                                                        setIsSubmitting(true);
                                                        try {
                                                            const { sendEmail } = await import('../services/email');
                                                            const emailHtml = `
                                                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #d9a65a; padding: 20px; border-radius: 10px;">
                                                                    <h2 style="color: #3b2f2f;">Re: Contacto Pão Caseiro</h2>
                                                                    <p>Olá ${selectedMessage.name},</p>
                                                                    <p>${response}</p>
                                                                    <hr style="border-top: 1px solid #eee; margin: 20px 0;">
                                                                    <p style="font-style: italic; color: #666;">A sua mensagem original:</p>
                                                                    <blockquote style="border-left: 3px solid #d9a65a; padding-left: 10px; margin-left: 0; color: #555;">${selectedMessage.message}</blockquote>
                                                                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                                                                        Equipa Pão Caseiro, Lichinga - Moçambique.
                                                                    </p>
                                                                </div>
                                                            `;

                                                            const result = await sendEmail([selectedMessage.email], 'Resposta: Contacto Pão Caseiro', emailHtml, undefined, 'admin@paocaseiro.co.mz');

                                                            if (result.success) {
                                                                await supabase.from('contact_messages').update({ status: 'replied', reply_content: response }).eq('id', selectedMessage.id);
                                                                alert('Mensagem enviada com sucesso!');
                                                                (e.target as any).reset();
                                                                loadMessages();
                                                                setSelectedMessage(null);
                                                            } else {
                                                                alert('Erro ao enviar email: ' + result.error);
                                                            }
                                                        } catch (err: any) {
                                                            alert('Erro interno: ' + err.message);
                                                        } finally {
                                                            setIsSubmitting(false);
                                                        }
                                                    }}>
                                                        <div className="relative">
                                                            <textarea
                                                                name="response"
                                                                rows={8}
                                                                placeholder={`Prezado(a) ${selectedMessage.name}, ...`}
                                                                className="w-full p-8 bg-white border border-gray-100 rounded-[2rem] focus:border-[#d9a65a] focus:ring-8 focus:ring-[#d9a65a]/5 outline-none transition-all text-sm leading-relaxed shadow-sm resize-none"
                                                            ></textarea>
                                                            <div className="absolute bottom-6 right-6">
                                                                <button
                                                                    type="submit"
                                                                    disabled={isSubmitting}
                                                                    className="bg-[#3b2f2f] text-[#d9a65a] px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#d9a65a] hover:text-[#3b2f2f] hover:translate-y-[-2px] active:translate-y-0 transition-all flex items-center gap-3 shadow-[0_10px_20px_rgba(59,47,47,0.2)] disabled:opacity-50 disabled:translate-y-0"
                                                                >
                                                                    {isSubmitting ? <span className="w-4 h-4 border-2 border-[#d9a65a] border-t-transparent rounded-full animate-spin"></span> : <><Send size={14} /> Enviar Resposta</>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/40 relative overflow-hidden">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] scale-150 pointer-events-none">
                                            <ShoppingBag size={400} />
                                        </div>
                                        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-[#d9a65a] shadow-2xl mb-8 border border-[#d9a65a]/10 relative z-10">
                                            <Mail size={48} />
                                        </div>
                                        <h3 className="text-3xl font-serif font-black text-[#3b2f2f] mb-4 relative z-10">Correio Interno</h3>
                                        <p className="text-gray-400 max-w-sm mx-auto text-sm leading-relaxed font-medium relative z-10">Explore e gira as comunicações com os seus clientes num ambiente premium e organizado.</p>
                                        <div className="mt-10 flex gap-4 relative z-10">
                                            <div className="px-5 py-2 bg-white rounded-full border border-gray-100 shadow-sm flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"><div className="w-2 h-2 bg-[#d9a65a] rounded-full"></div> {messages.filter(m => m.status === 'unread').length} Pendentes</div>
                                            <div className="px-5 py-2 bg-white rounded-full border border-gray-100 shadow-sm flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"><Clock size={12} className="text-[#d9a65a]" /> {messages.length} Total</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Support & AI View */}
                {
                    activeView === 'support_ai' && (
                        <div className="h-[calc(100vh-140px)] animate-fade-in flex flex-col gap-6">
                            <AdminSupportAI
                                userName={localStorage.getItem('admin_user') || 'Admin'}
                                stats={{
                                    totalSales: salesData.reduce((acc, curr) => acc + (curr.value || 0), 0),
                                    totalOrders,
                                    pendingOrders,
                                    lowStockCount: lowStockProducts,
                                    unavailableProducts: filteredProducts.filter(p => !p.inStock).map(p => p.name)
                                }}
                            />

                            {/* Zaiv Contacts */}
                            <div className="bg-[#3b2f2f] p-6 rounded-2xl text-white shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-serif font-bold flex items-center gap-2"><Sparkles className="text-[#d9a65a]" /> Suporte IT (Zyph Tech, Lda)</h3>
                                    <button onClick={() => setIsSupportTicketOpen(true)} className="bg-[#d9a65a] text-[#3b2f2f] px-4 py-2 rounded-lg text-xs font-bold hover:bg-white transition-colors flex items-center gap-2">
                                        <MessageSquare size={16} /> Abrir Ticket
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <a href="https://wa.me/258863242532" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
                                        <div className="bg-[#25D366] p-2 rounded-full text-white"><MessageSquare size={24} /></div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-300 uppercase">WhatsApp Suporte</p>
                                            <p className="text-lg font-bold group-hover:text-[#d9a65a] transition-colors">+258 86 324 2532</p>
                                        </div>
                                    </a>
                                    <a href="https://wa.me/918725861829" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
                                        <div className="bg-[#25D366] p-2 rounded-full text-white"><MessageSquare size={24} /></div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-300 uppercase">WhatsApp India</p>
                                            <p className="text-lg font-bold group-hover:text-[#d9a65a] transition-colors">+91 87258 61829</p>
                                        </div>
                                    </a>
                                    <a href="mailto:support@zyph.co.in" className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-4 transition-all group cursor-pointer border border-transparent hover:border-[#d9a65a]/50">
                                        <div className="bg-blue-500 p-2 rounded-full text-white"><Mail size={24} /></div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-300 uppercase">Email Suporte</p>
                                            <p className="text-lg font-bold group-hover:text-[#d9a65a] transition-colors">support@zyph.co.in</p>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>

                    )
                }

                {/* Kitchen View */}
                {
                    activeView === 'kitchen' && (
                        <div className="h-full">
                            <Kitchen user={{
                                id: userId || 'admin',
                                name: localStorage.getItem('admin_user') || 'Administrador',
                                role: 'admin'
                            }} />
                        </div>
                    )
                }


                {/* Logistics View */}





                {/* User Profile Modal */}
                {
                    showUserModal && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold font-serif text-[#3b2f2f]">Editar Perfil</h3>
                                    <button onClick={() => setShowUserModal(false)} title="Fechar" className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                                        <input required type="text" title="Nome" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto de Perfil</label>
                                        <div className="flex items-center gap-3">
                                            {userForm.photo && <img src={userForm.photo} alt="Foto de Perfil" className="w-12 h-12 rounded-full object-cover border border-gray-200" />}
                                            <label className="flex-1 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 text-center text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                                <span className="flex items-center justify-center gap-2"><Upload size={16} /> Carregar Foto</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                placeholder="Deixe em branco para manter"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#d9a65a] outline-none pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#d9a65a]"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            value={userForm.confirmPassword}
                                            onChange={e => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                                            placeholder="Repita a senha"
                                            className={`w-full p-3 bg-gray-50 border rounded-xl focus:border-[#d9a65a] outline-none ${userForm.password && userForm.password !== userForm.confirmPassword ? 'border-red-500' : 'border-gray-200'}`}
                                        />
                                        {userForm.password && userForm.password !== userForm.confirmPassword && (
                                            <p className="text-red-500 text-xs mt-1 font-bold">As senhas não coincidem</p>
                                        )}
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowUserModal(false)} disabled={isSubmitting} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
                                        <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-xl hover:bg-[#c89549] transition-colors shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {isSubmitting ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-[#3b2f2f] border-t-transparent rounded-full animate-spin"></span>
                                                    Salvando...
                                                </>
                                            ) : (
                                                'Salvar Alterações'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
                {/* Logistics View */}
                {
                    activeView === 'logistics' && (
                        <div className="flex flex-col flex-1 h-full animate-fade-in w-full">
                            {/* Header & Tabs */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 pb-4">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-[#3b2f2f]">Logística</h2>
                                    <p className="text-gray-500 text-sm">Gerencie entregas, motoristas e monitoramento em tempo real.</p>
                                </div>
                                <div className="bg-white p-1 rounded-xl shadow-sm border border-[#d9a65a]/20 flex gap-1">
                                    <button
                                        onClick={() => setLogisticsTab('dashboard')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${logisticsTab === 'dashboard' ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <TrendingUp size={16} /> Dashboard
                                    </button>
                                    <button
                                        onClick={() => setLogisticsTab('deliveries')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${logisticsTab === 'deliveries' ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg initial-scale' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Truck size={16} /> Entregas
                                        {orders.filter(o => o.customer.type === 'delivery' && o.status === 'pending').length > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm ml-1">
                                                {orders.filter(o => o.customer.type === 'delivery' && o.status === 'pending').length}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setLogisticsTab('drivers')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${logisticsTab === 'drivers' ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Users size={16} /> Parceiros (Drive)
                                        <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">{drivers.length}</span>
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT AREA (Full Flex) */}
                            <div className="flex-1 overflow-auto bg-gray-50/30 p-6 md:p-10 relative">

                                {/* TAB 1: DASHBOARD */}
                                {logisticsTab === 'dashboard' && (() => {
                                    const todayStr = new Date().toDateString();
                                    const driverStats = drivers.map((d: any) => {
                                        const dOrders = orders.filter((o: any) => o.driver_id === d.id && o.status === 'completed' && new Date(o.updated_at || o.created_at).toDateString() === todayStr);
                                        const totalDeliveries = dOrders.length;
                                        let avgMins = 0;
                                        if (totalDeliveries > 0) {
                                            const totalMins = dOrders.reduce((sum: number, o: any) => {
                                                const diff = (new Date(o.updated_at || o.created_at).getTime() - new Date(o.created_at).getTime()) / 60000;
                                                return sum + (diff > 0 ? diff : 30);
                                            }, 0);
                                            avgMins = totalMins / totalDeliveries;
                                        }
                                        let rating = 5.0;
                                        if (avgMins > 40) rating = Math.max(1.0, 5.0 - ((avgMins - 40) / 10));
                                        return { ...d, totalDeliveries, avgMins: Math.round(avgMins), rating: rating.toFixed(1) };
                                    });
                                    const bestDriver = [...driverStats].filter(d => d.totalDeliveries > 0).sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating) || b.totalDeliveries - a.totalDeliveries)[0];

                                    return (
                                    <div className="space-y-8 animate-fade-in h-full">
                                        {/* KPI Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-blue-600 font-bold text-xs uppercase mb-1">{currentUserRole === 'driver' ? 'Minhas Entregas' : 'Total Entregas'} (Hoje)</p>
                                                    <h3 className="text-4xl font-bold text-[#3b2f2f]">
                                                        {orders.filter(o => o.customer?.type === 'delivery' && (currentUserRole === 'driver' ? o.driver_id === userId : true)).length}
                                                    </h3>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl text-blue-500 shadow-sm"><Truck size={32} /></div>
                                            </div>
                                            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-orange-600 font-bold text-xs uppercase mb-1">{currentUserRole === 'driver' ? 'Minhas Em Rota' : 'Em Rota (Ativas)'}</p>
                                                    <h3 className="text-4xl font-bold text-[#3b2f2f]">
                                                        {orders.filter(o => ['delivering', 'arrived'].includes(o.status) && (currentUserRole === 'driver' ? o.driver_id === userId : true)).length}
                                                    </h3>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl text-orange-500 shadow-sm"><MapPin size={32} /></div>
                                            </div>
                                            
                                            {currentUserRole !== 'driver' ? (
                                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-green-600 font-bold text-xs uppercase mb-1">Parceiros Livres</p>
                                                        <h3 className="text-4xl font-bold text-[#3b2f2f]">
                                                            {drivers.filter(d => d.status === 'available').length}
                                                        </h3>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-xl text-green-500 shadow-sm"><CheckCircle size={32} /></div>
                                                </div>
                                            ) : (
                                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-green-600 font-bold text-xs uppercase mb-1">Minha Avaliação (Hoje)</p>
                                                        <h3 className="text-4xl font-bold text-[#3b2f2f]">
                                                            {driverStats.find(d => d.id === userId)?.rating || '5.0'}
                                                        </h3>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-xl text-green-500 shadow-sm"><Star size={32} className="fill-current text-yellow-400" /></div>
                                                </div>
                                            )}

                                            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-purple-600 font-bold text-xs uppercase mb-1">Melhor Driver (Hoje)</p>
                                                    <h3 className="text-xl font-bold text-[#3b2f2f] truncate max-w-[120px]" title={bestDriver ? bestDriver.name : ''}>
                                                        {bestDriver ? bestDriver.name : 'N/A'}
                                                    </h3>
                                                    {bestDriver && <p className="text-xs text-purple-600 font-bold mt-1">★ {bestDriver.rating} ({bestDriver.totalDeliveries} entregas)</p>}
                                                </div>
                                                <div className="bg-white p-3 rounded-xl text-purple-500 shadow-sm"><Award size={32} className="text-purple-500" /></div>
                                            </div>
                                        </div>

                                        {/* Action Banner */}
                                        <div className="bg-[#3b2f2f] rounded-2xl p-8 text-white relative overflow-hidden flex items-center justify-between">
                                            <div className="relative z-10 w-2/3">
                                                <h3 className="text-2xl font-bold font-serif text-[#d9a65a] mb-2">Monitoramento de Frota</h3>
                                                <p className="text-gray-300 text-sm mb-6">Acompanhe as entregas em tempo real e gerencie sua equipe de Drive Partners com eficiência.</p>
                                                <button
                                                    onClick={() => setLogisticsTab('deliveries')}
                                                    className="bg-[#d9a65a] text-[#3b2f2f] px-6 py-3 rounded-xl font-bold shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
                                                >
                                                    <Truck size={18} /> Ver Entregas em Curso
                                                </button>
                                            </div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#d9a65a]/20 to-transparent"></div>
                                            <MapPin size={180} className="absolute -right-10 -bottom-10 text-white/5" />
                                        </div>

                                        {/* Daily Report Table */}
                                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 mt-8">
                                            <h3 className="text-xl font-bold font-serif text-[#3b2f2f] mb-6">Relatório de Entregas Hoje</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-[#f7f1eb] text-[#3b2f2f] font-bold text-[10px] uppercase tracking-widest rounded-t-xl">
                                                        <tr>
                                                            <th className="p-4 rounded-tl-xl border-b border-[#d9a65a]/20">Pedido / Cliente</th>
                                                            <th className="p-4 border-b border-[#d9a65a]/20">Horários</th>
                                                            {currentUserRole !== 'driver' && <th className="p-4 border-b border-[#d9a65a]/20">Motorista</th>}
                                                            <th className="p-4 text-right border-b border-[#d9a65a]/20">Valor Pago</th>
                                                            {currentUserRole !== 'driver' && <th className="p-4 text-right rounded-tr-xl border-b border-[#d9a65a]/20">Custo Entrega</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {orders.filter(o => o.customer?.type === 'delivery' && o.status === 'completed' && new Date(o.updated_at || o.created_at).toDateString() === todayStr && (currentUserRole === 'driver' ? o.driver_id === userId : true)).map(order => {
                                                            const orderTime = new Date(order.created_at);
                                                            const deliveryTime = new Date(order.updated_at || order.created_at);
                                                            const diffMins = Math.round((deliveryTime.getTime() - orderTime.getTime()) / 60000);
                                                            const driver = drivers.find(d => d.id === order.driver_id);
                                                            return (
                                                                <tr key={order.orderId} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="p-4">
                                                                        <span className="font-bold text-[#3b2f2f]">#{order.short_id || order.orderId}</span>
                                                                        <div className="text-xs text-gray-500 mt-1 uppercase font-bold">{order.customer?.name || order.customer_name}</div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <div className="text-[11px] mb-1">
                                                                            <span className="text-gray-400">Pedido:</span> <span className="font-bold text-[#3b2f2f] ml-1">{orderTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                        </div>
                                                                        <div className="text-[11px] mb-1">
                                                                            <span className="text-gray-400">Entregue:</span> <span className="font-bold text-green-600 ml-1">{deliveryTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                        </div>
                                                                        <div className="inline-block text-[10px] font-bold bg-[#d9a65a]/20 text-[#3b2f2f] px-2 py-0.5 rounded-full mt-1">
                                                                            ⏱ {diffMins > 0 ? diffMins : '?'} min
                                                                        </div>
                                                                    </td>
                                                                    {currentUserRole !== 'driver' && (
                                                                        <td className="p-4 font-bold text-sm text-[#3b2f2f]">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs overflow-hidden">
                                                                                    {driver?.avatar_url ? <img src={driver.avatar_url} className="w-full h-full object-cover"/> : driver?.name?.charAt(0).toUpperCase() || '?'}
                                                                                </div>
                                                                                {driver?.name || 'N/A'}
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                    <td className="p-4 text-right">
                                                                        <span className="font-bold text-lg text-green-600 block">{Number(order.total_amount || order.total || 0).toLocaleString()} MT</span>
                                                                    </td>
                                                                    {currentUserRole !== 'driver' && (
                                                                        <td className="p-4 text-right">
                                                                            <span className="font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">{Number(order.delivery_fee || 0).toLocaleString()} MT</span>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                        {orders.filter(o => o.customer?.type === 'delivery' && o.status === 'completed' && new Date(o.updated_at || o.created_at).toDateString() === todayStr && (currentUserRole === 'driver' ? o.driver_id === userId : true)).length === 0 && (
                                                            <tr><td colSpan={currentUserRole === 'driver' ? 3 : 5} className="p-8 text-center text-gray-400 font-bold bg-gray-50">Nenhum histórico hoje.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                    </div>
                                    );
                                })()}

                                {/* TAB 2: DELIVERIES */}
                                {logisticsTab === 'deliveries' && (
                                    <div className="space-y-6 animate-fade-in h-full">
                                        {(() => {
                                            const visibleOrders = currentUserRole === 'driver'
                                                ? orders.filter(o => o.driver_id === userId) // Ensure userId matches team_member.id
                                                : orders; // Admin sees all

                                            const pendingList = orders.filter(o => o.customer.type === 'delivery' && (o.status === 'pending' || o.status === 'ready' && !o.driver_id));
                                            const activeDeliveries = visibleOrders.filter(o => o.status === 'delivering' || o.status === 'arrived');
                                            const completedList = visibleOrders.filter(o => o.customer.type === 'delivery' && o.status === 'completed');

                                            return (
                                                <>
                                                    {/* MAP TRACKING (Only if drivers have coords) */}
                                                    {activeDeliveries.length > 0 && drivers.some((d: any) => d.lat && d.lng) && (
                                                        <div className="w-full h-[350px] mb-8 rounded-3xl overflow-hidden shadow-lg border-4 border-white relative z-0">
                                                            <div className="absolute top-4 right-4 z-[400] bg-white text-[#3b2f2f] px-3 py-1.5 rounded-full shadow-md text-[10px] font-bold flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                                Live Tracking GPS
                                                            </div>
                                                            <MapContainer center={[-13.3106, 35.2489]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                                                                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                                                {drivers.filter((d: any) => d.lat && d.lng).map((driver: any) => {
                                                                    const drvActive = activeDeliveries.find(o => o.driver_id === driver.id);
                                                                    return (
                                                                        <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={driverIcon}>
                                                                            <Popup>
                                                                                <div className="text-center">
                                                                                    <p className="font-bold text-[#3b2f2f]">{driver.name}</p>
                                                                                    {drvActive ? (
                                                                                        <>
                                                                                            <p className="text-xs text-orange-600 font-bold mt-1">A Entregar: #{drvActive.short_id}</p>
                                                                                            <p className="text-[10px] text-gray-500">{drvActive.customer.name}</p>
                                                                                        </>
                                                                                    ) : (
                                                                                        <p className="text-xs text-gray-500 mt-1">Disponível</p>
                                                                                    )}
                                                                                </div>
                                                                            </Popup>
                                                                        </Marker>
                                                                    );
                                                                })}
                                                                {activeDeliveries.map(order => {
                                                                    if(order.delivery_coordinates && order.delivery_coordinates !== '()') {
                                                                        const match = order.delivery_coordinates.replace(/[()]/g, '').split(',').map((s: string) => parseFloat(s.trim()));
                                                                        if (match.length === 2 && !isNaN(match[0]) && !isNaN(match[1])) {
                                                                            return (
                                                                                <Marker key={`dest-${order.id}`} position={[match[0], match[1]]} icon={mapPinIcon}>
                                                                                    <Popup>
                                                                                        <div className="text-center">
                                                                                            <p className="font-bold text-[#3b2f2f]">Destino #{order.short_id}</p>
                                                                                            <p className="text-xs text-gray-500 mt-1">{order.customer.address}</p>
                                                                                        </div>
                                                                                    </Popup>
                                                                                </Marker>
                                                                            );
                                                                        }
                                                                    }
                                                                    return null;
                                                                })}
                                                            </MapContainer>
                                                        </div>
                                                    )}

                                                    {/* ACTIVE DELIVERIES (Highlighted) */}
                                                    <div className="space-y-4">
                                                        <h3 className="font-bold text-[#3b2f2f] text-lg flex items-center gap-2">
                                                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                                            Em Rota / A Entregar
                                                            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">{activeDeliveries.length}</span>
                                                        </h3>

                                                        {activeDeliveries.length === 0 ? (
                                                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                                                                <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                                <p>Nenhuma entrega em curso no momento.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {activeDeliveries.map(order => (
                                                                    <div key={order.orderId} className={`bg-white border rounded-xl p-4 shadow-lg ring-1 relative overflow-hidden group hover:-translate-y-1 transition-all ${order.status === 'arrived' ? 'border-green-200 ring-green-50' : 'border-blue-200 ring-blue-50'}`}>
                                                                        <div className={`absolute top-0 right-0 p-2 text-white text-[10px] font-bold rounded-bl-xl uppercase ${order.status === 'arrived' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                                                            {order.status === 'arrived' ? 'CHEGOU' : 'EM ROTA'}
                                                                        </div>
                                                                        <h4 className="font-bold text-[#3b2f2f] text-lg mb-1">Pedido #{order.orderId}</h4>
                                                                        <div className="text-sm text-gray-600 mb-4 space-y-1">
                                                                            <p className="font-bold">{order.customer.name}</p>
                                                                            <p className="text-xs text-gray-500">{order.customer.phone}</p>
                                                                            <p className="flex items-start gap-1 bg-gray-50 p-2 rounded text-xs mt-2 text-blue-800"><MapPin size={14} className="shrink-0" /> {order.customer.address}</p>
                                                                        </div>

                                                                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                                                            <a
                                                                                href={`https://wa.me/258${order.customer.phone.replace(/\D/g, '')}`}
                                                                                target="_blank"
                                                                                className="flex-1 bg-green-50 text-green-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-green-100"
                                                                            >
                                                                                <MessageCircle size={14} /> WhatsApp
                                                                            </a>
                                                                            <button
                                                                                onClick={() => handleCompleteDelivery(order)}
                                                                                className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md hover:brightness-110"
                                                                            >
                                                                                <CheckCircle size={14} /> Finalizar (OTP)
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* PENDING (Admin Only) */}
                                                    {(currentUserRole === 'admin' || currentUserRole === 'it') && (
                                                        <div className="space-y-4 pt-8 border-t border-gray-100">
                                                            <h3 className="font-bold text-gray-400 text-sm uppercase flex items-center gap-2">
                                                                <Clock size={16} /> Pendentes de Atribuição
                                                                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{pendingList.length}</span>
                                                            </h3>
                                                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                                <table className="w-full text-left text-sm">
                                                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                                                        <tr><th className="p-4">ID</th><th className="p-4">Cliente</th><th className="p-4">Logradouro</th><th className="p-4 text-right">Ação</th></tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {pendingList.map(order => (
                                                                            <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                                                                                <td className="p-4 font-bold">{order.orderId}</td>
                                                                                <td className="p-4">
                                                                                    <div className="font-bold">{order.customer.name}</div>
                                                                                    <div className="text-xs text-gray-500">{order.customer.phone}</div>
                                                                                </td>
                                                                                <td className="p-4 text-gray-500 truncate max-w-[200px]">{order.customer.address || 'N/A'}</td>
                                                                                <td className="p-4 text-right">
                                                                                    <button onClick={() => setOrderToAssign(order)} className="bg-[#3b2f2f] text-[#d9a65a] px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg">Atribuir</button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {pendingList.length === 0 && (
                                                                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Todos os pedidos foram atribuídos.</td></tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* History (Completed) */}
                                                    <div className="pt-8">
                                                        <button onClick={() => { /* Toggle History? For now static */ }} className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2 hover:text-[#d9a65a]">
                                                            <Clock size={14} /> Histórico Recente ({completedList.length})
                                                        </button>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* TAB 3: DRIVERS */}
                                {logisticsTab === 'drivers' && (
                                    <div className="space-y-6 animate-fade-in h-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold text-[#3b2f2f]">Parceiros de Entrega ({drivers.length})</h3>
                                            <button onClick={() => setIsAddingDriver(true)} className="bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:brightness-110 flex items-center gap-2">
                                                <Plus size={16} /> Novo Partner
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {drivers.map(driver => (
                                                <div key={driver.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all bg-white flex flex-col justify-between group">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[#3b2f2f] text-lg border-2 border-white shadow-sm overflow-hidden">
                                                                {driver.avatar_url ? (
                                                                    <img src={driver.avatar_url} alt={driver.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    driver.name.charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-[#3b2f2f] leading-tight text-base max-w-[120px] truncate" title={driver.name}>{driver.name}</h4>
                                                                <p className="text-[10px] text-[#d9a65a] font-bold uppercase tracking-widest bg-[#3b2f2f] px-2 py-0.5 rounded-full inline-block mt-1">{driver.vehicle_type || 'Moto'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="relative">
                                                            <select
                                                                value={driver.status}
                                                                title="Status do Motorista"
                                                                onChange={(e) => handleDriverStatusChange(driver.id, e.target.value)}
                                                                className={`px-3 py-1 text-[10px] font-bold uppercase border rounded-full appearance-none pr-6 cursor-pointer outline-none transition-colors ${driver.status === 'available' ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' :
                                                                    driver.status === 'busy' ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' :
                                                                        'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                                                    }`}
                                                            >
                                                                <option value="available">Livre</option>
                                                                <option value="busy">Rota</option>
                                                                <option value="offline">Off</option>
                                                            </select>
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <div className={`w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] ${driver.status === 'available' ? 'border-t-green-700' :
                                                                    driver.status === 'busy' ? 'border-t-orange-700' :
                                                                        'border-t-red-700'
                                                                    }`}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                        <p className="text-xs text-gray-600 flex items-center gap-2 font-medium">
                                                            <Smartphone size={14} className="text-[#d9a65a]" /> {driver.phone}
                                                        </p>
                                                        <p className="text-xs text-gray-600 flex items-center gap-2 font-medium">
                                                            <MapPin size={14} className="text-[#d9a65a]" /> {driver.base_location || 'Sem Base Fixa'}
                                                        </p>
                                                    </div>
                                                    {(() => {
                                                        const dOrders = orders.filter(o => o.driver_id === driver.id);
                                                        const completed = dOrders.filter(o => o.status === 'completed').length;
                                                        const active = dOrders.filter(o => ['delivering', 'arrived'].includes(o.status)).length;

                                                        // Calculate real rating based on ALL completed deliveries for this driver
                                                        const completedOrders = dOrders.filter(o => o.status === 'completed');
                                                        let avgMins = 0;
                                                        if (completed > 0) {
                                                            const totalMins = completedOrders.reduce((sum: number, o: any) => {
                                                                const diff = (new Date(o.updated_at || o.created_at).getTime() - new Date(o.created_at).getTime()) / 60000;
                                                                return sum + (diff > 0 ? diff : 30);
                                                            }, 0);
                                                            avgMins = totalMins / completed;
                                                        }
                                                        let rating = 5.0;
                                                        if (avgMins > 40) rating = Math.max(1.0, 5.0 - ((avgMins - 40) / 10));

                                                        return (
                                                            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mb-4">
                                                                <div className="text-center flex-1 border-r border-gray-100">
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entregas</p>
                                                                    <p className="text-lg font-black text-[#3b2f2f]">{completed}</p>
                                                                </div>
                                                                <div className="text-center flex-1 border-r border-gray-100">
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">A Decorrer</p>
                                                                    <p className="text-lg font-black text-orange-500">{active}</p>
                                                                </div>
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avaliação</p>
                                                                    <p className="text-sm font-black text-yellow-500 mt-1 flex items-center justify-center gap-1" title={`Tempo médio: ${Math.round(avgMins)} min`}>★ {rating.toFixed(1)}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="flex gap-2 border-t border-gray-100 pt-3">
                                                        <button onClick={() => { setSelectedDriver(driver); setDriverForm({ name: driver.name, phone: driver.phone, vehicle: driver.vehicle_type || driver.vehicle || '', base_location: driver.base_location || '', email: driver.email || '', alternative_phone: driver.alternative_phone || '', avatar_url: driver.avatar_url || '' }); setIsAddingDriver(true); }} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs uppercase hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                                                            <Edit3 size={14} /> Editar
                                                        </button>
                                                        <button onClick={() => handleDeleteDriver(driver.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold text-xs uppercase hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                                            <Trash2 size={14} /> Remover
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                {/* POS / Ponto de Venda View */}
                {activeView === 'pos' && (
                    <div className="flex flex-col flex-1 h-[calc(100vh-140px)] animate-fade-in overflow-hidden">
                        {/* Session Management Banner */}
                        {!currentSession ? (
                            <div className="bg-[#3b2f2f] p-8 rounded-3xl text-center mb-6 shadow-2xl border border-[#d9a65a]/20 animate-scale-in">
                                <div className="bg-[#d9a65a]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#d9a65a]/30">
                                    <Lock size={40} className="text-[#d9a65a]" />
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-[#d9a65a] mb-2 text-white">Caixa Fechado</h3>
                                <p className="text-gray-400 mb-6 max-w-sm mx-auto text-sm">Para começar a vender, abra uma nova sessão de caixa. Isto ajudará a rastrear todas as vendas e trocos.</p>
                                <button
                                    onClick={handleOpenSession}
                                    className="bg-[#d9a65a] text-[#3b2f2f] px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_20px_rgba(217,166,90,0.2)]"
                                >
                                    Abrir Novo Caixa
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#d9a65a] p-3 rounded-2xl mb-4 flex justify-between items-center shadow-lg border border-[#3b2f2f]/10">
                                <div className="flex items-center gap-4">
                                    <div className="bg-[#3b2f2f] p-2 rounded-xl text-[#d9a65a] shadow-inner">
                                        <Unlock size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-[#3b2f2f]/60 uppercase leading-none">Sessão Ativa</p>
                                        <p className="text-sm font-bold text-[#3b2f2f]">{new Date(currentSession.opened_at).toLocaleTimeString()} • Resp: {username}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await printerService.openCashDrawer();
                                            } catch (e) {
                                                alert('Erro ao abrir gaveta: ' + (e as Error).message);
                                            }
                                        }}
                                        disabled={!isPrinterConnected}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 ${isPrinterConnected ? 'bg-white text-[#3b2f2f] hover:bg-gray-100' : 'bg-white/50 text-gray-400 cursor-not-allowed grayscale'}`}
                                        title={isPrinterConnected ? 'Abrir Gaveta de Dinheiro' : 'Impressora Desconectada'}
                                    >
                                        <Banknote size={14} /> Gaveta
                                    </button>
                                    <button
                                        onClick={handleCloseSession}
                                        className="bg-[#3b2f2f] text-[#d9a65a] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                                    >
                                        <XCircle size={14} /> Fechar Caixa
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className={`flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden transition-all duration-500 ${!currentSession ? 'blur-md pointer-events-none grayscale opacity-40' : ''}`}>
                            {/* Product Selection Side */}
                            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                                {/* POS Header & Search */}
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100/50 flex flex-col md:flex-row gap-4 items-center justify-center animate-fade-in">
                                    <div className="relative flex-1 group w-full max-w-xl mx-auto">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d9a65a] transition-colors">
                                            <Search size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            ref={searchInputRef}
                                            placeholder="Pesquisar sabor ou código..."
                                            value={posSearchTerm}
                                            onChange={e => setPosSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-transparent rounded-2xl focus:bg-white focus:border-[#d9a65a] focus:ring-4 focus:ring-[#d9a65a]/5 outline-none transition-all font-bold placeholder:text-gray-300 shadow-inner"
                                        />
                                    </div>
                                    <div className="flex gap-2 items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0 px-2">
                                        <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 thin-scrollbar max-w-full md:max-w-[400px]">
                                            <button onClick={() => setPosCategory('all')} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${posCategory === 'all' ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>Todos</button>
                                            {[...new Set(products.map(p => p.category))].map(cat => (
                                                <button key={cat} onClick={() => setPosCategory(cat)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${posCategory === cat ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{cat}</button>
                                            ))}
                                        </div>
                                        <button onClick={() => setShowMassPosModal(true)} className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-[#d9a65a]/10 hover:text-[#d9a65a] transition-all" title="Venda em Massa">
                                            <Plus size={20} />
                                        </button>
                                        {posSearchTerm && (
                                            <button onClick={() => setPosSearchTerm('')} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Limpar pesquisa">
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Product Grid */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
                                    {products.filter(p => p.inStock && (posCategory === 'all' || p.category === posCategory) && (p.name.toLowerCase().includes(posSearchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(posSearchTerm)))).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                                            <Search size={48} className="opacity-20 mb-4" />
                                            <p className="font-bold uppercase tracking-widest text-sm text-gray-400">Nenhum produto encontrado</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {products.filter(p => p.inStock && (posCategory === 'all' || p.category === posCategory) && (p.name.toLowerCase().includes(posSearchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(posSearchTerm)))).map(product => (
                                                <div
                                                    key={product.id}
                                                    onClick={() => {
                                                        setPosCart(prev => {
                                                            const existing = prev.find(item => item.id === product.id);
                                                            if (existing) {
                                                                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
                                                            } else {
                                                                return [...prev, { ...product, quantity: 1, price: Number(product.price) }];
                                                            }
                                                        });
                                                    }}
                                                    className="bg-white p-3 rounded-2xl border border-gray-100 hover:border-[#d9a65a] transition-all group cursor-pointer hover:shadow-xl hover:-translate-y-1 flex flex-col items-center text-center"
                                                >
                                                    <div className="w-full h-24 mb-3 rounded-xl overflow-hidden bg-gray-50 relative">
                                                        <img src={product.image || 'https://via.placeholder.com/150'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        {posSearchTerm && product.name.toLowerCase().includes(posSearchTerm.toLowerCase()) && (
                                                            <div className="absolute top-2 right-2 bg-[#d9a65a] text-white p-1 rounded-full shadow-lg animate-pulse">
                                                                <CheckCircle size={12} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-[#3b2f2f] text-sm line-clamp-2 h-10 mb-1">{product.name.charAt(0).toUpperCase() + product.name.slice(1).toLowerCase()}</h4>
                                                    <p className="text-[#d9a65a] font-bold">{product.price.toLocaleString()} MT</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cart / Checkout Side */}
                            <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-full">
                                <div className="bg-[#3b2f2f] rounded-3xl shadow-2xl flex-1 flex flex-col overflow-hidden text-white border border-white/5">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="text-xl font-serif font-bold text-[#d9a65a] flex items-center gap-2"><ShoppingCart size={24} /> Carrinho POS</h3>
                                        <button onClick={() => setPosCart([])} title="Limpar Carrinho" className="text-white/40 hover:text-red-400 transition-colors"><Trash2 size={20} /></button>
                                    </div>

                                    {/* Cart Items */}
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                        {posCart.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-white/30 text-center gap-4">
                                                <div className="bg-white/5 p-6 rounded-full"><Package size={48} className="opacity-20" /></div>
                                                <p className="text-sm font-bold uppercase tracking-widest">Carrinho Vazio</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {posCart.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl animate-fade-in group">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <p className="font-bold text-sm truncate">{item.name.charAt(0).toUpperCase() + item.name.slice(1).toLowerCase()}</p>
                                                            <p className="text-[#d9a65a] text-xs font-bold">{item.price.toLocaleString()} MT</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => {
                                                                if (item.quantity > 1) {
                                                                    setPosCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                                                                } else {
                                                                    setPosCart(prev => prev.filter(i => i.id !== item.id));
                                                                }
                                                            }} title="Remover um" className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">-</button>
                                                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                                            <button onClick={() => setPosCart(posCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} title="Adicionar mais um" className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">+</button>
                                                            <button onClick={() => setPosCart(posCart.filter(i => i.id !== item.id))} title="Remover item" className="ml-2 text-white/20 hover:text-red-400 transition-opacity"><X size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Details & Summary */}
                                    <div className="p-6 bg-white/5 border-t border-white/10 space-y-4">
                                        {/* Order Type */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={() => setPosOrderType('local')} className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${posOrderType === 'local' ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>Local</button>
                                            <button onClick={() => setPosOrderType('takeaway')} className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${posOrderType === 'takeaway' ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>Takeaway</button>
                                            <button onClick={() => setPosOrderType('dine-in')} className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${posOrderType === 'dine-in' ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>Dine-in</button>
                                        </div>

                                        {/* Customer Selector & Quick Add */}
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <select
                                                        value={posCustomer?.id || ''}
                                                        onChange={(e) => {
                                                            const cust = customers.find(c => c.id === e.target.value);
                                                            setPosCustomer(cust || null);
                                                        }}
                                                        title="Selecionar Cliente"
                                                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm appearance-none pr-10"
                                                    >
                                                        <option value="" className="bg-[#3b2f2f]">Cliente Ocasional (Balcão)</option>
                                                        {customers.map(c => (
                                                            <option key={c.id} value={c.id} className="bg-[#3b2f2f]">
                                                                {c.internal_id ? `[${c.internal_id}] ` : ''}{c.name} ({c.contact_no})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40"><Users size={16} /></div>
                                                </div>
                                                <button
                                                    onClick={() => setIsAddingQuickCustomer(!isAddingQuickCustomer)}
                                                    className={`p-3 rounded-xl border transition-all ${isAddingQuickCustomer ? 'bg-[#d9a65a] border-[#d9a65a] text-[#3b2f2f]' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
                                                    title="Adicionar Novo Cliente"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {isAddingQuickCustomer && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-white/5 rounded-xl border border-white/10"
                                                    >
                                                        <div className="p-4 space-y-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Nome do Cliente"
                                                                value={quickCustomerForm.name}
                                                                onChange={e => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
                                                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                            />
                                                            <input
                                                                type="tel"
                                                                placeholder="Telemóvel"
                                                                value={quickCustomerForm.phone}
                                                                onChange={e => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                                                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                            />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input
                                                                    type="email"
                                                                    placeholder="Email"
                                                                    value={quickCustomerForm.email}
                                                                    onChange={e => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })}
                                                                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="NUIT"
                                                                    value={quickCustomerForm.nuit}
                                                                    onChange={e => setQuickCustomerForm({ ...quickCustomerForm, nuit: e.target.value })}
                                                                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-sm"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!quickCustomerForm.name || !quickCustomerForm.phone) return alert('Preencha nome e telefone!');
                                                                    
                                                                    // Use upsert to handle existing customers by contact_no
                                                                    const { data, error } = await supabase.from('customers').upsert([
                                                                        {
                                                                            name: quickCustomerForm.name,
                                                                            contact_no: quickCustomerForm.phone,
                                                                            phone: quickCustomerForm.phone,
                                                                            email: quickCustomerForm.email,
                                                                            nuit: quickCustomerForm.nuit,
                                                                            updated_at: new Date().toISOString()
                                                                        }
                                                                    ], { onConflict: 'contact_no' }).select().single();

                                                                    if (error) {
                                                                        console.error('Customer upsert error:', error);
                                                                        return alert('Erro ao processar cliente: ' + error.message);
                                                                    }
                                                                    
                                                                    // Update local customers list if it doesn't have this one
                                                                    if (!customers.find(c => c.id === data.id)) {
                                                                        setCustomers([...customers, data]);
                                                                    } else {
                                                                        setCustomers(customers.map(c => c.id === data.id ? data : c));
                                                                    }
                                                                    
                                                                    setPosCustomer(data);
                                                                    setQuickCustomerForm({ name: '', phone: '', email: '', nuit: '' });
                                                                    setIsAddingQuickCustomer(false);
                                                                }}
                                                                className="w-full py-2 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-lg text-xs uppercase"
                                                            >
                                                                Confirmar Cliente
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-white/60 font-bold uppercase text-xs tracking-widest">Total</span>
                                            <span className="text-2xl font-bold text-[#d9a65a]">{posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()} MT</span>
                                        </div>

                                        <button
                                            disabled={posCart.length === 0}
                                            onClick={() => {
                                                setChangeDue(0);
                                                setShowPaymentModal(true);
                                            }}
                                            className="w-full py-4 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                        >
                                            <CreditCard size={24} /> Pagar Agora
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cash Payment Modal */}
                {
                    showPaymentModal && (
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><Banknote size={150} /></div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 relative z-10">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'cash' ? 'bg-[#3b2f2f] border-[#3b2f2f] text-[#d9a65a] shadow-xl scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <Banknote size={24} />
                                        <span className="text-[10px] font-bold uppercase">Dinheiro</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('mpesa')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'mpesa' ? 'bg-[#e31212] border-[#e31212] text-white shadow-xl scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <Smartphone size={24} />
                                        <span className="text-[10px] font-bold uppercase">M-Pesa</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'card' ? 'bg-[#003d71] border-[#003d71] text-white shadow-xl scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <CreditCard size={24} />
                                        <span className="text-[10px] font-bold uppercase">POS/Cartão</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('emola')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'emola' ? 'bg-[#00a1e4] border-[#00a1e4] text-white shadow-xl scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <Smartphone size={24} />
                                        <span className="text-[10px] font-bold uppercase">e-Mola</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('ecash')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'ecash' ? 'bg-[#ffcc00] border-[#ffcc00] text-[#3b2f2f] shadow-xl scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <Key size={24} />
                                        <span className="text-[10px] font-bold uppercase">e-Cash</span>
                                    </button>
                                </div>

                                {paymentMethod === 'cash' && (
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8 relative z-10 animate-fade-in">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total a Pagar</span>
                                            <span className="text-3xl font-black text-[#3b2f2f]">{posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()} MT</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-[#d9a65a] uppercase mb-2 tracking-widest text-center">Valor Recebido em Dinheiro (MT)</label>
                                                <input
                                                    type="number"
                                                    value={splitPayments['cash'] || ''}
                                                    autoFocus
                                                    onChange={e => setSplitPayments(prev => ({...prev, cash: e.target.value}))}
                                                    placeholder="0.00"
                                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl p-6 text-4xl font-black text-center text-[#3b2f2f] focus:border-[#d9a65a] outline-none transition-all shadow-inner"
                                                />
                                            </div>

                                            {/* Quick Cash Buttons */}
                                            <div className="grid grid-cols-4 gap-2">
                                                {[200, 500, 1000, 2000].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setSplitPayments(prev => ({...prev, cash: val}))}
                                                        className="bg-white border border-gray-100 py-3 rounded-xl text-xs font-bold text-[#3b2f2f] hover:bg-[#d9a65a] hover:text-white transition-all shadow-sm"
                                                    >
                                                        {val} MT
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod !== 'cash' && (
                                    <div className="bg-gray-50 p-10 rounded-3xl border border-gray-100 mb-8 relative z-10 animate-fade-in text-center">
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${paymentMethod === 'mpesa' ? 'bg-[#e31212]/10 text-[#e31212]' :
                                            paymentMethod === 'card' ? 'bg-[#003d71]/10 text-[#003d71]' :
                                                paymentMethod === 'emola' ? 'bg-[#00a1e4]/10 text-[#00a1e4]' :
                                                    'bg-[#ffcc00]/10 text-[#ffcc00]'
                                            }`}>
                                            {paymentMethod === 'card' ? <CreditCard size={40} /> : <Smartphone size={40} />}
                                        </div>
                                        <h4 className="text-xl font-bold text-[#3b2f2f] mb-2 uppercase">Confirmar {paymentMethod}</h4>
                                        <p className="text-gray-500 text-sm mb-6">Por favor, introduza o valor pago via {paymentMethod.toUpperCase()} (ou deixe em branco para o total).</p>
                                        <div className="text-3xl font-black text-[#d9a65a] mb-6">
                                            {posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()} MT
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={splitPayments[paymentMethod] || ''}
                                                onChange={e => setSplitPayments(prev => ({...prev, [paymentMethod]: e.target.value}))}
                                                placeholder="Partilhar Pag. (MT) Opcional"
                                                className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 text-2xl font-black text-center text-[#3b2f2f] focus:border-[#d9a65a] outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Show Split Payments Summary if multiple */}
                                {Object.keys(splitPayments).filter(k => Number(splitPayments[k]) > 0).length > 0 && (
                                    <div className="bg-white border-2 border-gray-100 p-4 rounded-2xl mb-6 relative z-10 animate-fade-in">
                                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Pagamentos Adicionados</h5>
                                        <div className="flex flex-col gap-1">
                                            {Object.entries(splitPayments).filter(([k,v]) => Number(v) > 0).map(([k,v]) => (
                                                <div key={k} className="flex justify-between text-sm font-bold text-[#3b2f2f]">
                                                    <span>{k.toUpperCase()}</span>
                                                    <span>{Number(v).toLocaleString()} MT</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between font-black text-[#d9a65a]">
                                            <span>SOMA RECEBIDA</span>
                                            <span>{Object.values(splitPayments).reduce((a: number, b: any) => a + (Number(b)||0), 0).toLocaleString()} MT</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col items-center gap-6 relative z-10">
                                    {(paymentMethod === 'cash' || Object.keys(splitPayments).includes('cash')) && (
                                        <div className="text-center animate-bounce-slow">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-1">Troco a Entregar</p>
                                            <p className={`text-5xl font-black ${changeDue > 0 ? 'text-green-500' : 'text-gray-300'}`}>
                                                {changeDue.toLocaleString()} <span className="text-sm">MT</span>
                                            </p>
                                        </div>
                                    )}

                                    <div className="w-full flex gap-3">
                                        <button
                                            onClick={() => setShowPaymentModal(false)}
                                            className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm uppercase tracking-widest"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            disabled={isSubmitting || (Object.keys(splitPayments).filter(k => Number(splitPayments[k]) > 0).length > 0 && Object.values(splitPayments).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) < posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0))}
                                            onClick={handleProcessPayment}
                                            className="flex-[2] py-4 bg-[#3b2f2f] text-[#d9a65a] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                        >
                                            {isSubmitting ? <span className="w-4 h-4 border-2 border-[#d9a65a] border-t-transparent rounded-full animate-spin"></span> : <><CheckCircle size={20} /> Confirmar ({posCart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()} MT)</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }

                {/* Session Opening Modal */}
                {isOpeningSession && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Unlock size={150} /></div>
                            <h3 className="text-2xl font-serif font-bold text-[#3b2f2f] mb-2 relative z-10">Abertura de Caixa</h3>
                            <p className="text-gray-500 mb-8 text-sm relative z-10">Introduza o saldo inicial para começar a sessão.</p>

                            <div className="space-y-6 relative z-10 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Saldo Inicial (MT)</label>
                                    <input
                                        type="number"
                                        value={initialBalance}
                                        autoFocus
                                        onChange={e => setInitialBalance(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-4xl font-black text-center text-[#3b2f2f] focus:border-[#d9a65a] outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 relative z-10">
                                <button
                                    onClick={() => setIsOpeningSession(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmOpenSession}
                                    className="flex-[1.5] py-4 bg-[#3b2f2f] text-[#d9a65a] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    Abrir Caixa
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Session Closing Modal */}
                {showCloseSessionModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Lock size={150} /></div>
                            <h2 className="text-2xl font-serif font-bold text-[#3b2f2f] mb-2 relative z-10">Fecho de Caixa</h2>
                            <p className="text-gray-500 mb-8 text-sm relative z-10">Confirme o saldo final e adicione observações se necessário.</p>

                            <div className="space-y-6 relative z-10 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Saldo Final em Dinheiro (MT)</label>
                                    <input
                                        type="number"
                                        value={currentBalance}
                                        onChange={e => setCurrentBalance(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-4xl font-black text-center text-[#3b2f2f] focus:border-[#d9a65a] outline-none transition-all shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Observações (Opcional)</label>
                                    <textarea
                                        value={closeNotes}
                                        onChange={e => setCloseNotes(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium text-[#3b2f2f] focus:border-[#d9a65a] outline-none transition-all min-h-[100px]"
                                        placeholder="Ex: Diferença de valores, quebra de stock, etc..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 relative z-10">
                                <button
                                    onClick={() => setShowCloseSessionModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm uppercase tracking-widest"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleConfirmCloseSession}
                                    className="flex-[1.5] py-4 bg-red-500 text-white font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    Confirmar Fecho
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
                {
                    activeView === 'billing' && (
                        <AdminBillingView />
                    )
                }
                {/* Documents / Receipts View */}
                {
                    activeView === 'documents' && (
                        <div className="flex flex-col flex-1 h-[calc(100vh-140px)] animate-fade-in overflow-hidden">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Documentos e Recibos</h2>
                                    <p className="text-gray-400 text-sm">Visualize e re-imprima recibos de vendas anteriores.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const csv = [
                                                ['ID', 'Data', 'Cliente', 'Total (MT)', 'Estado'],
                                                ...orders.filter(o => o.status === 'completed' || o.payment_status === 'paid').map(o => [o.orderId || '', new Date(o.date).toLocaleString() || '', o.customer.name || '', o.total || '', o.status || ''])
                                            ].map(e => e.join(',')).join('\n');
                                            const blob = new Blob([csv], { type: 'text/csv' });
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `documentos_${new Date().toISOString().split('T')[0]}.csv`;
                                            a.click();
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#d9a65a] text-[#d9a65a] rounded-xl text-xs font-bold hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all shadow-sm"
                                    >
                                        <Download size={14} /> Exportar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await printerService.openCashDrawer();
                                            } catch (e) {
                                                alert('Erro ao abrir gaveta: ' + (e as Error).message);
                                            }
                                        }}
                                        disabled={!isPrinterConnected}
                                        className={`p-3 rounded-2xl transition-all shadow-sm ${isPrinterConnected ? 'bg-white border border-[#3b2f2f]/10 text-[#3b2f2f] hover:bg-gray-50' : 'bg-gray-50 text-gray-300 cursor-not-allowed grayscale'}`}
                                        title={isPrinterConnected ? 'Abrir Gaveta de Dinheiro' : 'Impressora Desconectada'}
                                    >
                                        <Banknote size={20} />
                                    </button>
                                    <button onClick={loadOrders} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all text-[#3b2f2f]" title="Atualizar">
                                        <Loader size={20} className={isSubmitting ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 flex-1 overflow-hidden flex flex-col">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">ID / Data</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Cliente</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Tipo</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Total</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {orders.filter(o => o.status === 'completed' || o.payment_status === 'paid').map(order => (
                                                <tr key={order.id} className="hover:bg-gray-50/30 transition-colors group">
                                                    <td className="p-6">
                                                        <p className="font-bold text-[#3b2f2f]">#{order.orderId}</p>
                                                        <p className="text-[10px] text-gray-400 italic">{new Date(order.date).toLocaleString()}</p>
                                                    </td>
                                                    <td className="p-6">
                                                        <p className="font-bold text-[#3b2f2f]">{order.customer.name}</p>
                                                        <p className="text-[10px] text-gray-400">{order.customer.phone}</p>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.customer.type === 'delivery' ? 'bg-blue-100 text-blue-600' :
                                                            order.customer.type === 'pickup' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                                            }`}>
                                                            {order.customer.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <p className="font-black text-[#3b2f2f]">{(order.total || 0).toLocaleString()} MT</p>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                disabled={!isPrinterConnected}
                                                                onClick={async () => {
                                                                    try {
                                                                        const orderItems = order.items.map((i: any) => ({
                                                                            product_name: i.name,
                                                                            price: i.price,
                                                                            quantity: i.quantity
                                                                        }));
                                                                        await printerService.printReceipt({
                                                                            short_id: order.orderId,
                                                                            customer_name: order.customer.name,
                                                                            created_at: order.date,
                                                                            total_amount: order.total,
                                                                            payment_method: 'cash' // Defaulting
                                                                        }, orderItems, printerConfig.paperSize);
                                                                    } catch (e) {
                                                                        alert('Erro ao imprimir: ' + (e as Error).message);
                                                                    }
                                                                }}
                                                                className={`p-2 rounded-xl border transition-all ${isPrinterConnected ? 'bg-[#3b2f2f]/5 text-[#3b2f2f] border-[#3b2f2f]/10 hover:bg-[#3b2f2f] hover:text-[#d9a65a]' : 'text-gray-300 border-gray-100 cursor-not-allowed grayscale bg-gray-50'}`}
                                                                title={isPrinterConnected ? 'Imprimir Recibo' : 'Impressora Desconectada'}
                                                            >
                                                                <Printer size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setLastOrderData({
                                                                        short_id: order.orderId,
                                                                        total_amount: order.total,
                                                                        amount_paid: order.total, // Standard historical assumption
                                                                        balance: 0,
                                                                        payment_method: 'card', // Or detected method
                                                                        customer_name: order.customer.name,
                                                                        customer_phone: order.customer.phone,
                                                                        delivery_type: order.customer.type
                                                                    });
                                                                    setLastOrderItems(order.items.map((i: any) => ({
                                                                        name: i.name,
                                                                        price: i.price,
                                                                        quantity: i.quantity
                                                                    })));
                                                                    setShowReceiptConfirmation(true);
                                                                }}
                                                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                                                title="Ver Recibo Digital"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setLastOrderData({
                                                                        short_id: order.orderId,
                                                                        total_amount: order.total,
                                                                        amount_paid: order.total,
                                                                        balance: 0,
                                                                        payment_method: 'card',
                                                                        customer_name: order.customer.name,
                                                                        customer_phone: order.customer.phone,
                                                                        delivery_type: order.customer.type
                                                                    });
                                                                    setLastOrderItems(order.items.map((i: any) => ({
                                                                        name: i.name,
                                                                        price: i.price,
                                                                        quantity: i.quantity
                                                                    })));
                                                                    setShowReceiptConfirmation(true);
                                                                    // The modal has the Download PDF action
                                                                }}
                                                                className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                                                                title="Baixar PDF do Recibo"
                                                            >
                                                                <Download size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                }
                {
                    activeView === 'queue' && <QueueManager />
                }
                {
                    activeView === 'settings' && (
                        <div className="h-[calc(100vh-140px)] animate-fade-in flex flex-col gap-6 overflow-hidden">
                            {/* Tabs Navigation - Full Width Responsive */}
                            <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-full max-w-[1400px] mx-auto overflow-hidden">
                                <div className="flex items-center justify-between gap-0.5 md:gap-1">
                                    {[
                                        { id: 'profile', label: 'Meu Perfil', icon: <Users size={18} /> },
                                        { id: 'company', label: 'Empresa', icon: <FileText size={18} /> },
                                        { id: 'team', label: 'Equipa', icon: <UserPlus size={18} /> },
                                        { id: 'performance', label: 'Performance', icon: <TrendingUp size={18} /> },
                                        { id: 'notifications', label: 'Geral', icon: <Bell size={18} /> },
                                        { id: 'branding', label: 'Branding', icon: <Sparkles size={18} /> },
                                        { id: 'printer', label: 'Impressora', icon: <Printer size={18} /> },
                                        { id: 'hardware', label: 'Hardware', icon: <Smartphone size={18} /> },
                                        { id: 'audit', label: 'Audit', icon: <ShieldCheck size={18} /> },
                                        { id: 'drive', label: 'Drive', icon: <Save size={18} /> }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveSettingsTab(tab.id as any)}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-[10px] md:text-xs uppercase tracking-wider flex-1 whitespace-nowrap ${activeSettingsTab === tab.id ? 'bg-[#3b2f2f] text-[#d9a65a] shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                        >
                                            {tab.icon}
                                            <span className="hidden md:inline">{tab.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8">
                                <div className="max-w-[1400px] mx-auto w-full">
                                    {activeSettingsTab === 'profile' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                                            {/* Personal Info Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 lg:col-span-1">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Users size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Informações Pessoais</h2>
                                                        <p className="text-gray-500 text-sm">Gerencie sua identidade no sistema.</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center gap-6 mb-8">
                                                    <div className="relative group">
                                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center">
                                                            {userForm.photo ? (
                                                                <img src={userForm.photo} alt="Avatar" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Users size={48} className="text-gray-300" />
                                                            )}
                                                        </div>
                                                        <label className="absolute bottom-2 right-2 p-3 bg-[#d9a65a] text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-all">
                                                            <Upload size={16} />
                                                            <input type="file" className="hidden" accept="image/*" title="Carregar nova foto" onChange={handleAvatarUpload} />
                                                        </label>
                                                    </div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foto de Perfil</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Nome / Username</label>
                                                        <input
                                                            type="text"
                                                            value={userForm.name}
                                                            onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="Seu nome"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Telefone de Contacto</label>
                                                        <input
                                                            type="text"
                                                            value={userForm.phone}
                                                            onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="258..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Security Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 lg:col-span-1 flex flex-col h-fit">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Lock size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Segurança</h2>
                                                        <p className="text-gray-500 text-sm">Atualize sua senha de acesso.</p>
                                                    </div>
                                                </div>

                                                <form onSubmit={handleUpdateUser} className="space-y-6">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Nova Senha</label>
                                                            <input
                                                                type="password"
                                                                value={userForm.password}
                                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                                placeholder="••••••••"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Confirmar Nova Senha</label>
                                                            <input
                                                                type="password"
                                                                value={userForm.confirmPassword}
                                                                onChange={e => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                                                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                                placeholder="••••••••"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6">
                                                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-2">
                                                            <ShieldCheck size={14} /> Recomendação de Segurança
                                                        </p>
                                                        <p className="text-[10px] text-amber-600 mt-1">Use uma senha forte com pelo menos 8 caracteres, misturando letras e números.</p>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={isSubmitting}
                                                        className={`w-full py-4 bg-[#3b2f2f] text-[#d9a65a] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest text-sm flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-50' : ''}`}
                                                    >
                                                        {isSubmitting ? <Loader className="animate-spin" size={18} /> : 'Guardar Alterações Perfil'}
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'company' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                                            {/* Company Profile Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 xl:col-span-2">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-[#d9a65a]/10 p-3 rounded-2xl text-[#d9a65a]"><FileText size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Perfil da Empresa</h2>
                                                        <p className="text-gray-500 text-sm">Informações básicas e identidade visual.</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row gap-8 items-start">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-40 h-40 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                                                            {companyInfo.logo ? (
                                                                <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                                                            ) : (
                                                                <Upload size={48} className="text-gray-200" />
                                                            )}
                                                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                                <Upload size={24} className="text-white" />
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    title="Carregar logo"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        const fileName = `branding/company_${Date.now()}_${file.name}`;
                                                                        const { error } = await supabase.storage.from('products').upload(fileName, file);
                                                                        if (error) return alert('Erro: ' + error.message);
                                                                        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    if (typeof data !== 'undefined' && data && data.publicUrl && data.publicUrl.includes('/supabase-proxy')) {
        data.publicUrl = data.publicUrl.replace(window.location.origin + '/supabase-proxy', import.meta.env.VITE_SUPABASE_URL || 'https://bbvowyztvzselxphbqmt.supabase.co');
    }
                                                                        setCompanyInfo(prev => ({ ...prev, logo: data.publicUrl }));
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo Principal</span>
                                                    </div>

                                                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Nome Comercial</label>
                                                            <input type="text" value={companyInfo.name} title="Nome Comercial" onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Razão Social (Legal)</label>
                                                            <input type="text" value={companyInfo.legalName} title="Razão Social" onChange={e => setCompanyInfo({ ...companyInfo, legalName: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Email Corporativo</label>
                                                            <input type="email" value={companyInfo.email} title="Email Corporativo" onChange={e => setCompanyInfo({ ...companyInfo, email: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Telefone Geral</label>
                                                            <input type="text" value={companyInfo.phone} title="Telefone Geral" onChange={e => setCompanyInfo({ ...companyInfo, phone: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Business Details Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col h-fit">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-purple-50 p-3 rounded-2xl text-purple-600"><Award size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Negócio</h2>
                                                        <p className="text-gray-500 text-sm">Dados legais e regulatórios.</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Número de Registo</label>
                                                        <input type="text" value={companyInfo.regNo} onChange={e => setCompanyInfo({ ...companyInfo, regNo: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" placeholder="Nº de Registo Comercial" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">NUIT (ID Fiscal)</label>
                                                        <input type="text" value={companyInfo.nuit} onChange={e => setCompanyInfo({ ...companyInfo, nuit: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" placeholder="Número Fiscal" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Tipo de Negócio / Indústria</label>
                                                        <input type="text" value={companyInfo.industry} onChange={e => setCompanyInfo({ ...companyInfo, industry: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" placeholder="Ex: Padaria, Restaurante" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Website</label>
                                                        <input type="text" value={companyInfo.website} onChange={e => setCompanyInfo({ ...companyInfo, website: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" placeholder="www.exemplo.com" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 xl:col-span-2">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><MapPin size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Sede & Endereço</h2>
                                                        <p className="text-gray-500 text-sm">Localização física da sua empresa.</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">País</label>
                                                        <input type="text" value={companyInfo.country} title="País" onChange={e => setCompanyInfo({ ...companyInfo, country: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Província</label>
                                                        <input type="text" value={companyInfo.province} title="Província" onChange={e => setCompanyInfo({ ...companyInfo, province: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Cidade</label>
                                                        <input type="text" value={companyInfo.city} title="Cidade" onChange={e => setCompanyInfo({ ...companyInfo, city: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Endereço Completo</label>
                                                        <input type="text" value={companyInfo.address} title="Endereço Completo" onChange={e => setCompanyInfo({ ...companyInfo, address: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Código Postal</label>
                                                        <input type="text" value={companyInfo.postalCode} title="Código Postal" onChange={e => setCompanyInfo({ ...companyInfo, postalCode: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Branding Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col h-fit">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Sparkles size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Identidade</h2>
                                                        <p className="text-gray-500 text-sm">Lema e configurações de sistema.</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Slogan da Empresa</label>
                                                        <input type="text" value={companyInfo.slogan} title="Slogan" onChange={e => setCompanyInfo({ ...companyInfo, slogan: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold font-serif italic" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Motto Geral</label>
                                                        <input type="text" value={companyInfo.motto} title="Motto" onChange={e => setCompanyInfo({ ...companyInfo, motto: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Moeda</label>
                                                            <select value={companyInfo.currency} title="Moeda de Conta" onChange={e => setCompanyInfo({ ...companyInfo, currency: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold">
                                                                <option value="MT">Metical (MT)</option>
                                                                <option value="USD">Dólar ($)</option>
                                                                <option value="ZAR">Rand (R)</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Língua</label>
                                                            <select value={companyInfo.language} title="Língua do Sistema" onChange={e => setCompanyInfo({ ...companyInfo, language: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold">
                                                                <option value="pt">Português</option>
                                                                <option value="en">English</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Prefixo ID Clientes</label>
                                                            <input type="text" value={companyInfo.prefix} title="Prefixo de Cliente" onChange={e => setCompanyInfo({ ...companyInfo, prefix: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold font-mono" placeholder="Ex: CLI" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Prefixo ID Staff</label>
                                                            <input type="text" value={companyInfo.staffPrefix} title="Prefixo de Staff" onChange={e => setCompanyInfo({ ...companyInfo, staffPrefix: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold font-mono" placeholder="Ex: FUNC" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Prefixo ID Produto</label>
                                                            <input type="text" value={companyInfo.productPrefix} title="Prefixo de Produto" onChange={e => setCompanyInfo({ ...companyInfo, productPrefix: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold font-mono" placeholder="Ex: PROD" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Prefixo ID Faturas</label>
                                                            <input type="text" value={companyInfo.docPrefix} title="Prefixo de Faturas" onChange={e => setCompanyInfo({ ...companyInfo, docPrefix: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold font-mono" placeholder="Ex: FAT" />
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                setIsSubmitting(true);
                                                                const settingsToSave = [
                                                                    { key: 'company_name', value: companyInfo.name },
                                                                    { key: 'company_legal_name', value: companyInfo.legalName },
                                                                    { key: 'company_email', value: companyInfo.email },
                                                                    { key: 'company_phone', value: companyInfo.phone },
                                                                    { key: 'company_website', value: companyInfo.website },
                                                                    { key: 'company_reg_no', value: companyInfo.regNo },
                                                                    { key: 'company_nuit', value: companyInfo.nuit },
                                                                    { key: 'company_industry', value: companyInfo.industry },
                                                                    { key: 'company_country', value: companyInfo.country },
                                                                    { key: 'company_province', value: companyInfo.province },
                                                                    { key: 'company_city', value: companyInfo.city },
                                                                    { key: 'company_address', value: companyInfo.address },
                                                                    { key: 'company_postal_code', value: companyInfo.postalCode },
                                                                    { key: 'company_slogan', value: companyInfo.slogan },
                                                                    { key: 'company_motto', value: companyInfo.motto },
                                                                    { key: 'company_currency', value: companyInfo.currency },
                                                                    { key: 'company_language', value: companyInfo.language },
                                                                    { key: 'company_customer_prefix', value: companyInfo.prefix },
                                                                    { key: 'company_staff_prefix', value: companyInfo.staffPrefix },
                                                                    { key: 'company_product_prefix', value: companyInfo.productPrefix },
                                                                    { key: 'company_doc_prefix', value: companyInfo.docPrefix },
                                                                    // Sync with branding for compatibility
                                                                    { key: 'branding_name', value: companyInfo.name },
                                                                    { key: 'branding_logo', value: companyInfo.logo },
                                                                    { key: 'branding_address', value: companyInfo.address },
                                                                    { key: 'branding_phone', value: companyInfo.phone },
                                                                    { key: 'branding_email_user', value: companyInfo.email }
                                                                ];
                                                                
                                                                localStorage.setItem('company_prefixes', JSON.stringify({
                                                                    customer: companyInfo.prefix,
                                                                    staff: companyInfo.staffPrefix,
                                                                    product: companyInfo.productPrefix,
                                                                    doc: companyInfo.docPrefix
                                                                }));

                                                                    const { error } = await supabase.from('settings').upsert(settingsToSave);
                                                                    if (error) throw error;

                                                                    alert('Dados da Empresa guardados com sucesso!');
                                                                    loadBranding();
                                                                } catch (err: any) {
                                                                    alert('Erro ao guardar dados: ' + err.message);
                                                                } finally {
                                                                    setIsSubmitting(false);
                                                                }
                                                        }}
                                                        disabled={isSubmitting}
                                                        className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all uppercase tracking-widest text-xs flex justify-center items-center gap-2 mt-4"
                                                    >
                                                        {isSubmitting ? <Loader className="animate-spin" size={18} /> : 'Guardar Dados da Empresa'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'team' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                                            {/* Team Management Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 lg:col-span-2">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><UserPlus size={32} /></div>
                                                        <div>
                                                            <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Membros da Equipa</h2>
                                                            <p className="text-gray-500 text-sm">Gerencie o acesso dos seus colaboradores.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setCurrentMember(null);
                                                            setMemberAvatar(null);
                                                            setMemberForm({ id: 0, name: '', username: '', email: '', phone: '', role: 'staff', password: '', avatar_url: '' });
                                                            setIsEditingMember(true);
                                                        }}
                                                        className="px-6 py-3 bg-[#3b2f2f] text-[#d9a65a] font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center gap-2"
                                                        title="Adicionar Novo Membro"
                                                    >
                                                        <UserPlus size={16} /> Adicionar Membro
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {teamMembers.map((member: any) => (
                                                        <div key={member.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white flex items-center justify-center font-bold text-[#3b2f2f]">
                                                                    {member.avatar_url ? (
                                                                        <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        member.name.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-[#3b2f2f]">{member.name}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <p className="text-[10px] font-black text-[#d9a65a] uppercase tracking-widest">{member.role}</p>
                                                                        {member.internal_id && (
                                                                            <>
                                                                                <span className="text-gray-300">•</span>
                                                                                <p className="text-[10px] font-bold text-[#3b2f2f] font-mono">{member.internal_id}</p>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] font-black text-gray-400 font-mono mt-0.5">@{member.username}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setCurrentMember(member);
                                                                        setMemberAvatar(member.avatar_url || null);
                                                                        setMemberForm({ 
                                                                            id: member.id,
                                                                            name: member.name || '',
                                                                            username: member.username || '',
                                                                            email: member.email || '',
                                                                            phone: member.phone || '',
                                                                            role: member.role || 'staff',
                                                                            password: '',
                                                                            avatar_url: member.avatar_url || ''
                                                                        });
                                                                        setIsEditingMember(true);
                                                                    }}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Editar Membro"
                                                                >
                                                                    <Edit3 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteMember(member.id)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Eliminar Membro"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Team Stats Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col h-fit">
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Resumo da Equipa</h3>
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-white p-2 rounded-xl text-blue-600 shadow-sm"><Users size={16} /></div>
                                                            <span className="text-sm font-bold text-blue-900">Total Membros</span>
                                                        </div>
                                                        <span className="text-xl font-serif font-black text-blue-900">{teamMembers.length}</span>
                                                    </div>
                                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Distribuição de Cargos</p>
                                                        <div className="space-y-2">
                                                            {['admin', 'it', 'staff', 'vendas', 'driver', 'kitchen'].map(role => {
                                                                const count = teamMembers.filter((m: any) => m.role === role).length;
                                                                const percentage = (count / teamMembers.length) * 100 || 0;
                                                                return (
                                                                    <div key={role} className="space-y-1">
                                                                        <div className="flex justify-between text-[10px] font-bold">
                                                                            <span className="uppercase tracking-wider text-gray-600">{role}</span>
                                                                            <span className="text-gray-400">{count}</span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-[#d9a65a]" style={{ width: `${percentage}%` } as React.CSSProperties}></div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'performance'  && (
                                        <div className="animate-fade-in w-full h-[calc(100vh-140px)] overflow-y-auto no-scrollbar pb-10">
                                            <AdminPerformanceView />
                                        </div>
                                    )}

                                    {activeSettingsTab === 'notifications' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                                            {/* Admin Notifications Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Users size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Contactos Admin</h2>
                                                        <p className="text-gray-500 text-sm">Destinatários de alertas críticos.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Admin 1 (Principal)</label>
                                                        <input
                                                            type="text"
                                                            value={teamNumbers.admin1}
                                                            onChange={e => setTeamNumbers({ ...teamNumbers, admin1: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="258..."
                                                            title="Número Telemóvel Admin 1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Admin 2 (Backup)</label>
                                                        <input
                                                            type="text"
                                                            value={teamNumbers.admin2}
                                                            onChange={e => setTeamNumbers({ ...teamNumbers, admin2: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="258..."
                                                            title="Número Telemóvel Admin 2"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Email p/ Alertas</label>
                                                        <input
                                                            type="email"
                                                            value={teamNumbers.adminEmail}
                                                            onChange={e => setTeamNumbers({ ...teamNumbers, adminEmail: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="admin@exemplo.com"
                                                            title="Email para Notificações"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Departmental Contacts Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col h-fit">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Bell size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Departamentos</h2>
                                                        <p className="text-gray-500 text-sm">Números para KDS e Gestão.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 flex-1">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Cozinha / KDS</label>
                                                        <input
                                                            type="text"
                                                            value={teamNumbers.kitchen}
                                                            onChange={e => setTeamNumbers({ ...teamNumbers, kitchen: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="Número da Cozinha"
                                                            title="Número da Cozinha"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Chef / Gestor</label>
                                                        <input
                                                            type="text"
                                                            value={teamNumbers.chef}
                                                            onChange={e => setTeamNumbers({ ...teamNumbers, chef: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="Número do Chef"
                                                            title="Número do Chef/Gestor"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        localStorage.setItem('team_numbers', JSON.stringify(teamNumbers));
                                                        alert('Definições de contactos guardadas!');
                                                    }}
                                                    className="w-full py-4 mt-8 bg-[#3b2f2f] text-[#d9a65a] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                                >
                                                    Guardar Configurações
                                                </button>
                                            </div>

                                            {/* Maintenance Mode / Resilience Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col h-fit">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className={`p-3 rounded-2xl transition-colors ${whatsappMenuMode ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                        <ShieldAlert size={32} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Resiliência e Continuidade</h2>
                                                        <p className="text-gray-500 text-sm">Plano de contingência para instabilidade.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 flex-1">
                                                    <div className={`p-6 rounded-2xl border transition-all ${whatsappMenuMode ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <Phone size={20} className={whatsappMenuMode ? 'text-red-600' : 'text-gray-400'} />
                                                                <span className="font-bold text-[#3b2f2f]">Menu de Emergência (WhatsApp)</span>
                                                            </div>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="sr-only peer"
                                                                    checked={whatsappMenuMode}
                                                                    onChange={(e) => handleUpdateMaintenanceMode(e.target.checked)}
                                                                    disabled={isUpdatingMaintenance}
                                                                />
                                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                                            </label>
                                                        </div>
                                                        <p className="text-xs text-gray-500 leading-relaxed">
                                                            Quando ativo, redireciona o fluxo público de pedidos para um menu simplificado no WhatsApp. Use em caso de instabilidades críticas no sistema de pedidos ou infraestrutura.
                                                        </p>
                                                        {whatsappMenuMode && (
                                                            <div className="mt-4 flex items-center gap-2 bg-red-100 text-red-700 p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                                                <ShieldAlert size={14} /> Sistema em Modo de Contingência
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                                                        <div className="flex gap-3">
                                                            <div className="text-amber-600 mt-1"><Sparkles size={16} /></div>
                                                            <div className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                                                Dica: Ative o modo WhatsApp se detectar latência alta ou falhas persistentes na gravação de pedidos no POS. Os clientes verão um menu otimizado para fechar pedido via chat.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'branding' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                                            {/* Branding Preview Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 xl:col-span-2">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-[#d9a65a]/10 p-3 rounded-2xl text-[#d9a65a]"><Sparkles size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Branding da Marca</h2>
                                                        <p className="text-gray-500 text-sm">Identidade visual em faturas e emails.</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Morada de Exibição</label>
                                                        <input
                                                            type="text"
                                                            value={emailSettings.address || ''}
                                                            onChange={e => setEmailSettings({ ...emailSettings, address: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="Ex: Lichinga, Av. Acordo de Lusaka"
                                                            title="Morada para Branding"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Contacto Exibição</label>
                                                        <input
                                                            type="text"
                                                            value={emailSettings.phone || ''}
                                                            onChange={e => setEmailSettings({ ...emailSettings, phone: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="Ex: +258 87 9146 662"
                                                            title="Contacto para Branding"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Nome do Emissor (Sender ID)</label>
                                                        <input
                                                            type="text"
                                                            value={emailSettings.senderId}
                                                            onChange={e => setEmailSettings({ ...emailSettings, senderId: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="Ex: PaoCaseiro"
                                                            title="Nome do Emissor"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Email de Resposta</label>
                                                        <input
                                                            type="email"
                                                            value={emailSettings.user}
                                                            onChange={e => setEmailSettings({ ...emailSettings, user: e.target.value })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] outline-none font-bold"
                                                            placeholder="Ex: admin"
                                                            title="Email de Resposta"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Branding Actions Card */}
                                            <div className="bg-[#3b2f2f] rounded-3xl p-8 shadow-xl border border-gray-800 text-white flex flex-col justify-between h-fit lg:mt-0">
                                                <div>
                                                    <h3 className="text-[#d9a65a] font-serif font-bold text-xl mb-4">Guardar Branding</h3>
                                                    <p className="text-gray-400 text-xs leading-relaxed mb-6">
                                                        As alterações de branding afectam faturas em PDF, cabeçalhos de email e SMS enviados pelo sistema.
                                                    </p>
                                                    <div className="bg-white/5 p-4 rounded-2xl mb-6">
                                                        <p className="text-[10px] uppercase font-black text-[#d9a65a] tracking-widest mb-2 flex items-center gap-2">
                                                            <Smartphone size={14} /> Pré-visualização SMS
                                                        </p>
                                                        <p className="text-[10px] text-gray-300 italic">De: {emailSettings.senderId || 'SuaEmpresa'}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">Seu pedido #123 foi confirmado!</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const settingsToSave = [
                                                            { key: 'branding_name', value: emailSettings.senderId },
                                                            { key: 'branding_logo', value: companyInfo.logo },
                                                            { key: 'branding_address', value: emailSettings.address },
                                                            { key: 'branding_phone', value: emailSettings.phone },
                                                            { key: 'branding_email_user', value: emailSettings.user }
                                                        ];
                                                        try {
                                                            setIsSubmitting(true);
                                                            const { error } = await supabase.from('settings').upsert(settingsToSave);
                                                            if (error) throw error;
                                                            
                                                            alert('Branding guardado com sucesso!');
                                                            loadBranding();
                                                        } catch (err: any) {
                                                            alert('Erro ao guardar branding: ' + err.message);
                                                        } finally {
                                                            setIsSubmitting(false);
                                                        }
                                                    }}
                                                    className="w-full py-4 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? <Loader className="animate-spin" size={18} /> : 'Aplicar Branding'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {activeSettingsTab === 'printer' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                                            {/* Connection Type Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Printer size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Conexão Impressora</h2>
                                                        <p className="text-gray-500 text-sm">Configure o método de comunicação.</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => setPrinterConfig({ ...printerConfig, type: 'bluetooth' })}
                                                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${printerConfig.type === 'bluetooth' ? 'border-[#d9a65a] bg-[#d9a65a]/5' : 'border-gray-50 opacity-60'}`}
                                                        title="Conectar via Bluetooth"
                                                    >
                                                        <Smartphone size={32} className={printerConfig.type === 'bluetooth' ? 'text-[#d9a65a]' : 'text-gray-400'} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#3b2f2f]">Bluetooth</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setPrinterConfig({ ...printerConfig, type: 'usb' })}
                                                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${printerConfig.type === 'usb' ? 'border-[#d9a65a] bg-[#d9a65a]/5' : 'border-gray-100 opacity-60'}`}
                                                        title="Conectar via USB"
                                                    >
                                                        <Printer size={32} className={printerConfig.type === 'usb' ? 'text-[#d9a65a]' : 'text-gray-400'} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#3b2f2f]">USB (WebUSB)</span>
                                                    </button>
                                                </div>

                                                <div className="mt-8 flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div>
                                                        <p className="text-sm font-bold text-[#3b2f2f]">Impressão Automática</p>
                                                        <p className="text-[10px] text-gray-400">Imprimir recibo ao finalizar venda</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setPrinterConfig({ ...printerConfig, autoPrint: !printerConfig.autoPrint })}
                                                        className={`w-14 h-7 rounded-full transition-all relative ${printerConfig.autoPrint ? 'bg-green-500' : 'bg-gray-300'}`}
                                                        aria-label="Alternar Impressão Automática"
                                                        title="Alternar Impressão Automática"
                                                    >
                                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${printerConfig.autoPrint ? 'right-1' : 'left-1'}`}></div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Printer Status & Test Card */}
                                            <div className="bg-[#3b2f2f] rounded-3xl p-8 shadow-xl border border-gray-800 text-white flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-8">
                                                        <h3 className="text-[#d9a65a] font-serif font-bold text-xl uppercase tracking-widest">Estado Local</h3>
                                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isPrinterConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            <div className={`w-2 h-2 rounded-full animate-pulse ${isPrinterConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                                            {isPrinterConnected ? 'Conectado' : 'Desconectado'}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tamanho Papel</p>
                                                            <select
                                                                value={printerConfig.paperSize}
                                                                onChange={e => setPrinterConfig({ ...printerConfig, paperSize: e.target.value })}
                                                                className="bg-transparent text-white font-bold outline-none w-full"
                                                                title="Tamanho do Papel"
                                                            >
                                                                <option value="58mm" className="text-[#3b2f2f]">58mm</option>
                                                                <option value="80mm" className="text-[#3b2f2f]">80mm</option>
                                                            </select>
                                                        </div>
                                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vias do Recibo</p>
                                                            <select className="bg-transparent text-white font-bold outline-none w-full" title="Número de Vias">
                                                                <option value="1" className="text-[#3b2f2f]">1 Via</option>
                                                                <option value="2" className="text-[#3b2f2f]">2 Vias</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <button
                                                        onClick={() => {
                                                            localStorage.setItem('pos_printer_config', JSON.stringify(printerConfig));
                                                            alert('Configuração de impressora guardada!');
                                                        }}
                                                        className="w-full py-4 bg-[#d9a65a] text-[#3b2f2f] font-bold rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest"
                                                    >
                                                        Guardar Configuração
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await printerService.printTestPage();
                                                                alert('Página de teste enviada!');
                                                            } catch (e) {
                                                                alert('Falha no teste: ' + (e as Error).message);
                                                            }
                                                        }}
                                                        className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all text-xs uppercase tracking-widest"
                                                    >
                                                        Imprimir Página Teste
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'hardware' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                                            {/* Barcode & Drawer Card */}
                                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col h-full">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Smartphone size={32} /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Periféricos POS</h2>
                                                        <p className="text-gray-500 text-sm">Leitores e gavetas de dinheiro.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 flex-1">
                                                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-white p-2 rounded-xl text-gray-400 shadow-sm"><Box size={18} /></div>
                                                                <span className="font-bold text-[#3b2f2f]">Leitor de Código</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setHardwareConfig({ ...hardwareConfig, barcodeEnabled: !hardwareConfig.barcodeEnabled })}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${hardwareConfig.barcodeEnabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
                                                                title="Ativar/Desativar Leitor"
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hardwareConfig.barcodeEnabled ? 'right-1' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>
                                                        {hardwareConfig.barcodeEnabled && (
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={hardwareConfig.barcodeConnection}
                                                                    onChange={e => setHardwareConfig({ ...hardwareConfig, barcodeConnection: e.target.value })}
                                                                    className="flex-1 p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                                                                    title="Tipo de Conexão Leitor"
                                                                >
                                                                    <option value="usb">USB</option>
                                                                    <option value="bluetooth">Bluetooth</option>
                                                                    <option value="wifi">Rede / IP</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => handleScanDevices('barcode', hardwareConfig.barcodeConnection)}
                                                                    className="p-2 bg-[#d9a65a] text-white rounded-xl shadow-md hover:scale-105 transition-all"
                                                                    title="Procurar Dispositivos"
                                                                >
                                                                    {isScanning['barcode'] ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-white p-2 rounded-xl text-gray-400 shadow-sm"><ShieldCheck size={18} /></div>
                                                                <span className="font-bold text-[#3b2f2f]">Gaveta Automática</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setHardwareConfig({ ...hardwareConfig, cashDrawerEnabled: !hardwareConfig.cashDrawerEnabled })}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${hardwareConfig.cashDrawerEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                                                title="Ativar/Desativar Gaveta"
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hardwareConfig.cashDrawerEnabled ? 'right-1' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>
                                                        {hardwareConfig.cashDrawerEnabled && (
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={hardwareConfig.cashDrawerConnection}
                                                                    onChange={e => setHardwareConfig({ ...hardwareConfig, cashDrawerConnection: e.target.value })}
                                                                    className="flex-1 p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                                                                    title="Tipo de Conexão Gaveta"
                                                                >
                                                                    <option value="usb">Ligada à Impressora (RJ11)</option>
                                                                    <option value="usb_direct">USB Directo</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => handleScanDevices('cashDrawer', hardwareConfig.cashDrawerConnection)}
                                                                    className="p-2 bg-[#d9a65a] text-white rounded-xl shadow-md hover:scale-105 transition-all"
                                                                    title="Procurar Gaveta"
                                                                >
                                                                    {isScanning['cashDrawer'] ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Advanced Hardware Card */}
                                            <div className="space-y-6">
                                                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col h-fit">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="bg-gray-100 p-3 rounded-2xl text-gray-400"><Smartphone size={32} /></div>
                                                        <div>
                                                            <h2 className="text-2xl font-serif font-bold text-[#3b2f2f]">Camera & Scan</h2>
                                                            <p className="text-gray-500 text-sm">Escaneamento via dispositivo.</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-amber-100 p-3 rounded-2xl text-amber-700"><ShieldCheck size={24} /></div>
                                                            <div>
                                                                <p className="font-bold text-amber-900">Scan via Telemóvel</p>
                                                                <p className="text-[10px] text-amber-700">Módulo em desenvolvimento...</p>
                                                            </div>
                                                        </div>
                                                        <span className="px-3 py-1 bg-amber-200 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-widest">Breve</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        localStorage.setItem('hardware_config', JSON.stringify(hardwareConfig));
                                                        alert('Configuração de Hardware guardada com sucesso!');
                                                    }}
                                                    className="w-full py-5 bg-[#3b2f2f] text-[#d9a65a] font-black rounded-3xl shadow-2xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                                >
                                                    Guardar Modificações
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingsTab === 'drive' && (
                                        <div className="animate-fade-in p-2 md:p-6 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-full">
                                            <AdminDriveView />
                                        </div>
                                    )}

                                    {activeSettingsTab === 'audit' && (
                                        <div className="animate-fade-in w-full h-[calc(100vh-140px)] overflow-y-auto no-scrollbar pb-10">
                                            <AdminAuditView />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                <AnimatePresence>
                    {selectedOrder && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-end">
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="bg-[#fcfbf9] w-full max-w-md h-full p-8 shadow-2xl overflow-y-auto flex flex-col">
                                <div className="flex justify-between items-start mb-8 border-b pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#3b2f2f]">Pedido #{selectedOrder.orderId}</h2>
                                        <p className="text-sm text-gray-500">{selectedOrder.date}</p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} title="Fechar" className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition-colors"><X size={20} /></button>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">Cliente</h3>
                                    <p className="font-bold text-lg text-[#3b2f2f]">{selectedOrder.customer.name}</p>
                                    <p className="text-sm text-gray-600 mb-1">{selectedOrder.customer.phone}</p>
                                    {selectedOrder.customer.id || selectedOrder.customer.internal_id ? (
                                        <p className="text-sm font-bold text-[#d9a65a] mb-2 uppercase tracking-wide font-mono">ID: {companyInfo.prefix}-{(selectedOrder.customer.internal_id || (selectedOrder.customer.id ? selectedOrder.customer.id.substring(0,6).toUpperCase() : 'LOCAL'))}</p>
                                    ) : null}
                                    {selectedOrder.customer.type === 'delivery' && (
                                        <p className="text-sm bg-blue-50 text-blue-800 p-2 rounded mt-2 flex gap-2 items-start"><MapPin size={16} className="shrink-0 mt-0.5" /> {selectedOrder.customer.address}</p>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex-1">
                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">Itens</h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((i, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-100 last:border-0">
                                                <div className="flex gap-3">
                                                    <span className="font-bold text-[#d9a65a]">{i.quantity}x</span>
                                                    <span className="font-bold text-gray-700">{i.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-900">{(i.price * i.quantity).toLocaleString()} MT</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                                        <span className="font-bold text-gray-500">Total</span>
                                        <span className="font-bold text-2xl text-[#d9a65a]">{(selectedOrder.total || 0).toLocaleString()} MT</span>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                                    <h3 className="font-bold text-gray-400 text-[10px] uppercase mb-4 tracking-widest">Finanças & Detalhes</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Método</p>
                                            <p className="text-sm font-bold text-[#3b2f2f] flex items-center gap-2 uppercase">
                                                {selectedOrder.payment_method === 'cash' ? <Banknote size={14} /> : <CreditCard size={14} />}
                                                {selectedOrder.payment_method || 'Pendente'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Recebido</p>
                                            <p className="text-sm font-bold text-green-600">{selectedOrder.amount_received?.toLocaleString() || '0'} MT</p>
                                        </div>
                                    </div>
                                    {selectedOrder.transaction_id && (
                                        <div className="pt-3 border-t border-gray-50">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Transação / Ref</p>
                                            <p className="text-[10px] font-mono font-bold text-[#3b2f2f] bg-gray-50 p-2 rounded truncate select-all">{selectedOrder.transaction_id}</p>
                                        </div>
                                    )}
                                    {selectedOrder.balance > 0 && (
                                        <div className="mt-3 pt-3 border-t border-red-50">
                                            <p className="text-[10px] text-red-400 uppercase font-bold mb-1">Saldo Devedor</p>
                                            <p className="text-lg font-black text-red-500">{(selectedOrder.balance || 0).toLocaleString()} MT</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2">
                                    <button onClick={async () => {
                                        if (!selectedOrder.id) {
                                            alert("Erro: ID do pedido ausente. Recarregue a página.");
                                            return;
                                        }
                                        const { generateReceipt } = await import('../services/supabase');
                                        const { notifyPaymentConfirmed } = await import('../services/sms');

                                        const customerName = selectedOrder.customer?.name || selectedOrder.customer_name || 'Venda Local (Balcão)';
                                        const customerPhone = selectedOrder.customer?.phone || selectedOrder.customer_phone || '';
                                        const deliveryType = selectedOrder.customer?.type || selectedOrder.delivery_type || 'takeaway';

                                        const receiptRes = await generateReceipt(
                                            selectedOrder.id,
                                            selectedOrder.orderId,
                                            selectedOrder.customer_id,
                                            customerName,
                                            selectedOrder.items,
                                            selectedOrder.total
                                        );

                                        if (receiptRes.success && receiptRes.data) {
                                            await notifyPaymentConfirmed(selectedOrder.orderId, customerPhone);

                                            try {
                                                const { notifyCustomerNewOrderWhatsApp, notifyAdminNewOrderWhatsApp, notifyKitchenNewOrderWhatsApp } = await import('../services/whatsapp');
                                                const compatOrder = {
                                                    id: selectedOrder.id,
                                                    short_id: selectedOrder.orderId,
                                                    customer_name: customerName,
                                                    customer_phone: customerPhone,
                                                    total_amount: selectedOrder.total,
                                                    delivery_type: deliveryType
                                                };
                                                
                                                // Alert the customer (if they have a phone)
                                                if (customerPhone && customerPhone.length > 5) {
                                                    notifyCustomerNewOrderWhatsApp(compatOrder, selectedOrder.items).catch(e => console.error("WA err cust", e));
                                                }
                                                
                                                // Alert Admin & Kitchen about the confirmed receipt
                                                notifyAdminNewOrderWhatsApp(compatOrder, selectedOrder.items).catch(e => console.error("WA err admin", e));
                                                notifyKitchenNewOrderWhatsApp(compatOrder, selectedOrder.items).catch(e => console.error("WA err kitchen", e));
                                                
                                            } catch (e) {
                                                console.error("Erro notifications", e);
                                            }

                                            // Map to standardized receipt state and show modal
                                            setLastOrderData({
                                                short_id: selectedOrder.orderId,
                                                total_amount: selectedOrder.total,
                                                amount_paid: selectedOrder.total,
                                                balance: 0,
                                                payment_method: 'online',
                                                customer_name: customerName,
                                                customer_phone: customerPhone,
                                                delivery_type: deliveryType
                                            });
                                            setLastOrderItems(selectedOrder.items.map(i => ({
                                                name: i.name,
                                                price: i.price,
                                                quantity: i.quantity
                                            })));
                                            setShowReceiptConfirmation(true);
                                            setSelectedOrder(null); // Close the drawer
                                            loadOrders();
                                        } else {
                                            console.error("Receipt error:", receiptRes.error);
                                            alert('Erro ao gerar recibo: ' + (receiptRes.error?.message || receiptRes.error || 'Desconhecido'));
                                        }
                                    }} className="w-full p-3 mb-4 rounded-xl text-sm font-bold bg-[#d9a65a] text-[#3b2f2f] hover:brightness-110 shadow-lg">
                                        Confirmar Pagamento (Gerar Recibo)
                                    </button>

                                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Fluxo de Trabalho</h3>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            const { notifyCustomer } = await import('../services/sms');
                                            const { notifyOrderStatusUpdateEmail } = await import('../services/email');

                                            await supabase.from('orders').update({ status: 'kitchen' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            const updatedOrder = { ...selectedOrder, status: 'kitchen' };
                                            setSelectedOrder(null); // Fechar a aba
                                            setActiveView('kitchen'); // Redirecionar para cozinha

                                            // Multi-channel notifications
                                            notifyCustomer(updatedOrder, 'status_update').catch(e => { });
                                            notifyOrderStatusUpdateEmail(updatedOrder).catch(e => { });
                                            import('../services/whatsapp').then(m => m.notifyCustomerOrderStatusWhatsApp(updatedOrder, updatedOrder.status)).catch(e => { });
                                        }} className={`p-3 rounded-xl text-sm font-bold border transition-all ${selectedOrder.status === 'kitchen' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white hover:bg-purple-50'}`}>
                                            Enviar p/ Cozinha
                                        </button>
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            const { notifyCustomer } = await import('../services/sms');
                                            const { notifyOrderStatusUpdateEmail } = await import('../services/email');

                                            await supabase.from('orders').update({ status: 'ready' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            const updatedOrder = { ...selectedOrder, status: 'ready' };
                                            setSelectedOrder(null); // Fechar a aba

                                            // Multi-channel notifications
                                            notifyCustomer(updatedOrder, 'status_update').catch(e => { });
                                            notifyOrderStatusUpdateEmail(updatedOrder).catch(e => { });
                                            import('../services/whatsapp').then(m => m.notifyCustomerOrderStatusWhatsApp(updatedOrder, updatedOrder.status)).catch(e => { });
                                        }} className={`p-3 rounded-xl text-sm font-bold border transition-all ${selectedOrder.status === 'ready' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white hover:bg-blue-50'}`}>
                                            Pronto (P/ Levantar)
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedOrder.customer.type === 'delivery' && (
                                            <button onClick={() => {
                                                setOrderToAssign(selectedOrder);
                                                // Assuming setActiveView and setSelectedOrder are available in the parent scope
                                                // and that 'logistics' is a valid tab/view to switch to.
                                                setActiveView('logistics'); // Switch to logistics to assign
                                                setSelectedOrder(null); // Close the order modal
                                            }} className="p-3 rounded-xl text-sm font-bold bg-[#3b2f2f] text-[#d9a65a] hover:brightness-110">
                                                Enviar p/ Entrega
                                            </button>
                                        )}
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            const { notifyCustomer } = await import('../services/sms');
                                            const { notifyOrderStatusUpdateEmail } = await import('../services/email');

                                            await supabase.from('orders').update({ status: 'completed' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            const updatedOrder = { ...selectedOrder, status: 'completed' };
                                            setSelectedOrder(null); // Fechar a aba

                                            // Multi-channel notifications
                                            notifyCustomer(updatedOrder, 'status_update').catch(e => { });
                                            notifyOrderStatusUpdateEmail(updatedOrder).catch(e => { });
                                            import('../services/whatsapp').then(m => m.notifyCustomerOrderStatusWhatsApp(updatedOrder, updatedOrder.status)).catch(e => { });
                                        }} className="p-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700">
                                            Concluir Pedido
                                        </button>
                                    </div>
                                    <div className="mt-3">
                                        <button onClick={async () => {
                                            const { supabase } = await import('../services/supabase');
                                            await supabase.from('orders').update({ status: 'cancelled' }).eq('short_id', selectedOrder.orderId);
                                            loadOrders();
                                            const updatedOrder = { ...selectedOrder, status: 'cancelled' };
                                            setSelectedOrder(updatedOrder);

                                            // Multi-channel notifications
                                            const { notifyCustomer } = await import('../services/sms');
                                            const { notifyOrderStatusUpdateEmail } = await import('../services/email');
                                            
                                            notifyCustomer(updatedOrder, 'status_update').catch(e => { });
                                            notifyOrderStatusUpdateEmail(updatedOrder).catch(e => { });
                                            import('../services/whatsapp').then(m => m.notifyCustomerOrderStatusWhatsApp(updatedOrder, updatedOrder.status)).catch(e => { });
                                        }} className="w-full p-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg"> Cancelar Pedido </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {isEditingProduct && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                                <h3 className="font-bold text-lg mb-4 text-[#3b2f2f]">{currentProduct ? 'Editar' : 'Novo'} Produto</h3>
                                <form onSubmit={handleSaveProduct} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome do Produto</label>
                                                <input name="name" defaultValue={currentProduct?.name} placeholder="Ex: Pão de Água" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] focus:ring-4 focus:ring-[#d9a65a]/10 outline-none transition-all font-bold" required />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Categoria</label>
                                                <input name="category" defaultValue={currentProduct?.category || 'Pães'} placeholder="Categoria" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#d9a65a] focus:ring-4 focus:ring-[#d9a65a]/10 outline-none transition-all font-bold" required />
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <h4 className="text-[10px] font-black text-[#d9a65a] uppercase tracking-widest mb-3">Definições Operacionais</h4>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Preço Base (MT)</label>
                                                    <input name="price" type="number" defaultValue={currentProduct?.price} placeholder="0 MT" className="w-full p-2.5 bg-white border border-gray-100 rounded-lg focus:border-[#d9a65a] outline-none text-sm font-bold" required />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Stock Atual</label>
                                                    <input name="stockQuantity" type="number" defaultValue={currentProduct?.stockQuantity} placeholder="0" className="w-full p-2.5 bg-white border border-gray-100 rounded-lg focus:border-[#d9a65a] outline-none text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Tempo Prep.</label>
                                                    <input name="prepTime" defaultValue={currentProduct?.prepTime} placeholder="ex: 20min" className="w-full p-2.5 bg-white border border-gray-100 rounded-lg focus:border-[#d9a65a] outline-none text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Entrega Est.</label>
                                                    <input name="deliveryTime" defaultValue={currentProduct?.deliveryTime} placeholder="ex: 40min" className="w-full p-2.5 bg-white border border-gray-100 rounded-lg focus:border-[#d9a65a] outline-none text-sm font-bold" />
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Configuração IVA</label>
                                                    <select name="taxType" defaultValue={currentProduct?.taxType || 'incluso'} className="w-full p-2.5 bg-white border border-gray-100 rounded-lg focus:border-[#d9a65a] outline-none text-xs font-bold">
                                                        <option value="incluso">IVA Incluso (Padrão)</option>
                                                        <option value="exclusivo">IVA Exclusivo (+16%)</option>
                                                        <option value="isento">Isento de IVA</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Unidade</label>
                                                    <input name="unit" defaultValue={currentProduct?.unit || 'un'} placeholder="Ex: kg, un" className="w-full p-2.5 bg-white border border-gray-100 rounded-lg focus:border-[#d9a65a] outline-none text-xs font-bold" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* English Translations */}
                                        <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Globe size={10} /> English Content
                                            </p>
                                            <div className="space-y-2">
                                                <input name="name_en" defaultValue={currentProduct?.name_en} placeholder="Product Name (English)" className="w-full p-2.5 bg-white border border-blue-50 rounded-lg focus:border-blue-400 outline-none text-sm font-medium" />
                                                <textarea name="description_en" defaultValue={currentProduct?.description_en} placeholder="Description (English)" className="w-full p-2.5 bg-white border border-blue-50 rounded-lg focus:border-blue-400 outline-none text-sm font-medium" rows={2} />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Imagem do Produto</label>
                                            <div className="flex flex-col gap-3">
                                                <input type="file" title="Upload de Imagem" accept="image/*" onChange={handleImageUpload} className="w-full text-xs file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#d9a65a]/10 file:text-[#d9a65a] hover:file:bg-[#d9a65a]/20 cursor-pointer" />
                                                {previewImage && (
                                                    <div className="w-full h-40 rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-100 relative group">
                                                        <img src={previewImage} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <p className="text-white text-[10px] font-black uppercase tracking-widest">Visualização</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Variations Section */}
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Variedades de Tamanho/Tipo</label>
                                                <button type="button" onClick={() => setProductVariations([...productVariations, { name: '', price: 0 }])} title="Adicionar Variedade" className="bg-[#d9a65a]/10 text-[#d9a65a] p-2 rounded-xl hover:bg-[#d9a65a]/20 transition-all flex items-center gap-1 text-[10px] font-black uppercase">
                                                    <Plus size={14} /> Novo
                                                </button>
                                            </div>
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                {productVariations.map((v, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100 animate-fade-in">
                                                        <input value={v.name} title="Nome" onChange={e => { const n = [...productVariations]; n[idx].name = e.target.value; setProductVariations(n); }} placeholder="Pequeno, Médio..." className="flex-1 p-2 bg-white border border-gray-100 rounded-lg text-xs font-bold" />
                                                        <div className="relative">
                                                            <input type="number" title="Preço" value={v.price} onChange={e => { const n = [...productVariations]; n[idx].price = e.target.value; setProductVariations(n); }} placeholder="MT" className="w-24 p-2 pl-7 bg-white border border-gray-100 rounded-lg text-xs font-bold" />
                                                            <span className="absolute left-2 top-2 text-[10px] text-gray-400 font-bold">MT</span>
                                                        </div>
                                                        <button type="button" onClick={() => setProductVariations(productVariations.filter((_, i) => i !== idx))} title="Remover" className="p-2 text-red-100 bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-sm"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                                {productVariations.length === 0 && (
                                                    <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sem Variedades Adicionadas</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" name="inStock" defaultChecked={currentProduct?.inStock} className="sr-only peer" />
                                                <div onClick={(e) => {
                                                    const checkbox = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                                    checkbox.checked = !checkbox.checked;
                                                }} className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                                <span className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Disponível</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setIsEditingProduct(false)} className="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[#3b2f2f] hover:bg-gray-100 transition-all text-[11px]">Cancelar</button>
                                            <button type="submit" className="px-8 py-3 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-black uppercase tracking-widest hover:brightness-110 shadow-lg text-[11px] shadow-[#3b2f2f]/20">Salvar Produto</button>
                                        </div>
                                    </div>
                                </form>

                            </motion.div>
                        </div>
                    )}


                    {/* Driver Modal */}
                    {isAddingDriver && (
                        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
                                <h3 className="text-xl font-bold mb-4">{selectedDriver ? 'Editar Motorista' : 'Novo Motorista'}</h3>
                                <form onSubmit={handleSaveDriver} className="space-y-4">
                                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-white border shadow-sm shrink-0 flex items-center justify-center">
                                            {driverForm.avatar_url ? (
                                                <img src={driverForm.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-8 h-8 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto (Opcional)</label>
                                            <input type="file" title="Foto do Motorista" accept="image/*" onChange={handleDriverImageUpload} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#d9a65a]/10 file:text-[#d9a65a] hover:file:bg-[#d9a65a]/20 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Motorista</label>
                                        <input value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} className="w-full p-3 border rounded-xl" required placeholder="Nome Completo" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone Principal</label>
                                            <input value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} className="w-full p-3 border rounded-xl" required placeholder="+258..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone Alternativo</label>
                                            <input value={driverForm.alternative_phone} onChange={e => setDriverForm({ ...driverForm, alternative_phone: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Opcional" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opcional)</label>
                                        <input type="email" value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="email@exemplo.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Localização Base</label>
                                        <input value={driverForm.base_location} onChange={e => setDriverForm({ ...driverForm, base_location: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Ex: Matola, Maputo, etc." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Veículo</label>
                                        <input value={driverForm.vehicle} onChange={e => setDriverForm({ ...driverForm, vehicle: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Mota, Carro, Bicicleta..." />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setIsAddingDriver(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">Cancelar</button>
                                        <button type="submit" className="flex-1 py-3 bg-[#3b2f2f] text-[#d9a65a] rounded-xl font-bold hover:shadow-lg">Salvar</button>
                                    </div>
                                </form>

                            </div>
                        </div>
                    )
                    }

                    {/* Assign Order Modal */}
                    {
                        orderToAssign && (
                            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
                                    <h3 className="text-xl font-bold mb-4">Atribuir Entrega #{orderToAssign.orderId}</h3>
                                    <p className="text-sm text-gray-500 mb-6">Selecione um motorista para atribuir a entrega. O Motorista será notificado instantaneamente no Portal Web e através de SMS.</p>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {drivers.map(d => (
                                            <div
                                                key={d.id}
                                                onClick={() => setSelectedDriver(d)}
                                                className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${selectedDriver?.id === d.id ? 'border-[#d9a65a] bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}
                                            >
                                                <div>
                                                    <p className="font-bold text-[#3b2f2f]">{d.name}</p>
                                                    <p className="text-xs text-gray-500">{d.vehicle} • {d.status}</p>
                                                </div>
                                                {selectedDriver?.id === d.id && <CheckCircle size={16} className="text-[#d9a65a]" />}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-3 pt-6">
                                        <button
                                            onClick={handleAssignOrder}
                                            disabled={!selectedDriver}
                                            className="w-full bg-[#d9a65a] text-[#3b2f2f] py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={18} /> Atribuir Encomenda
                                        </button>
                                        <button onClick={() => setOrderToAssign(null)} className="w-full bg-gray-100 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Support Ticket Modal */}
                    {isSupportTicketOpen && (
                        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                                <h3 className="text-xl font-bold mb-4 font-serif text-[#3b2f2f]">Abrir Ticket de Suporte</h3>
                                <form onSubmit={handleSupportSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assunto</label>
                                        <input
                                            required
                                            value={supportForm.subject}
                                            onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                                            className="w-full p-3 border rounded-xl focus:border-[#d9a65a] outline-none"
                                            placeholder="Resumo do problema..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Detalhada</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={supportForm.message}
                                            onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                                            className="w-full p-3 border rounded-xl focus:border-[#d9a65a] outline-none"
                                            placeholder="Descreva o erro ou solicitação..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Print Screen (Opcional)</label>
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                            {supportForm.image ? (
                                                <p className="text-sm font-bold text-green-600">{supportForm.image.name}</p>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                                    <p className="text-xs text-gray-500 mt-2">Clique para carregar imagem</p>
                                                </>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && setSupportForm({ ...supportForm, image: e.target.files[0] })} />
                                        </label>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button type="button" onClick={() => setIsSupportTicketOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200">Cancelar</button>
                                        <button type="submit" className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold hover:shadow-lg flex justify-center items-center gap-2">
                                            <Send size={18} /> Enviar Ticket
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-center text-gray-400 mt-2">O ticket será enviado para o WhatsApp e Email da Zyph Tech.</p>
                                </form>
                            </div>
                        </div>
                    )}

                    {showReceiptConfirmation && lastOrderData && (
                        <div className="fixed inset-0 z-[70] bg-[#3b2f2f]/95 backdrop-blur-md flex items-center justify-center p-4">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                                {/* Decorative elements - Removed from Receipt to match standard */}
                                <button
                                    onClick={() => setShowReceiptConfirmation(false)}
                                    className="absolute top-6 right-6 p-3 bg-gray-100 text-gray-400 hover:text-[#3b2f2f] hover:bg-gray-200 rounded-full transition-all z-[80] print:hidden shadow-sm"
                                    title="Fechar"
                                >
                                    <X size={24} />
                                </button>

                                <div className="relative z-10 text-center flex-1 overflow-y-auto p-4 sm:p-8 bg-[#fffbf5] custom-scrollbar" id="pos-receipt-content">
                                    <div className="border-b-2 border-[#d9a65a] pb-6 mb-6 text-center space-y-2 flex flex-col items-center">
                                        <div className="w-32 h-auto mb-2">
                                            <img src="/logo_on_dark.png" alt="Pão Caseiro" className="w-full h-full object-contain" />
                                        </div>
                                        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Padaria, Pastelaria e Café</p>
                                    </div>

                                    <div className="flex justify-between items-start mb-8 text-sm text-left">
                                        <div className="space-y-1">
                                            <p className="text-gray-500 uppercase">CLIENTE</p>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-[#3b2f2f]">{lastOrderData.customer_name || 'Consumidor Final'}</p>
                                                {lastOrderData.customer_id && customers.find(c => c.id === lastOrderData.customer_id)?.internal_id && (
                                                    <span className="text-[10px] font-bold text-[#d9a65a] font-mono">({customers.find(c => c.id === lastOrderData.customer_id)?.internal_id})</span>
                                                )}
                                            </div>
                                            <p className="text-gray-600">{lastOrderData.customer_phone || '+258 -----'}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-gray-500 uppercase">PEDIDO</p>
                                            <p className="font-bold text-[#3b2f2f] text-lg">#{lastOrderData.short_id}</p>

                                            {lastOrderData.payment_ref && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    <p>ID Pagamento:</p>
                                                    <p className="font-mono text-[#3b2f2f]">{lastOrderData.payment_ref}</p>
                                                </div>
                                            )}

                                            <p className="text-gray-600 pt-1">{new Date().toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-100 mb-6 space-y-3 shadow-sm text-left">
                                        <div className="flex items-center gap-2 text-sm font-bold text-[#3b2f2f] border-b pb-2">
                                            {lastOrderData.type === 'delivery' ? <MapPin className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                                            {lastOrderData.type === 'delivery' ? 'Entrega ao Domicílio' : lastOrderData.type === 'pickup' ? 'Levantamento na Loja' : 'Consumo no Local'}
                                        </div>
                                        {lastOrderData.type === 'delivery' && lastOrderData.delivery_address && (
                                            <p className="text-xs text-gray-600 italic">"{lastOrderData.delivery_address}"</p>
                                        )}
                                    </div>

                                    <table className="w-full text-sm mb-6 text-left">
                                        <thead className="text-gray-500 border-b">
                                            <tr>
                                                <th className="text-left py-2 font-normal">Item</th>
                                                <th className="text-center py-2 font-normal">Qtd</th>
                                                <th className="text-right py-2 font-normal">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[#3b2f2f]">
                                            {lastOrderItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="py-3 pr-2">{item.product_name || item.name || <span className="text-gray-300 italic">Artigo</span>}</td>
                                                    <td className="py-3 text-center">{item.quantity}</td>
                                                    <td className="py-3 text-right font-bold w-20">{(item.price * item.quantity).toLocaleString()} MT</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="space-y-2 text-right text-sm">
                                        <div className="flex justify-between text-gray-500">
                                            <span>Subtotal</span>
                                            <span>{lastOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} MT</span>
                                        </div>
                                        {lastOrderData.type === 'delivery' && (
                                            <div className="flex justify-between text-gray-500">
                                                <span>Taxa de Entrega</span>
                                                <span>100 MT</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-xl font-bold text-[#3b2f2f] pt-4 border-t border-[#d9a65a]">
                                            <span>TOTAL</span>
                                            <span>{(lastOrderData.total_amount || 0).toLocaleString()} MT</span>
                                        </div>
                                        <div className="flex justify-between text-green-600 pt-2 font-bold">
                                            <span>Pago</span>
                                            <span>{(lastOrderData.total_amount || 0).toLocaleString()} MT</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t-2 border-dotted border-gray-300 text-center text-xs text-gray-400 space-y-1">
                                        <p>Obrigado pela preferência!</p>
                                        <p className="font-serif italic text-[#d9a65a] text-sm py-2">"{companyInfo?.motto || 'O sabor que aquece o coração'}"</p>
                                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest space-y-1">
                                            <p className="text-[#3b2f2f]">{companyInfo?.name || 'Pão Caseiro'}</p>
                                            <p>{companyInfo?.address || 'Lichinga, Av. Acordo de Lusaka'}</p>
                                            <p>{companyInfo?.phone || '+258 87 914 6662 | +258 84 814 6662'}</p>
                                            <p>{companyInfo?.email || 'geral@paocaseiro.co.mz'}</p>
                                            {companyInfo?.nuit && <p>NUIT: {companyInfo.nuit}</p>}
                                            <p>{companyInfo?.website || 'www.paocaseiro.co.mz'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 pt-6 mt-auto border-t border-gray-100 bg-white p-2">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <button
                                            title="Imprimir Talão"
                                            onClick={async () => {
                                                try {
                                                    await printerService.printReceipt(lastOrderData, lastOrderItems, printerConfig.paperSize);
                                                    alert('Re-imprimindo talão...');
                                                } catch (e: any) {
                                                    alert('Erro na impressão: ' + e.message);
                                                }
                                            }}
                                            className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-[#d9a65a] hover:bg-[#d9a65a]/5 transition-all group"
                                        >
                                            <div className="bg-gray-100 p-3 rounded-2xl text-gray-400 group-hover:text-[#d9a65a] group-hover:bg-white transition-all">
                                                <Printer size={28} />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-[#3b2f2f]">Imprimir</span>
                                        </button>

                                        <button
                                            title="Partilhar Recibo"
                                            onClick={handleShareReceipt}
                                            className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-[#d9a65a] hover:bg-[#d9a65a]/5 transition-all group"
                                        >
                                            <div className="bg-gray-100 p-3 rounded-2xl text-gray-400 group-hover:text-[#d9a65a] group-hover:bg-white transition-all">
                                                <Share2 size={28} />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-[#3b2f2f]">Partilhar</span>
                                        </button>

                                        <button
                                            title="Baixar PDF"
                                            onClick={handleDownloadPDF}
                                            className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-[#d9a65a] hover:bg-[#d9a65a]/5 transition-all group"
                                        >
                                            <div className="bg-gray-100 p-3 rounded-2xl text-gray-400 group-hover:text-[#d9a65a] group-hover:bg-white transition-all">
                                                <Download size={28} />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-[#3b2f2f]">PDF / Talão</span>
                                        </button>

                                        <button
                                            title="Próxima Venda"
                                            onClick={() => {
                                                setShowReceiptConfirmation(false);
                                                setLastOrderData(null);
                                                setLastOrderItems([]);
                                            }}
                                            className="flex flex-col items-center gap-3 p-6 bg-[#3b2f2f] border-2 border-[#3b2f2f] rounded-3xl hover:brightness-110 shadow-xl transition-all group"
                                        >
                                            <div className="bg-[#d9a65a] p-3 rounded-2xl text-[#3b2f2f]">
                                                <Plus size={28} />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-[#d9a65a]">Nova Venda</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {activeView === 'blog' && (
                        <div className="animate-fade-in p-2 md:p-6 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-full">
                            <AdminBlogView />
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {/* Mass POS Add Modal */}
                    {showMassPosModal && (
                        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl relative overflow-hidden">
                                <button onClick={() => setShowMassPosModal(false)} title="Fechar" className="absolute top-8 right-8 text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                                <h3 className="text-2xl font-serif font-black mb-4 text-[#3b2f2f] uppercase tracking-tighter">Venda em Massa</h3>
                                <p className="text-sm text-gray-500 mb-8 font-medium">Introduza os produtos e quantidades para adicionar rapidamente ao carrinho.</p>
                                <textarea
                                    className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2rem] focus:border-[#d9a65a] outline-none mb-6 font-mono text-sm shadow-inner min-h-[250px]"
                                    placeholder="Ex:&#10;Pão de Leite 10&#10;Broa de Milho x5&#10;Bolo de Chocolate"
                                    value={massInput}
                                    onChange={(e) => setMassInput(e.target.value)}
                                ></textarea>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowMassPosModal(false)} className="flex-1 bg-gray-100 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-200 uppercase text-[10px] tracking-widest">Cancelar</button>
                                    <button type="button" onClick={handleMassPosAdd} className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black hover:shadow-xl flex justify-center items-center gap-2 uppercase text-[10px] tracking-widest">
                                        <Plus size={18} /> Adicionar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Mass Stock Add Modal */}
                    {showMassStockModal && (
                        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl relative overflow-hidden">
                                <button onClick={() => setShowMassStockModal(false)} title="Fechar" className="absolute top-8 right-8 text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                                <h3 className="text-2xl font-serif font-black mb-4 text-[#3b2f2f] uppercase tracking-tighter">Stock em Massa</h3>
                                <p className="text-sm text-gray-500 mb-8 font-medium">Use o formato: Nome, Categoria, Preço, Stock</p>
                                <textarea
                                    className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2rem] focus:border-[#d9a65a] outline-none mb-6 font-mono text-sm shadow-inner min-h-[300px]"
                                    placeholder="Ex:&#10;Pão de Leite, Paes, 15, 100&#10;Bolo de Chocolate, Bolos, 450, 10"
                                    value={massInput}
                                    onChange={(e) => setMassInput(e.target.value)}
                                ></textarea>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowMassStockModal(false)} className="flex-1 bg-gray-100 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-200 uppercase text-[10px] tracking-widest">Cancelar</button>
                                    <button type="button" onClick={handleMassStockAdd} className="flex-1 bg-[#3b2f2f] text-[#d9a65a] py-4 rounded-2xl font-black hover:shadow-xl flex justify-center items-center gap-2 uppercase text-[10px] tracking-widest">
                                        <Plus size={18} /> Importar Itens
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Secure Auth Gate Modal */}
                {isAdminPasswordPromptOpen && (
                        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
                                <h3 className="text-xl font-bold font-serif text-[#3b2f2f] mb-2 flex justify-center items-center gap-2">Ação Protegida</h3>
                                <p className="text-xs text-gray-500 mb-6 px-4">Por favor digite a sua palavra-passe de acesso, Administrador {username}.</p>
                                <form onSubmit={handleVerifyAdmin} className="space-y-4">
                                    <input
                                        type="password"
                                        required
                                        autoFocus
                                        placeholder="Sua password de admin..."
                                        value={adminPasswordInput}
                                        onChange={e => setAdminPasswordInput(e.target.value)}
                                        className="w-full p-3 border rounded-xl text-center focus:border-[#d9a65a] outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => { setIsAdminPasswordPromptOpen(false); setPendingAdminAction(null); }} className="flex-1 text-gray-500 bg-gray-100 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                                        <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors">Confirmar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                )}
                {/* Global Notification Toast */}
                <AnimatePresence>
                    {activeToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            onClick={() => {
                                setActiveView('notificacoes');
                                setActiveToast(null);
                            }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-md cursor-pointer"
                        >
                            <div className="bg-[#3b2f2f] text-white p-4 rounded-3xl shadow-2xl border border-[#d9a65a]/30 backdrop-blur-xl flex items-center gap-4 group">
                                <div className="w-12 h-12 bg-[#d9a65a]/20 rounded-2xl flex items-center justify-center shrink-0 border border-[#d9a65a]/20 group-hover:scale-110 transition-transform">
                                    <Bell className="text-[#d9a65a] w-6 h-6 animate-bounce" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[#d9a65a] font-black text-xs uppercase tracking-widest mb-0.5">Novo Alerta de Sistema</h4>
                                    <p className="font-bold text-sm truncate">{activeToast.title}</p>
                                    <p className="text-[10px] text-gray-400 truncate opacity-80">{activeToast.message}</p>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
                                    className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                                
                                {/* Progress bar */}
                                <motion.div 
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: 6, ease: 'linear' }}
                                    className="absolute bottom-0 left-0 h-1 bg-[#d9a65a]/50 rounded-full"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
