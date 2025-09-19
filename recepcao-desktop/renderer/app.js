// Sistema de Recepção HSE v3.0 - Desktop App
class RecepcaoApp {
    constructor() {
        this.biometricData = null;
        this.isCapturing = false;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Sistema de Recepção HSE Desktop v3.0');
        
        // Verificar leitor biométrico
        await this.checkBiometricReader();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Carregar dados iniciais
        await this.loadDashboardData();
        
        console.log('✅ Sistema inicializado com sucesso!');
    }

    async checkBiometricReader() {
        try {
            console.log('🔍 Verificando leitor DigitalPersona...');
            const result = await window.electronAPI.checkReader();
            
            if (result.success && result.detected) {
                this.updateBiometricStatus('success', 'Leitor DigitalPersona 4500 detectado!');
                console.log('✅ Leitor biométrico conectado');
            } else {
                this.updateBiometricStatus('error', 'Leitor não detectado');
                console.warn('⚠️ Leitor biométrico não encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar leitor:', error);
            this.updateBiometricStatus('error', 'Erro ao verificar leitor');
        }
    }

    setupEventListeners() {
        // Botão de captura biométrica
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.captureBiometric();
        });

        // Botão de pular captura
        document.getElementById('skipBtn').addEventListener('click', () => {
            this.skipBiometric();
        });

        // Botão de limpar formulário
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearForm();
        });

        // Botão de logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Formulário de cadastro
        document.getElementById('visitorForm').addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });
    }

    async captureBiometric() {
        if (this.isCapturing) return;

        try {
            this.isCapturing = true;
            this.updateBiometricStatus('info', 'Iniciando captura...');
            this.updateBiometricPreview('capturing');

            // Desabilitar botões
            document.getElementById('captureBtn').disabled = true;
            document.getElementById('skipBtn').disabled = true;

            // Simular captura (será substituído pelo SDK real)
            const result = await window.electronAPI.captureBiometric({
                timestamp: new Date().toISOString(),
                quality: 95
            });

            if (result.success) {
                this.biometricData = result.template;
                this.updateBiometricStatus('success', 'Captura realizada com sucesso!');
                this.updateBiometricPreview('success');
                
                // Atualizar contador
                this.updateBiometricCounter();
                
                // Mostrar mensagem de sucesso
                await window.electronAPI.showMessageBox({
                    type: 'info',
                    title: 'Captura Biométrica',
                    message: 'Impressão digital capturada com sucesso!',
                    buttons: ['OK']
                });
            } else {
                throw new Error(result.error || 'Erro na captura');
            }

        } catch (error) {
            console.error('❌ Erro na captura biométrica:', error);
            this.updateBiometricStatus('error', 'Erro na captura: ' + error.message);
            this.updateBiometricPreview('error');
            
            // Mostrar erro
            await window.electronAPI.showMessageBox({
                type: 'error',
                title: 'Erro na Captura',
                message: 'Não foi possível capturar a impressão digital.',
                buttons: ['OK']
            });
        } finally {
            this.isCapturing = false;
            document.getElementById('captureBtn').disabled = false;
            document.getElementById('skipBtn').disabled = false;
        }
    }

    skipBiometric() {
        this.biometricData = null;
        this.updateBiometricStatus('warning', 'Captura biométrica pulada');
        this.updateBiometricPreview('skipped');
        
        console.log('⏭️ Captura biométrica pulada pelo usuário');
    }

    updateBiometricStatus(type, message) {
        const statusElement = document.getElementById('biometricStatus');
        const indicator = statusElement.previousElementSibling;
        
        // Remover classes anteriores
        indicator.className = 'status-indicator';
        
        // Adicionar nova classe
        indicator.classList.add(`status-${type}`);
        
        // Atualizar texto
        statusElement.textContent = message;
    }

    updateBiometricPreview(state) {
        const preview = document.getElementById('biometricPreview');
        
        switch (state) {
            case 'capturing':
                preview.innerHTML = '<i class="fas fa-spinner fa-spin text-4xl"></i>';
                preview.style.borderColor = '#3b82f6';
                break;
            case 'success':
                preview.innerHTML = '<i class="fas fa-check-circle text-4xl text-green-400"></i>';
                preview.style.borderColor = '#10b981';
                break;
            case 'error':
                preview.innerHTML = '<i class="fas fa-exclamation-triangle text-4xl text-red-400"></i>';
                preview.style.borderColor = '#ef4444';
                break;
            case 'skipped':
                preview.innerHTML = '<i class="fas fa-forward text-4xl text-yellow-400"></i>';
                preview.style.borderColor = '#f59e0b';
                break;
            default:
                preview.innerHTML = '<i class="fas fa-hand-paper text-4xl opacity-50"></i>';
                preview.style.borderColor = '#fff';
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const visitorData = Object.fromEntries(formData.entries());
            
            // Adicionar dados biométricos se disponíveis
            if (this.biometricData) {
                visitorData.biometric_template = this.biometricData;
                visitorData.biometric_quality = 95;
            }
            
            console.log('📝 Cadastrando visitante:', visitorData);
            
            // Simular envio (será substituído por chamada real à API)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mostrar sucesso
            await window.electronAPI.showMessageBox({
                type: 'info',
                title: 'Sucesso',
                message: 'Visitante cadastrado com sucesso!',
                buttons: ['OK']
            });
            
            // Limpar formulário
            this.clearForm();
            
            // Atualizar dashboard
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('❌ Erro ao cadastrar visitante:', error);
            
            await window.electronAPI.showMessageBox({
                type: 'error',
                title: 'Erro',
                message: 'Erro ao cadastrar visitante: ' + error.message,
                buttons: ['OK']
            });
        }
    }

    clearForm() {
        document.getElementById('visitorForm').reset();
        this.biometricData = null;
        this.updateBiometricStatus('info', 'Pronto para captura');
        this.updateBiometricPreview('default');
        
        console.log('🧹 Formulário limpo');
    }

    async loadDashboardData() {
        try {
            // Simular carregamento de dados (será substituído por chamada real à API)
            document.getElementById('visitorsToday').textContent = Math.floor(Math.random() * 50) + 10;
            document.getElementById('keysBorrowed').textContent = Math.floor(Math.random() * 20) + 5;
            document.getElementById('biometricsCaptured').textContent = Math.floor(Math.random() * 30) + 15;
            document.getElementById('successRate').textContent = '98%';
            
            console.log('📊 Dashboard atualizado');
        } catch (error) {
            console.error('❌ Erro ao carregar dados do dashboard:', error);
        }
    }

    updateBiometricCounter() {
        const current = parseInt(document.getElementById('biometricsCaptured').textContent);
        document.getElementById('biometricsCaptured').textContent = current + 1;
    }

    async logout() {
        const result = await window.electronAPI.showMessageBox({
            type: 'question',
            title: 'Confirmar Saída',
            message: 'Deseja realmente sair do sistema?',
            buttons: ['Cancelar', 'Sair']
        });
        
        if (result.response === 1) {
            console.log('👋 Usuário fez logout');
            // Aqui seria implementada a lógica de logout
        }
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.recepcaoApp = new RecepcaoApp();
});

// Log de inicialização
console.log('🔒 Renderer script carregado - Sistema de Recepção HSE Desktop v3.0');
