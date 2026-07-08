import { hostingerService } from './hostingerService';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface MZPrinterPluginType {
    isBuiltInPrinterAvailable(): Promise<{ available: boolean; type: 'sunmi' | 'usb' | 'none'; deviceName?: string }>;
    printRaw(options: { base64Data: string }): Promise<{ success: boolean }>;
}

const MZPrinterPlugin = registerPlugin<MZPrinterPluginType>('MZPrinterPlugin');


export interface PrinterConfig {
    type: 'usb' | 'bluetooth';
    paperSize: '58mm' | '80mm';
    autoPrint: boolean;
}

export interface TicketCustomization {
    logo_url: string;
    company_name: string;
    header: string;
    footer: string;
    thanks_msg: string;
    font_size_title: 'standard' | 'double' | 'large' | 'extralarge';
    font_size_number: 'standard' | 'double' | 'large' | 'extralarge';
    text_align: 'left' | 'center' | 'right';
    paper_width: '58mm' | '80mm';
    margins: string; // e.g. "0" or "5"
    qr_visible: boolean;
    barcode_visible: boolean;
    logo_visible?: boolean;
}

const DEFAULT_CUSTOMIZATION: TicketCustomization = {
    logo_url: '/assets/ui/logo.png',
    company_name: 'PÃO CASEIRO',
    header: 'Queue Management System',
    footer: 'Lichinga, Niassa • Tel: +258 87 9146 662',
    thanks_msg: 'O Sabor que Aquece o Coração',
    font_size_title: 'large',
    font_size_number: 'extralarge',
    text_align: 'center',
    paper_width: '80mm',
    margins: '0',
    qr_visible: true,
    barcode_visible: true,
    logo_visible: true
};

async function getLogoBytes(logoUrl: string, maxWidth: number = 180): Promise<Uint8Array | null> {
    if (typeof window === 'undefined') return null;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);

                const scale = maxWidth / img.width;
                const width = maxWidth;
                const height = Math.round(img.height * scale);

                canvas.width = Math.ceil(width / 8) * 8;
                canvas.height = height;

                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imgData.data;

                const bytesWidth = canvas.width / 8;
                const escPosData = new Uint8Array(8 + bytesWidth * canvas.height);

                escPosData[0] = 0x1D;
                escPosData[1] = 0x76;
                escPosData[2] = 0x30;
                escPosData[3] = 0x00;
                escPosData[4] = bytesWidth & 0xFF;
                escPosData[5] = (bytesWidth >> 8) & 0xFF;
                escPosData[6] = canvas.height & 0xFF;
                escPosData[7] = (canvas.height >> 8) & 0xFF;

                let offset = 8;
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x += 8) {
                        let byte = 0;
                        for (let bit = 0; bit < 8; bit++) {
                            const pxIdx = ((y * canvas.width) + (x + bit)) * 4;
                            const r = pixels[pxIdx];
                            const g = pixels[pxIdx + 1];
                            const b = pixels[pxIdx + 2];
                            const a = pixels[pxIdx + 3];

                            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                            const isBlack = a > 50 && luminance < 128;

                            if (isBlack) {
                                byte |= (1 << (7 - bit));
                            }
                        }
                        escPosData[offset++] = byte;
                    }
                }
                resolve(escPosData);
            } catch (err) {
                console.error('[Printer] Error converting logo to bitmap:', err);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.warn('[Printer] Could not load logo image for print:', logoUrl);
            resolve(null);
        };
        
        if (logoUrl.startsWith('/') && typeof window !== 'undefined') {
            img.src = window.location.origin + logoUrl;
        } else {
            img.src = logoUrl;
        }
    });
}
export class PrinterService {
    private usbDevice: USBDevice | null = null;
    private usbEndpointOut: number = 1;
    private usbInterfaceNumber: number = 0;
    
    private bluetoothDevice: any = null;
    private bluetoothServer: any = null;
    private characteristic: any = null;
    
    private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
    private statusListeners: Array<(status: 'disconnected' | 'connecting' | 'connected') => void> = [];
    private activeConfig: PrinterConfig | null = null;

    private isBuiltInAvailable: boolean = false;
    private builtInType: 'sunmi' | 'usb' | 'none' = 'none';

    constructor() {
        if (typeof window !== 'undefined' && 'usb' in navigator) {
            navigator.usb.addEventListener('disconnect', (event) => {
                if (this.usbDevice && event.device === this.usbDevice) {
                    console.warn('[Printer] USB Device disconnected');
                    this.handleDisconnect();
                }
            });
            // Try auto-connecting on init
            this.autoConnectUSB();
        }
        this.detectBuiltInPrinter();
    }

    private async detectBuiltInPrinter() {
        if (typeof window !== 'undefined' && Capacitor && Capacitor.isNativePlatform()) {
            try {
                const res = await MZPrinterPlugin.isBuiltInPrinterAvailable();
                if (res && res.available) {
                    this.isBuiltInAvailable = true;
                    this.builtInType = res.type;
                    console.log(`[Printer] Built-in printer detected: ${res.type}`);
                    if (!this.activeConfig) {
                        this.updateStatus('connected');
                    }
                }
            } catch (e) {
                console.warn('[Printer] Error detecting built-in printer:', e);
            }
        }
    }


    registerStatusListener(listener: (status: 'disconnected' | 'connecting' | 'connected') => void) {
        this.statusListeners.push(listener);
        listener(this.connectionStatus);
    }

    unregisterStatusListener(listener: (status: 'disconnected' | 'connecting' | 'connected') => void) {
        this.statusListeners = this.statusListeners.filter(l => l !== listener);
    }

    private updateStatus(status: 'disconnected' | 'connecting' | 'connected') {
        this.connectionStatus = status;
        this.statusListeners.forEach(listener => {
            try {
                listener(status);
            } catch (e) {
                console.error('[Printer] Status listener error:', e);
            }
        });
    }

    getConnectionStatus() {
        return this.connectionStatus;
    }

    isConnected() {
        if (this.isBuiltInAvailable && !this.activeConfig) {
            return true;
        }
        return this.connectionStatus === 'connected';
    }

    private handleDisconnect() {
        this.usbDevice = null;
        this.characteristic = null;
        this.bluetoothDevice = null;
        this.bluetoothServer = null;
        this.updateStatus('disconnected');
    }

    async connect(config: PrinterConfig) {
        this.activeConfig = config;
        this.updateStatus('connecting');
        if (config.type === 'bluetooth') {
            return this.connectBluetooth();
        } else {
            return this.connectUSB();
        }
    }

    private async connectBluetooth() {
        try {
            // @ts-ignore
            this.bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            this.bluetoothServer = await this.bluetoothDevice.gatt.connect();
            const service = await this.bluetoothServer.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            this.updateStatus('connected');
            return true;
        } catch (error) {
            console.error('Bluetooth connection failed:', error);
            this.handleDisconnect();
            throw error;
        }
    }

    private async connectUSB() {
        try {
            // Prompt user to select printer if not already selected
            // We search for printer class devices { classCode: 7 }
            this.usbDevice = await navigator.usb.requestDevice({ filters: [] });
            await this.setupUSBDevice();
            this.updateStatus('connected');
            return true;
        } catch (error) {
            console.error('USB connection failed:', error);
            this.handleDisconnect();
            throw error;
        }
    }

    private async autoConnectUSB() {
        try {
            const devices = await navigator.usb.getDevices();
            if (devices.length > 0) {
                console.log('[Printer] Found paired USB devices, auto-connecting...');
                this.usbDevice = devices[0];
                await this.setupUSBDevice();
                this.updateStatus('connected');
            }
        } catch (e) {
            console.warn('[Printer] Auto USB connection failed:', e);
        }
    }

    private async setupUSBDevice() {
        if (!this.usbDevice) return;
        await this.usbDevice.open();
        
        if (this.usbDevice.configuration === null) {
            await this.usbDevice.selectConfiguration(1);
        }

        let interfaceNumber = -1;
        let endpointOut = -1;

        // Traverse interfaces to find printer class or any bulk out endpoint
        const interfaces = this.usbDevice.configuration.interfaces;
        
        // Phase 1: Try to find interface with classCode 7 (Printer) and an OUT endpoint
        for (const iface of interfaces) {
            for (const alt of iface.alternates) {
                if (alt.interfaceClass === 7) {
                    const outEndpoint = alt.endpoints.find(e => e.direction === 'out');
                    if (outEndpoint) {
                        interfaceNumber = iface.interfaceNumber;
                        endpointOut = outEndpoint.endpointNumber;
                        console.log(`[Printer] Found printer class interface: ${interfaceNumber}, endpoint: ${endpointOut}`);
                        break;
                    }
                }
            }
            if (interfaceNumber !== -1) break;
        }

        // Phase 2: If no class 7 printer interface is found, search for ANY interface that has an OUT endpoint
        if (interfaceNumber === -1) {
            for (const iface of interfaces) {
                for (const alt of iface.alternates) {
                    const outEndpoint = alt.endpoints.find(e => e.direction === 'out');
                    if (outEndpoint) {
                        interfaceNumber = iface.interfaceNumber;
                        endpointOut = outEndpoint.endpointNumber;
                        console.log(`[Printer] Fallback to any OUT endpoint interface: ${interfaceNumber}, endpoint: ${endpointOut}`);
                        break;
                    }
                }
                if (interfaceNumber !== -1) break;
            }
        }

        // Phase 3: Absolute fallback
        if (interfaceNumber === -1) {
            interfaceNumber = 0;
            endpointOut = 1;
            console.warn(`[Printer] No OUT endpoint found in device configuration, using defaults (interface: 0, endpoint: 1)`);
        }

        await this.usbDevice.claimInterface(interfaceNumber);
        this.usbInterfaceNumber = interfaceNumber;
        this.usbEndpointOut = endpointOut;
    }

    async writeRaw(data: Uint8Array) {
        if (this.isBuiltInAvailable && !this.activeConfig) {
            try {
                let binary = '';
                const len = data.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(data[i]);
                }
                const base64Data = window.btoa(binary);
                await MZPrinterPlugin.printRaw({ base64Data });
                return;
            } catch (err) {
                console.error('[Printer] Built-in print failed:', err);
                throw err;
            }
        }

        if (!this.isConnected()) {
            throw new Error('A impressora não está conectada. Por favor, conecte a impressora primeiro.');
        }
        if (this.characteristic) {
            // Bluetooth characteristic chunks
            const chunkSize = 100;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                await this.characteristic.writeValue(chunk);
            }
        } else if (this.usbDevice) {
            try {
                await this.usbDevice.transferOut(this.usbEndpointOut, data);
            } catch (err) {
                console.error('[Printer] Transfer error, trying to auto-recover...', err);
                await this.setupUSBDevice(); // Auto-reconnect/re-claim interface
                await this.usbDevice.transferOut(this.usbEndpointOut, data);
            }
        } else {
            console.warn('[Printer Simulation Output]:\n' + new TextDecoder('utf-8').decode(data));
        }
    }

    async openCashDrawer() {
        // ESC/POS: ESC p m t1 t2
        const openDrawerCommand = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        await this.writeRaw(openDrawerCommand);
    }

    async cutPaper() {
        // Partial cut: GS V 66 16
        const cutCommand = new Uint8Array([0x1D, 0x56, 0x42, 0x10]);
        await this.writeRaw(cutCommand);
    }

    async fetchCustomizationSettings(): Promise<TicketCustomization> {
        try {
            const settings = await hostingerService.getSettings('ticket_customization');
            if (settings && settings.success && settings.data && settings.data.length > 0) {
                const parsed = typeof settings.data[0].value === 'string'
                    ? JSON.parse(settings.data[0].value)
                    : settings.data[0].value;
                return { ...DEFAULT_CUSTOMIZATION, ...parsed };
            }
        } catch (e) {
            console.warn('[Printer] Failed to fetch settings from server, falling back to local defaults', e);
        }
        
        // Fallback to localstorage
        try {
            const saved = localStorage.getItem('ticket_customization');
            if (saved) {
                return { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(saved) };
            }
        } catch (e) {}

        return DEFAULT_CUSTOMIZATION;
    }

    async printTicket(ticket: any) {
        const customization = await this.fetchCustomizationSettings();
        const encoder = new TextEncoder();
        
        // Command buffers
        let commands = new Uint8Array([0x1B, 0x40]); // Initialize

        const concat = (newBytes: Uint8Array) => {
            const temp = new Uint8Array(commands.length + newBytes.length);
            temp.set(commands);
            temp.set(newBytes, commands.length);
            commands = temp;
        };

        const addText = (text: string, align: 'left' | 'center' | 'right' = 'left', sizeCode: number = 0x00) => {
            // Align
            let alignVal = 0x00;
            if (align === 'center') alignVal = 0x01;
            if (align === 'right') alignVal = 0x02;
            concat(new Uint8Array([0x1B, 0x61, alignVal]));

            // Font size: GS ! n
            concat(new Uint8Array([0x1D, 0x21, sizeCode]));

            concat(encoder.encode(text + '\n'));
        };

        // Size configurations mapping
        const sizeMap = {
            standard: 0x00,
            double: 0x11, // double width + height
            large: 0x22,
            extralarge: 0x33
        };

        const align = customization.text_align || 'center';
        const titleSize = sizeMap[customization.font_size_title] || 0x22;
        const numberSize = sizeMap[customization.font_size_number] || 0x33;

        // Set left margin if specified
        const marginVal = parseInt(customization.margins || '0', 10);
        if (marginVal > 0) {
            // GS L nL nH
            concat(new Uint8Array([0x1D, 0x4C, marginVal & 0xFF, (marginVal >> 8) & 0xFF]));
        }

        // Prepend Logo if visible
        if (customization.logo_visible !== false && customization.logo_url) {
            try {
                const maxWidth = customization.paper_width === '58mm' ? 160 : 240;
                const logoBytes = await getLogoBytes(customization.logo_url, maxWidth);
                if (logoBytes) {
                    concat(new Uint8Array([0x1B, 0x61, 0x01])); // center
                    concat(logoBytes);
                    concat(encoder.encode('\n'));
                }
            } catch (err) {
                console.warn('[Printer] Could not print logo image:', err);
            }
        }

        // 1. Company Name
        if (customization.company_name) {
            addText(customization.company_name.toUpperCase(), align, titleSize);
        }

        // 2. Header Message
        if (customization.header) {
            addText(customization.header, align, 0x00);
        }

        // Separator line
        const separator = customization.paper_width === '58mm' ? '--------------------------------' : '------------------------------------------------';
        addText(separator, align, 0x00);

        // 3. Category & Priority
        const categoryLabel = (ticket.category || 'GERAL').toUpperCase();
        addText(`FILA: ${categoryLabel}`, align, 0x11);
        if (ticket.is_priority || ticket.priority) {
            addText('** ATENDIMENTO PRIORITÁRIO **', align, 0x11);
        }
        addText('', align, 0x00);

        // 4. Ticket Number
        const ticketNum = ticket.ticket_number || ticket.number || '000';
        addText(ticketNum.toString(), align, numberSize);
        addText('', align, 0x00);

        // 5. Date & Time
        const ticketDate = new Date(ticket.created_at || Date.now());
        const dateStr = ticketDate.toLocaleDateString('pt-PT');
        const timeStr = ticketDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        addText(`Data: ${dateStr}`, align, 0x00);
        addText(`Hora de Retirada: ${timeStr}`, align, 0x00);
        addText(separator, align, 0x00);

        // 6. QR Code (Ticket ID)
        if (customization.qr_visible && ticket.id) {
            addText('Consulte o status da senha:', align, 0x00);
            
            // Align center before QR Code
            concat(new Uint8Array([0x1B, 0x61, 0x01]));
            
            const qrText = `https://paocaseiro.co.mz/get-ticket?id=${ticket.id}`;
            const dataBytes = encoder.encode(qrText);
            const dataLength = dataBytes.length + 3;
            const lenLow = dataLength & 0xFF;
            const lenHigh = (dataLength >> 8) & 0xFF;

            const modelCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
            const sizeCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]); // dot size
            const errCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x44, 0x31]);  // error correction M
            
            const storeHeader = new Uint8Array([0x1D, 0x28, 0x6B, lenLow, lenHigh, 0x31, 0x50, 0x30]);
            const storeCmd = new Uint8Array(storeHeader.length + dataBytes.length);
            storeCmd.set(storeHeader);
            storeCmd.set(dataBytes, storeHeader.length);

            const printCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);

            concat(modelCmd);
            concat(sizeCmd);
            concat(errCmd);
            concat(storeCmd);
            concat(printCmd);
            addText('', align, 0x00);
        }

        // 7. Barcode
        if (customization.barcode_visible && ticket.id) {
            // Align center
            concat(new Uint8Array([0x1B, 0x61, 0x01]));
            
            const cleanId = ticket.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15).toUpperCase();
            const dataBytes = encoder.encode(cleanId);
            
            const hriCmd = new Uint8Array([0x1D, 0x48, 0x02]); // HRI chars below barcode
            const heightCmd = new Uint8Array([0x1D, 0x68, 0x3C]); // Height 60 dots
            const widthCmd = new Uint8Array([0x1D, 0x77, 0x02]);  // Width 2 dots
            
            const barcodeHeader = new Uint8Array([0x1D, 0x6B, 0x04]); // CODE39
            const printCmd = new Uint8Array(barcodeHeader.length + dataBytes.length + 1);
            printCmd.set(barcodeHeader);
            printCmd.set(dataBytes, barcodeHeader.length);
            printCmd[printCmd.length - 1] = 0x00;

            concat(hriCmd);
            concat(heightCmd);
            concat(widthCmd);
            concat(printCmd);
            addText('', align, 0x00);
        }

        // 8. Thank-you Message
        if (customization.thanks_msg) {
            addText(customization.thanks_msg, align, 0x00);
        }

        // 9. Custom Footer
        if (customization.footer) {
            addText(customization.footer, align, 0x00);
        }

        // Spacing feeds
        concat(encoder.encode('\n\n\n\n'));

        // Cut Command
        // GS V 65 0 (feeds and performs full cut)
        const cutCmd = new Uint8Array([0x1D, 0x56, 0x41, 0x10]);
        concat(cutCmd);

        // Send to hardware printer channel
        await this.writeRaw(commands);
    }

    async printReceipt(order: any, items: any[], type: '58mm' | '80mm' = '58mm') {
        const customization = await this.fetchCustomizationSettings();
        const encoder = new TextEncoder();
        let commands = new Uint8Array([0x1B, 0x40]); // Initialize

        const concat = (newBytes: Uint8Array) => {
            const temp = new Uint8Array(commands.length + newBytes.length);
            temp.set(commands);
            temp.set(newBytes, commands.length);
            commands = temp;
        };

        const addText = (text: string, align: 'left' | 'center' | 'right' = 'left', bold: boolean = false) => {
            let alignVal = 0x00;
            if (align === 'center') alignVal = 0x01;
            if (align === 'right') alignVal = 0x02;
            concat(new Uint8Array([0x1B, 0x61, alignVal]));
            
            // Bold
            concat(new Uint8Array([0x1B, 0x45, bold ? 0x01 : 0x00]));
            concat(encoder.encode(text + '\n'));
        };

        if (order.payment_method === 'cash') {
            await this.openCashDrawer();
        }

        // Prepend Logo if visible
        if (customization.logo_visible !== false && customization.logo_url) {
            try {
                const maxWidth = type === '58mm' ? 160 : 240;
                const logoBytes = await getLogoBytes(customization.logo_url, maxWidth);
                if (logoBytes) {
                    concat(new Uint8Array([0x1B, 0x61, 0x01])); // center
                    concat(logoBytes);
                    concat(encoder.encode('\n'));
                }
            } catch (err) {
                console.warn('[Printer] Could not print logo image:', err);
            }
        }

        // Header
        addText('PAO CASEIRO', 'center', true);
        addText('"O Sabor que aquece"', 'center');
        addText(type === '58mm' ? '-----------------------' : '---------------------------------------', 'center');
        addText(`Ped: #${order.short_id || order.id?.substring(0, 8)}`, 'left');
        addText(`Data: ${new Date(order.created_at || Date.now()).toLocaleString()}`, 'left');
        addText(type === '58mm' ? '-----------------------' : '---------------------------------------', 'center');

        // Items
        items.forEach(item => {
            const productName = item.product_name || item.name || 'Produto';
            const qtyPrice = `${item.quantity}x ${productName.substring(0, 16)}`;
            const total = `${(item.price * item.quantity).toLocaleString()} MT`;
            
            if (type === '58mm') {
                addText(`${qtyPrice} ${total}`, 'left');
            } else {
                // Pad to line width
                const spaces = Math.max(1, 40 - qtyPrice.length - total.length);
                addText(`${qtyPrice}${' '.repeat(spaces)}${total}`, 'left');
            }
        });

        addText(type === '58mm' ? '-----------------------' : '---------------------------------------', 'center');
        addText(`TOTAL: ${Number(order.total_amount || order.total).toLocaleString()} MT`, 'right', true);
        addText(type === '58mm' ? '-----------------------' : '---------------------------------------', 'center');
        addText(`Recebido: ${Number(order.amount_received || order.total_amount || order.total).toLocaleString()} MT`, 'right');
        addText(`Troco: ${Number(order.change_given || 0).toLocaleString()} MT`, 'right');
        addText('\n\n\n\n');

        // Cut command
        concat(new Uint8Array([0x1D, 0x56, 0x41, 0x10]));
        await this.writeRaw(commands);
    }

    async printTestPage() {
        const order = {
            short_id: 'TESTE',
            total_amount: 150,
            amount_received: 200,
            change_given: 50,
            payment_method: 'cash'
        };
        const items = [
            { name: 'Pão de Ló', price: 100, quantity: 1 },
            { name: 'Café Simples', price: 50, quantity: 1 }
        ];
        try {
            await this.printReceipt(order, items, this.activeConfig?.paperSize || '80mm');
        } catch (e) {
            console.warn('Direct test print failed, falling back to browser printing:', e);
            this.printReceiptBrowser(order, items, this.activeConfig?.paperSize || '80mm');
        }
    }

    printReceiptBrowser(order: any, items: any[], type: '58mm' | '80mm' = '58mm') {
        if (typeof window === 'undefined') return;
        const printWindow = window.open('', '_blank', 'width=600,height=800');
        if (!printWindow) {
            alert('Por favor, permita popups para habilitar a impressão manual.');
            return;
        }

        const paperWidth = type === '58mm' ? '58mm' : '80mm';
        const dateStr = new Date(order.created_at || Date.now()).toLocaleString();
        const shortId = order.short_id || order.id?.substring(0, 8);

        let itemsHtml = '';
        items.forEach(item => {
            const productName = item.product_name || item.name || 'Produto';
            const total = `${(item.price * item.quantity).toLocaleString()} MT`;
            itemsHtml += `
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
                    <span>${item.quantity}x ${productName}</span>
                    <span>${total}</span>
                </div>
            `;
        });

        printWindow.document.write(`
            <html>
            <head>
                <title>Pedido #${shortId}</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        margin: 0;
                        padding: 5px;
                        width: ${paperWidth};
                        color: #000;
                        background-color: #fff;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                    @media print {
                        body { width: ${paperWidth}; }
                        @page { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="text-center font-bold" style="font-size: 16px;">PAO CASEIRO</div>
                <div class="text-center" style="font-size: 12px;">"O Sabor que aquece"</div>
                <div class="divider"></div>
                <div style="font-size: 12px;">
                    <div>Ped: #${shortId}</div>
                    <div>Data: ${dateStr}</div>
                </div>
                <div class="divider"></div>
                ${itemsHtml}
                <div class="divider"></div>
                <div class="text-right font-bold" style="font-size: 14px;">TOTAL: ${Number(order.total_amount || order.total).toLocaleString()} MT</div>
                <div class="divider"></div>
                <div class="text-right" style="font-size: 12px;">Recebido: ${Number(order.amount_received || order.total_amount || order.total).toLocaleString()} MT</div>
                <div class="text-right" style="font-size: 12px;">Troco: ${Number(order.change_given || 0).toLocaleString()} MT</div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }


    async printClosingReport(session: any, orders: any[], username: string) {
        const encoder = new TextEncoder();
        let commands = new Uint8Array([0x1B, 0x40]); // Initialize

        const concat = (newBytes: Uint8Array) => {
            const temp = new Uint8Array(commands.length + newBytes.length);
            temp.set(commands);
            temp.set(newBytes, commands.length);
            commands = temp;
        };

        const addText = (text: string, align: 'left' | 'center' | 'right' = 'left', bold: boolean = false) => {
            let alignVal = 0x00;
            if (align === 'center') alignVal = 0x01;
            if (align === 'right') alignVal = 0x02;
            concat(new Uint8Array([0x1B, 0x61, alignVal]));
            concat(new Uint8Array([0x1B, 0x45, bold ? 0x01 : 0x00]));
            concat(encoder.encode(text + '\n'));
        };

        addText('PAO CASEIRO', 'center', true);
        addText('RELATORIO DE FECHO', 'center', true);
        addText('-----------------------', 'center');
        addText(`Sessao: ${session.id?.substring(3).toUpperCase()}`, 'left');
        addText(`Operador: ${username}`, 'left');
        addText(`Abertura: ${new Date(session.opened_at).toLocaleString()}`, 'left');
        addText(`Fecho: ${new Date().toLocaleString()}`, 'left');
        addText('-----------------------', 'center');

        const totalCashSales = orders.reduce((sum: number, o: any) => {
            if (o.payment_method === 'cash' || o.payment_method === 'DINHEIRO') {
                return sum + Number(o.total_amount || o.total);
            }
            return sum;
        }, 0);

        const totalOtherSales = orders.reduce((sum: number, o: any) => {
            if (o.payment_method !== 'cash' && o.payment_method !== 'DINHEIRO') {
                return sum + Number(o.total_amount || o.total);
            }
            return sum;
        }, 0);

        const expectedBalance = Number(session.opening_balance) + totalCashSales;
        const closingBal = Number(session.closing_balance || expectedBalance);

        addText(`Saldo Inicial: ${session.opening_balance} MT`, 'left');
        addText(`Vendas Dinheiro: ${totalCashSales} MT`, 'left');
        addText(`Outras Vendas: ${totalOtherSales} MT`, 'left');
        addText(`Saldo Esperado: ${expectedBalance} MT`, 'left');
        addText(`Saldo Declarado: ${closingBal} MT`, 'left');
        addText(`Diferenca: ${closingBal - expectedBalance} MT`, 'left', true);
        addText('-----------------------', 'center');
        addText(`Notas: ${session.notes || 'Nenhuma'}`, 'left');
        addText('\n\n\n\n');

        // Cut
        concat(new Uint8Array([0x1D, 0x56, 0x41, 0x10]));
        await this.writeRaw(commands);
    }
}

export const printerService = new PrinterService();
