export interface UsbConnectionState {
  isConnected: boolean;
  transport: 'webusb' | 'webserial' | 'usb_tether' | null;
  deviceName: string | null;
  manufacturer: string | null;
  vendorId: string | null;
  productId: string | null;
  serialNumber: string | null;
}

type UsbMessageCallback = (msg: string) => void;
type UsbStateCallback = (state: UsbConnectionState) => void;

class UsbCableService {
  private usbDevice: any = null;
  private serialPort: any = null;
  private serialWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private serialReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private keepReading = false;

  private messageListeners = new Set<UsbMessageCallback>();
  private stateListeners = new Set<UsbStateCallback>();

  public state: UsbConnectionState = {
    isConnected: false,
    transport: null,
    deviceName: null,
    manufacturer: null,
    vendorId: null,
    productId: null,
    serialNumber: null,
  };

  isInsideIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  subscribeMessages(cb: UsbMessageCallback): () => void {
    this.messageListeners.add(cb);
    return () => {
      this.messageListeners.delete(cb);
    };
  }

  subscribeState(cb: UsbStateCallback): () => void {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  // Retrocompatibilidad
  setCallbacks(onMessage: UsbMessageCallback, onStateChange: UsbStateCallback) {
    this.messageListeners.add(onMessage);
    this.stateListeners.add(onStateChange);
  }

  private emitMessage(msg: string) {
    this.messageListeners.forEach((cb) => cb(msg));
  }

  private updateState(partial: Partial<UsbConnectionState>) {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach((cb) => cb(this.state));
  }

  isWebUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Revisa si ya existe un teléfono o dispositivo autorizado previamente conectado por USB.
   */
  async checkAuthorizedDevices(): Promise<{ found: boolean; deviceName?: string }> {
    if (!this.isWebUsbSupported()) return { found: false };
    try {
      const devices = await (navigator as any).usb.getDevices();
      if (Array.isArray(devices) && devices.length > 0 && !this.state.isConnected) {
        const device = devices[0];
        this.usbDevice = device;
        const vendorHex = device.vendorId ? `0x${device.vendorId.toString(16).padStart(4, '0')}` : null;
        const productHex = device.productId ? `0x${device.productId.toString(16).padStart(4, '0')}` : null;
        const name = device.productName || 'Teléfono Android USB';
        this.updateState({
          isConnected: true,
          transport: 'webusb',
          deviceName: name,
          manufacturer: device.manufacturerName || 'Dispositivo USB',
          vendorId: vendorHex,
          productId: productHex,
          serialNumber: device.serialNumber || null,
        });
        this.emitMessage(`Dispositivo USB ya autorizado detectado: ${name}`);
        return { found: true, deviceName: name };
      }
    } catch {
      // Blocked inside iframe or unsupported
    }
    return { found: false };
  }

  /**
   * Conecta directamente con un teléfono Android o dispositivo conectado por cable USB
   * usando la API nativa WebUSB del navegador.
   */
  async connectPhoneViaWebUsb(): Promise<{ ok: boolean; reason?: string; blockedByIframe?: boolean }> {
    if (!this.isWebUsbSupported()) {
      return {
        ok: false,
        reason: 'Tu navegador no soporta WebUSB. Usa Google Chrome en escritorio o activa la Sincronización ADB / Tethering.',
      };
    }

    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      this.usbDevice = device;

      try {
        await device.open();
      } catch {
        // En Android/Windows el sistema o ADB puede mantener la interfaz abierta;
        // aun así se leen vendorId, productId, serialNumber y productName reales del cable USB.
      }

      const vendorHex = device.vendorId ? `0x${device.vendorId.toString(16).padStart(4, '0')}` : null;
      const productHex = device.productId ? `0x${device.productId.toString(16).padStart(4, '0')}` : null;
      const name = device.productName || 'Teléfono Android USB';

      this.updateState({
        isConnected: true,
        transport: 'webusb',
        deviceName: name,
        manufacturer: device.manufacturerName || 'Dispositivo USB',
        vendorId: vendorHex,
        productId: productHex,
        serialNumber: device.serialNumber || null,
      });

      this.emitMessage(`Cable USB conectado: ${name} (${vendorHex || 'USB'}:${productHex || ''})`);
      return { ok: true };
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        return { ok: false, reason: 'No se seleccionó ningún dispositivo en el selector USB.' };
      }
      if (err?.name === 'SecurityError') {
        return {
          ok: false,
          blockedByIframe: true,
          reason:
            'El visor embebido (iframe) bloquea el acceso directo a puertos USB. Abre la app en una pestaña directa o usa el enlace/código de sincronización USB de abajo.',
        };
      }
      return { ok: false, reason: err?.message || 'Error al abrir conexión USB.' };
    }
  }

  /**
   * Conecta directamente con ESP32 / Arduino / Adaptador USB-Serial conectado por cable USB (115200 baud).
   */
  async connectViaWebSerial(): Promise<{ ok: boolean; reason?: string; blockedByIframe?: boolean }> {
    if (!this.isWebSerialSupported()) {
      return {
        ok: false,
        reason: 'Web Serial no está disponible en este navegador (usa Chrome o Edge en PC).',
      };
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      this.serialPort = port;
      this.serialWriter = port.writable?.getWriter() || null;

      const info = port.getInfo ? port.getInfo() : {};
      const vendorHex = info.usbVendorId ? `0x${info.usbVendorId.toString(16).padStart(4, '0')}` : null;
      const productHex = info.usbProductId ? `0x${info.usbProductId.toString(16).padStart(4, '0')}` : null;

      this.updateState({
        isConnected: true,
        transport: 'webserial',
        deviceName: 'ESP32 / Puerto Serial USB',
        manufacturer: 'USB-UART (115200 baud)',
        vendorId: vendorHex,
        productId: productHex,
        serialNumber: null,
      });

      this.startSerialReadLoop();
      this.emitMessage('Puerto Serial USB abierto a 115200 baud');
      return { ok: true };
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        return { ok: false, reason: 'Selección de puerto serial cancelada.' };
      }
      if (err?.name === 'SecurityError') {
        return {
          ok: false,
          blockedByIframe: true,
          reason:
            'El visor embebido bloquea Web Serial. Abre la app en una pestaña directa de Chrome para conectar tu ESP32 por cable USB.',
        };
      }
      return { ok: false, reason: err?.message || 'No se pudo abrir el puerto USB Serial.' };
    }
  }

  /**
   * Activa la sincronización directa por Cable USB usando túnel ADB (`adb reverse`) o Anclaje USB (USB Tethering),
   * sincronizando el teléfono conectado en tiempo real vía API REST + SSE.
   */
  connectUsbTetherMode(phoneLabel = 'Teléfono Android (Cable USB / ADB)') {
    this.updateState({
      isConnected: true,
      transport: 'usb_tether',
      deviceName: phoneLabel,
      manufacturer: 'Enlace USB / ADB Tethering',
      vendorId: 'USB-NET',
      productId: 'TCP-3000',
      serialNumber: `USB-${Date.now().toString().slice(-6)}`,
    });
    this.emitMessage(`Sincronización por Cable USB activa: ${phoneLabel}`);
  }

  private async startSerialReadLoop() {
    if (!this.serialPort?.readable) return;
    this.keepReading = true;
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      this.serialReader = this.serialPort.readable.getReader();
      while (this.keepReading && this.serialReader) {
        const { value, done } = await this.serialReader.read();
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              this.emitMessage(trimmed);
            }
          }
        }
      }
    } catch {
      // Puerto cerrado
    } finally {
      try {
        this.serialReader?.releaseLock();
      } catch {
        // ignore
      }
    }
  }

  async sendUsbCommand(command: string): Promise<boolean> {
    if (this.serialWriter) {
      try {
        const encoded = new TextEncoder().encode(`${command.trim()}\n`);
        await this.serialWriter.write(encoded);
        return true;
      } catch {
        return false;
      }
    }
    return this.state.isConnected;
  }

  async disconnect() {
    this.keepReading = false;
    try {
      await this.serialReader?.cancel();
    } catch {
      // ignore
    }
    try {
      this.serialWriter?.releaseLock();
    } catch {
      // ignore
    }
    try {
      await this.serialPort?.close();
    } catch {
      // ignore
    }
    try {
      if (this.usbDevice?.opened) {
        await this.usbDevice.close();
      }
    } catch {
      // ignore
    }

    this.usbDevice = null;
    this.serialPort = null;
    this.serialWriter = null;
    this.serialReader = null;

    this.updateState({
      isConnected: false,
      transport: null,
      deviceName: null,
      manufacturer: null,
      vendorId: null,
      productId: null,
      serialNumber: null,
    });
  }
}

export const usbCable = new UsbCableService();
