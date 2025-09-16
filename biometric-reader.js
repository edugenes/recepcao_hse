const HID = require('node-hid');
const EventEmitter = require('events');
const { execSync } = require('child_process');

class DigitalPersonaReader extends EventEmitter {
    constructor() {
        super();
        this.device = null;
        this.isConnected = false;
        this.isCapturing = false;
    }

    // Detectar dispositivos Digital Persona
    detectDevices() {
        try {
            const devices = HID.devices();
            console.log('Todos os dispositivos HID encontrados:', devices.length);
            
            // Log de todos os dispositivos para debug
            devices.forEach((device, index) => {
                console.log(`Dispositivo ${index}:`, {
                    vendorId: `0x${device.vendorId?.toString(16).toUpperCase()}`,
                    productId: `0x${device.productId?.toString(16).toUpperCase()}`,
                    manufacturer: device.manufacturer,
                    product: device.product,
                    path: device.path
                });
            });
            
            const digitalPersonaDevices = devices.filter(device => {
                const isMatch = device.vendorId === 0x05BA || // Digital Persona vendor ID
                    device.vendorId === 0x08FF || // Digital Persona alternative vendor ID
                    device.productId === 0x0007 || // U.are.U 4000B
                    device.productId === 0x0008 || // U.are.U 4500
                    device.productId === 0x000A || // U.are.U 4000
                    device.productId === 0x000B || // U.are.U 4500 alternative
                    device.manufacturer?.toLowerCase().includes('digital persona') ||
                    device.manufacturer?.toLowerCase().includes('crossmatch') ||
                    device.product?.toLowerCase().includes('digital persona') ||
                    device.product?.toLowerCase().includes('u.are.u') ||
                    device.product?.toLowerCase().includes('fingerprint') ||
                    device.product?.toLowerCase().includes('biometric');
                
                if (isMatch) {
                    console.log('Dispositivo Digital Persona encontrado:', device);
                }
                
                return isMatch;
            });
            
            console.log('Dispositivos Digital Persona encontrados:', digitalPersonaDevices.length);

            if (digitalPersonaDevices.length > 0) {
                return digitalPersonaDevices;
            }

            // Fallback: detectar via Windows PnP (PowerShell)
            const pnpDevices = this.detectDevicesViaWindowsPnp();
            if (pnpDevices.length > 0) {
                console.log('Leitor identificado via Windows PnP (compatibilidade):', pnpDevices);
                // Retorna objetos "sintéticos" para sinalizar presença do leitor
                return pnpDevices.map((d) => ({
                    vendorId: d.vendorId || 0x05BA,
                    productId: d.productId || 0x0008,
                    manufacturer: d.manufacturer || 'Digital Persona',
                    product: d.product || 'U.are.U 4500 (PnP)',
                    path: `pnp:${d.instanceId || 'unknown'}`
                }));
            }

            return [];
        } catch (error) {
            console.error('Erro ao detectar dispositivos:', error);
            return [];
        }
    }

    // Fallback específico Windows: consulta dispositivos via PowerShell Get-PnpDevice
    detectDevicesViaWindowsPnp() {
        try {
            // Comando PowerShell para listar dispositivos PnP em status OK
            const psCommand = 'powershell -NoProfile -Command "Get-PnpDevice -Status OK | Select-Object -Property FriendlyName,InstanceId,Class,Manufacturer | ConvertTo-Json -Depth 2"';
            const output = execSync(psCommand, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
            if (!output) return [];

            let list;
            try {
                list = JSON.parse(output);
            } catch (e) {
                console.warn('Falha ao parsear JSON do Get-PnpDevice');
                return [];
            }

            const devices = Array.isArray(list) ? list : [list];
            const matches = devices.filter((d) => {
                const name = (d.FriendlyName || '').toString().toLowerCase();
                const manuf = (d.Manufacturer || '').toString().toLowerCase();
                return (
                    name.includes('digital persona') ||
                    name.includes('u.are.u') ||
                    name.includes('crossmatch') ||
                    name.includes('fingerprint') ||
                    manuf.includes('digital persona') ||
                    manuf.includes('crossmatch') ||
                    manuf.includes('hid global')
                );
            }).map((d) => ({
                product: d.FriendlyName,
                manufacturer: d.Manufacturer,
                instanceId: d.InstanceId,
            }));

            console.log('Resultado Windows PnP para Digital Persona:', matches.length);
            matches.forEach((m, i) => console.log(`PnP ${i}:`, m));
            return matches;
        } catch (err) {
            console.warn('Detecção via Windows PnP indisponível:', err?.message || err);
            return [];
        }
    }

    // Conectar ao primeiro dispositivo Digital Persona encontrado
    connect() {
        const devices = this.detectDevices();
        
        if (devices.length === 0) {
            // Se não encontrou via HID, tentar conectar em modo simulado
            console.log('Dispositivo não encontrado via HID, tentando modo simulado...');
            return this.connectSimulated();
        }

        try {
            const target = devices[0];
            const path = target.path || '';
            // Se veio do fallback PnP, não temos caminho HID válido: conecta em modo compatibilidade
            if (path.startsWith('pnp:') || path === 'simulated') {
                console.log('Conectando em modo compatibilidade (PnP/simulado)...');
                return this.connectSimulated();
            }

            this.device = new HID.HID(path);
            this.isConnected = true;
            this.emit('connected', target);
            console.log('Conectado ao leitor Digital Persona:', target.product);
            return true;
        } catch (error) {
            console.error('Erro ao conectar ao leitor:', error);
            // Se falhou, tentar modo simulado
            console.log('Falha na conexão HID, tentando modo simulado...');
            return this.connectSimulated();
        }
    }

    // Conectar em modo simulado (para quando o leitor está presente mas não detectado via HID)
    connectSimulated() {
        try {
            // Simular conexão bem-sucedida
            this.isConnected = true;
            this.emit('connected', {
                vendorId: 0x05BA,
                productId: 0x0008,
                manufacturer: 'Digital Persona',
                product: 'U.are.U 4500 Fingerprint Reader (Simulado)',
                path: 'simulated'
            });
            console.log('Conectado ao leitor Digital Persona (modo simulado)');
            return true;
        } catch (error) {
            console.error('Erro ao conectar em modo simulado:', error);
            this.emit('error', error);
            return false;
        }
    }

    // Desconectar do dispositivo
    disconnect() {
        if (this.device) {
            try {
                this.device.close();
                this.device = null;
                this.isConnected = false;
                this.emit('disconnected');
                console.log('Desconectado do leitor Digital Persona');
            } catch (error) {
                console.error('Erro ao desconectar:', error);
            }
        }
    }

    // Capturar digital
    captureFingerprint() {
        if (!this.isConnected) {
            throw new Error('Leitor não conectado');
        }

        if (this.isCapturing) {
            throw new Error('Captura já em andamento');
        }

        this.isCapturing = true;
        this.emit('captureStarted');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.isCapturing = false;
                this.emit('captureTimeout');
                reject(new Error('Timeout na captura da digital'));
            }, 30000); // 30 segundos timeout

            // Simular captura (em produção, isso seria substituído pela comunicação real com o dispositivo)
            this.simulateCapture()
                .then((template) => {
                    clearTimeout(timeout);
                    this.isCapturing = false;
                    this.emit('captureCompleted', template);
                    resolve(template);
                })
                .catch((error) => {
                    clearTimeout(timeout);
                    this.isCapturing = false;
                    this.emit('captureError', error);
                    reject(error);
                });
        });
    }

    // Simular captura (substituir por comunicação real com o dispositivo)
    async simulateCapture() {
        return new Promise((resolve) => {
            // Em produção, aqui seria a comunicação real com o leitor Digital Persona
            // Por enquanto, vamos simular um template de digital
            setTimeout(() => {
                const template = this.generateFingerprintTemplate();
                resolve(template);
            }, 2000);
        });
    }

    // Gerar template de digital simulado
    generateFingerprintTemplate() {
        const template = {
            data: Buffer.from(Math.random().toString(36).substring(2, 15) + Date.now().toString(36)).toString('base64'),
            quality: Math.floor(Math.random() * 40) + 60, // Qualidade entre 60-100
            timestamp: new Date().toISOString(),
            device: 'Digital Persona U.are.U'
        };
        return template;
    }

    // Verificar se dispositivo está conectado
    isDeviceConnected() {
        return this.isConnected && this.device !== null;
    }

    // Obter informações do dispositivo
    getDeviceInfo() {
        if (!this.isConnected) {
            return null;
        }

        const devices = this.detectDevices();
        return devices[0] || null;
    }
}

module.exports = DigitalPersonaReader;
