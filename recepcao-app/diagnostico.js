const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class Diagnostico {
    constructor() {
        this.logFile = path.join(__dirname, 'diagnostico.log');
        this.startTime = new Date();
    }

    log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
        
        try {
            fs.appendFileSync(this.logFile, logLine);
            console.log(`[DIAGNÓSTICO] ${message}`);
        } catch (error) {
            console.error('Erro ao escrever log de diagnóstico:', error);
        }
    }

    async executarDiagnosticoCompleto() {
        this.log('=== INICIANDO DIAGNÓSTICO COMPLETO ===');
        
        try {
            // 1. Verificar Node.js
            await this.verificarNode();
            
            // 2. Verificar Electron
            await this.verificarElectron();
            
            // 3. Verificar dependências
            await this.verificarDependencias();
            
            // 4. Verificar arquivos
            await this.verificarArquivos();
            
            // 5. Verificar permissões
            await this.verificarPermissoes();
            
            // 6. Verificar portas
            await this.verificarPortas();
            
            // 7. Testar execução
            await this.testarExecucao();
            
            this.log('=== DIAGNÓSTICO CONCLUÍDO ===');
            
        } catch (error) {
            this.log('❌ ERRO NO DIAGNÓSTICO:', error);
        }
    }

    async verificarNode() {
        this.log('🔍 Verificando Node.js...');
        
        try {
            const nodeVersion = process.version;
            const nodePath = process.execPath;
            
            this.log(`✅ Node.js versão: ${nodeVersion}`);
            this.log(`✅ Node.js path: ${nodePath}`);
            
            // Verificar se é versão compatível
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            if (majorVersion < 16) {
                this.log('⚠️ AVISO: Node.js versão muito antiga. Recomendado: 16+');
            }
            
        } catch (error) {
            this.log('❌ Erro ao verificar Node.js:', error);
        }
    }

    async verificarElectron() {
        this.log('🔍 Verificando Electron...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            const electronVersion = packageJson.devDependencies?.electron;
            
            this.log(`✅ Electron versão: ${electronVersion}`);
            
            // Verificar se o executável existe
            const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron.cmd');
            if (fs.existsSync(electronPath)) {
                this.log('✅ Electron executável encontrado');
            } else {
                this.log('❌ Electron executável NÃO encontrado');
            }
            
        } catch (error) {
            this.log('❌ Erro ao verificar Electron:', error);
        }
    }

    async verificarDependencias() {
        this.log('🔍 Verificando dependências...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            const nodeModulesPath = path.join(__dirname, 'node_modules');
            
            if (!fs.existsSync(nodeModulesPath)) {
                this.log('❌ node_modules não encontrado');
                return;
            }
            
            this.log('✅ node_modules encontrado');
            
            // Verificar dependências críticas
            const deps = ['sqlite3', 'bcryptjs', 'jsonwebtoken', 'moment'];
            for (const dep of deps) {
                const depPath = path.join(nodeModulesPath, dep);
                if (fs.existsSync(depPath)) {
                    this.log(`✅ ${dep} instalado`);
                } else {
                    this.log(`❌ ${dep} NÃO instalado`);
                }
            }
            
        } catch (error) {
            this.log('❌ Erro ao verificar dependências:', error);
        }
    }

    async verificarArquivos() {
        this.log('🔍 Verificando arquivos essenciais...');
        
        const arquivos = [
            'main.js',
            'preload.js',
            'index.html',
            'app.js',
            'package.json'
        ];
        
        for (const arquivo of arquivos) {
            const arquivoPath = path.join(__dirname, arquivo);
            if (fs.existsSync(arquivoPath)) {
                const stats = fs.statSync(arquivoPath);
                this.log(`✅ ${arquivo} (${stats.size} bytes)`);
            } else {
                this.log(`❌ ${arquivo} NÃO encontrado`);
            }
        }
    }

    async verificarPermissoes() {
        this.log('🔍 Verificando permissões...');
        
        try {
            // Testar escrita
            const testFile = path.join(__dirname, 'test-permission.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            this.log('✅ Permissão de escrita OK');
            
            // Testar leitura
            const packageJson = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8');
            this.log('✅ Permissão de leitura OK');
            
        } catch (error) {
            this.log('❌ Erro de permissões:', error);
        }
    }

    async verificarPortas() {
        this.log('🔍 Verificando portas...');
        
        try {
            const netstat = spawn('netstat', ['-an']);
            let output = '';
            
            netstat.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            netstat.on('close', () => {
                const portas3000 = (output.match(/3000/g) || []).length;
                const portas3001 = (output.match(/3001/g) || []).length;
                
                this.log(`📊 Porta 3000 em uso: ${portas3000} vezes`);
                this.log(`📊 Porta 3001 em uso: ${portas3001} vezes`);
                
                if (portas3000 > 0) {
                    this.log('⚠️ AVISO: Porta 3000 está em uso');
                }
                if (portas3001 > 0) {
                    this.log('⚠️ AVISO: Porta 3001 está em uso');
                }
            });
            
        } catch (error) {
            this.log('❌ Erro ao verificar portas:', error);
        }
    }

    async testarExecucao() {
        this.log('🔍 Testando execução...');
        
        try {
            // Testar se consegue carregar o main.js
            const mainPath = path.join(__dirname, 'main.js');
            const mainContent = fs.readFileSync(mainPath, 'utf8');
            
            // Verificar se tem erros de sintaxe básicos
            if (mainContent.includes('require(') && mainContent.includes('module.exports')) {
                this.log('✅ main.js parece válido');
            } else {
                this.log('❌ main.js pode ter problemas');
            }
            
            // Testar se consegue carregar dependências
            try {
                require('./debug-logger');
                this.log('✅ debug-logger carregado');
            } catch (error) {
                this.log('❌ Erro ao carregar debug-logger:', error.message);
            }
            
        } catch (error) {
            this.log('❌ Erro ao testar execução:', error);
        }
    }

    getLogs() {
        try {
            return fs.readFileSync(this.logFile, 'utf8');
        } catch (error) {
            return 'Erro ao ler logs de diagnóstico: ' + error.message;
        }
    }
}

// Executar diagnóstico se chamado diretamente
if (require.main === module) {
    const diagnostico = new Diagnostico();
    diagnostico.executarDiagnosticoCompleto().then(() => {
        console.log('\n=== LOGS DE DIAGNÓSTICO ===');
        console.log(diagnostico.getLogs());
    });
}

module.exports = Diagnostico;
