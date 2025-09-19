// Sistema de Recepção HSE v1.0 - Aplicativo Windows
class RecepcaoApp {
    constructor() {
        this.systemInfo = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando Sistema de Recepção HSE v1.0...');
            
            // Obter informações do sistema
            this.systemInfo = await window.electronAPI.getSystemInfo();
            console.log('📊 Informações do sistema:', this.systemInfo);
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Carregar dados iniciais
            await this.loadInitialData();
            
            console.log('✅ Sistema inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema:', error);
            this.showError('Erro de Inicialização', error.message);
        }
    }

    async loadInitialData() {
        try {
            // Carregar setores
            await this.loadSetores();
            
            // Carregar dashboard
            await this.loadDashboard();
            
            // Carregar visitantes
            await this.loadVisitors();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados iniciais:', error);
        }
    }

    async loadSetores() {
        try {
            const setores = await window.electronAPI.databaseQuery(
                'SELECT * FROM setores WHERE ativo = 1 ORDER BY nome'
            );
            
            const setorSelect = document.getElementById('setor');
            setorSelect.innerHTML = '<option value="">Selecione um setor</option>';
            
            setores.forEach(setor => {
                const option = document.createElement('option');
                option.value = setor.nome;
                option.textContent = setor.nome;
                setorSelect.appendChild(option);
            });
            
            console.log('✅ Setores carregados');
            
        } catch (error) {
            console.error('❌ Erro ao carregar setores:', error);
        }
    }

    async loadDashboard() {
        try {
            const stats = await window.electronAPI.databaseQuery(
                `SELECT 
                    (SELECT COUNT(*) FROM visitantes WHERE DATE(data_entrada) = DATE('now')) as visitantesHoje,
                    (SELECT COUNT(*) FROM visitantes WHERE status = 'ativo') as visitantesAtivos
                `
            );
            
            const stat = stats[0];
            document.getElementById('visitorsToday').textContent = stat.visitantesHoje;
            document.getElementById('activeVisitors').textContent = stat.visitantesAtivos;
            
            console.log('✅ Dashboard atualizado');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard:', error);
        }
    }

    async loadVisitors() {
        try {
            const visitantes = await window.electronAPI.databaseQuery(
                'SELECT * FROM visitantes ORDER BY data_entrada DESC LIMIT 10'
            );
            
            const tableBody = document.getElementById('visitorsTable');
            tableBody.innerHTML = '';
            
            visitantes.forEach(visitante => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${visitante.nome}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${visitante.cpf || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${visitante.setor}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${visitante.paciente}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(visitante.data_entrada).toLocaleString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${visitante.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${visitante.status}
                        </span>
                    </td>
                `;
            });
            
            console.log('✅ Visitantes carregados');
            
        } catch (error) {
            console.error('❌ Erro ao carregar visitantes:', error);
        }
    }

    setupEventListeners() {
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

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const visitorData = Object.fromEntries(formData.entries());
            
            console.log('📝 Cadastrando visitante:', visitorData);
            
            // Inserir no banco de dados
            const result = await window.electronAPI.databaseRun(
                `INSERT INTO visitantes (nome, cpf, setor, paciente)
                 VALUES (?, ?, ?, ?)`,
                [visitorData.nome, visitorData.cpf, visitorData.setor, visitorData.paciente]
            );
            
            // Mostrar sucesso
            await window.electronAPI.showMessageBox({
                type: 'info',
                title: 'Sucesso',
                message: 'Visitante cadastrado com sucesso!',
                buttons: ['OK']
            });
            
            // Limpar formulário
            this.clearForm();
            
            // Atualizar dados
            await this.loadDashboard();
            await this.loadVisitors();
            
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
        console.log('🧹 Formulário limpo');
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
            // Fechar aplicativo
            window.close();
        }
    }

    showError(title, message) {
        window.electronAPI.showMessageBox({
            type: 'error',
            title: title,
            message: message,
            buttons: ['OK']
        });
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.recepcaoApp = new RecepcaoApp();
});

// Log de inicialização
console.log('🔒 Cliente Windows carregado - Sistema de Recepção HSE v1.0');
