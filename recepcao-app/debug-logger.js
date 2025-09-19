const fs = require('fs');
const path = require('path');

class DebugLogger {
    constructor() {
        this.logFile = path.join(__dirname, 'debug.log');
        this.startTime = new Date();
        this.log('=== INÍCIO DO DEBUG ===');
    }

    log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            message,
            data: data ? JSON.stringify(data, null, 2) : null
        };
        
        const logLine = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
        
        try {
            fs.appendFileSync(this.logFile, logLine);
            console.log(`[DEBUG] ${message}`);
        } catch (error) {
            console.error('Erro ao escrever log:', error);
        }
    }

    error(message, error = null) {
        this.log(`❌ ERRO: ${message}`, error ? {
            message: error.message,
            stack: error.stack,
            code: error.code
        } : null);
    }

    success(message, data = null) {
        this.log(`✅ SUCESSO: ${message}`, data);
    }

    info(message, data = null) {
        this.log(`ℹ️ INFO: ${message}`, data);
    }

    warn(message, data = null) {
        this.log(`⚠️ AVISO: ${message}`, data);
    }

    getLogs() {
        try {
            return fs.readFileSync(this.logFile, 'utf8');
        } catch (error) {
            return 'Erro ao ler logs: ' + error.message;
        }
    }

    clearLogs() {
        try {
            fs.writeFileSync(this.logFile, '');
            this.log('=== LOGS LIMPOS ===');
        } catch (error) {
            console.error('Erro ao limpar logs:', error);
        }
    }
}

module.exports = DebugLogger;
