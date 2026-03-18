export interface PrinterConfig {
    type: 'usb' | 'bluetooth';
    paperSize: '58mm' | '80mm';
    autoPrint: boolean;
}

export class PrinterService {
    private device: any = null;
    private server: any = null;
    private characteristic: any = null;

    async connect(config: PrinterConfig) {
        if (config.type === 'bluetooth') {
            return this.connectBluetooth();
        } else {
            return this.connectUSB();
        }
    }

    private async connectBluetooth() {
        try {
            // @ts-ignore
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Standard printer service
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            this.server = await this.device.gatt.connect();
            const service = await this.server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            return true;
        } catch (error) {
            console.error('Bluetooth connection failed:', error);
            throw error;
        }
    }

    private async connectUSB() {
        try {
            // @ts-ignore
            const devices = await navigator.usb.getDevices();
            // Just a placeholder for now as USB requires specific implementation 
            // per OS/browser or a local agent. WebUSB is limited.
            console.log("USB devices available:", devices);
            return true;
        } catch (error) {
            console.error('USB connection failed:', error);
            throw error;
        }
    }

    async openCashDrawer() {
        // ESC/POS command to open cash drawer: ESC p m t1 t2
        // m = 0 (pin 2), t1 = 25, t2 = 250
        const openDrawerCommand = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);

        if (this.characteristic) {
            try {
                await this.characteristic.writeValue(openDrawerCommand);
            } catch (e) {
                console.error("Failed to open cash drawer", e);
            }
        } else {
            console.log("Cash drawer command (simulated): [0x1B, 0x70, 0x00, 0x19, 0xFA]");
        }
    }

    async printReceipt(order: any, items: any[], type: '58mm' | '80mm' = '58mm') {
        const encoder = new TextEncoder();
        let commands = new Uint8Array([0x1B, 0x40]); // Initialize

        if (order.payment_method === 'cash') {
            await this.openCashDrawer();
        }

        const addText = (text: string) => {
            const encoded = encoder.encode(text + '\n');
            const newCommands = new Uint8Array(commands.length + encoded.length);
            newCommands.set(commands);
            newCommands.set(encoded, commands.length);
            commands = newCommands;
        };

        // Header
        addText('     PAO CASEIRO');
        addText('  "O Sabor que aquece"');
        addText('-----------------------');
        addText(`Ped: #${order.short_id}`);
        addText(`Data: ${new Date(order.created_at || Date.now()).toLocaleString()}`);
        addText('-----------------------');

        // Items
        items.forEach(item => {
            const productName = item.product_name || item.name || 'Produto';
            const line = `${item.quantity}x ${productName.substring(0, 12)} ${item.price * item.quantity}`;
            addText(line);
        });

        addText('-----------------------');
        addText(`TOTAL: ${order.total_amount} MT`);
        addText('-----------------------');
        addText(`Recebido: ${order.amount_received || order.total_amount} MT`);
        addText(`Troco: ${order.change_given || 0} MT`);
        addText('\n\n\n');

        // Cut command (if supported)
        const cut = new Uint8Array([0x1D, 0x56, 0x41, 0x10]);
        const final = new Uint8Array(commands.length + cut.length);
        final.set(commands);
        final.set(cut, commands.length);

        if (this.characteristic) {
            await this.characteristic.writeValue(final);
        } else {
            console.log("Printing to console (no printer connected):\n", new TextDecoder().decode(commands));
        }
    }

    async printTestPage() {
        const order = {
            short_id: 'TEST',
            total_amount: 0,
            amount_received: 0,
            change_given: 0
        };
        const items = [{ name: 'Pagina de Teste', price: 0, quantity: 1 }];
        return this.printReceipt(order, items);
    }

    isConnected() {
        return !!this.characteristic;
    }
}

export const printerService = new PrinterService();
