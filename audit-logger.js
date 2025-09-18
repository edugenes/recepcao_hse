const fs = require('fs');
const path = require('path');
const moment = require('moment');

class AuditLogger {
  constructor() {
    this.logDir = path.join(__dirname, 'logs');
    this.auditLogFile = path.join(this.logDir, 'audit.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatLogEntry(level, action, details) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logEntry = {
      timestamp,
      level,
      action,
      details
    };
    return JSON.stringify(logEntry) + '\n';
  }

  async log(level, action, details) {
    try {
      const logEntry = this.formatLogEntry(level, action, details);
      fs.appendFileSync(this.auditLogFile, logEntry);
      
      // Log no console também para desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT ${level}] ${action}:`, details);
      }
    } catch (error) {
      console.error('❌ Erro ao escrever log de auditoria:', error.message);
    }
  }

  // Métodos específicos para diferentes tipos de ações
  async logLogin(userId, username, success, ipAddress, userAgent) {
    await this.log('INFO', 'LOGIN_ATTEMPT', {
      userId,
      username,
      success,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async logLogout(userId, username, ipAddress) {
    await this.log('INFO', 'LOGOUT', {
      userId,
      username,
      ipAddress,
      timestamp: new Date().toISOString()
    });
  }

  async logVisitorRegistration(userId, username, visitorData) {
    await this.log('INFO', 'VISITOR_REGISTERED', {
      userId,
      username,
      visitorId: visitorData.id,
      visitorName: visitorData.nome,
      visitorDocument: visitorData.documento,
      setor: visitorData.setor_nome,
      timestamp: new Date().toISOString()
    });
  }

  async logVisitorExit(userId, username, visitorId, visitorName) {
    await this.log('INFO', 'VISITOR_EXIT', {
      userId,
      username,
      visitorId,
      visitorName,
      timestamp: new Date().toISOString()
    });
  }

  async logUserCreation(adminId, adminUsername, newUserData) {
    await this.log('INFO', 'USER_CREATED', {
      adminId,
      adminUsername,
      newUserId: newUserData.id,
      newUsername: newUserData.username,
      newUserEmail: newUserData.email,
      newUserRole: newUserData.role,
      timestamp: new Date().toISOString()
    });
  }

  async logUserUpdate(adminId, adminUsername, targetUserId, changes) {
    await this.log('INFO', 'USER_UPDATED', {
      adminId,
      adminUsername,
      targetUserId,
      changes,
      timestamp: new Date().toISOString()
    });
  }

  async logUserDeletion(adminId, adminUsername, deletedUserId, deletedUsername) {
    await this.log('WARNING', 'USER_DELETED', {
      adminId,
      adminUsername,
      deletedUserId,
      deletedUsername,
      timestamp: new Date().toISOString()
    });
  }

  async logKeyRetrieval(userId, username, keyId, keyDescription, borrowerInfo) {
    await this.log('INFO', 'KEY_RETRIEVED', {
      userId,
      username,
      keyId,
      keyDescription,
      borrowerName: borrowerInfo.retirado_por,
      borrowerDepartment: borrowerInfo.setor,
      borrowerDocument: borrowerInfo.documento,
      timestamp: new Date().toISOString()
    });
  }

  async logKeyReturn(userId, username, keyId, keyDescription) {
    await this.log('INFO', 'KEY_RETURNED', {
      userId,
      username,
      keyId,
      keyDescription,
      timestamp: new Date().toISOString()
    });
  }

  async logKeyCreation(adminId, adminUsername, keyData) {
    await this.log('INFO', 'KEY_CREATED', {
      adminId,
      adminUsername,
      keyId: keyData.id,
      keyDescription: keyData.descricao,
      keyLocation: keyData.localizacao,
      timestamp: new Date().toISOString()
    });
  }

  async logDataExport(userId, username, exportType, filters) {
    await this.log('INFO', 'DATA_EXPORT', {
      userId,
      username,
      exportType,
      filters,
      timestamp: new Date().toISOString()
    });
  }

  async logSecurityEvent(level, event, details) {
    await this.log(level, 'SECURITY_EVENT', {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async logSystemEvent(level, event, details) {
    await this.log(level, 'SYSTEM_EVENT', {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Método para buscar logs com filtros
  async getLogs(filters = {}) {
    try {
      if (!fs.existsSync(this.auditLogFile)) {
        return [];
      }

      const logContent = fs.readFileSync(this.auditLogFile, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      
      let logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return null;
        }
      }).filter(log => log !== null);

      // Aplicar filtros
      if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
      }

      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }

      if (filters.userId) {
        logs = logs.filter(log => 
          log.details.userId === filters.userId || 
          log.details.adminId === filters.userId
        );
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        logs = logs.filter(log => new Date(log.timestamp) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        logs = logs.filter(log => new Date(log.timestamp) <= toDate);
      }

      // Ordenar por timestamp (mais recente primeiro)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Limitar resultados se especificado
      if (filters.limit) {
        logs = logs.slice(0, filters.limit);
      }

      return logs;

    } catch (error) {
      console.error('❌ Erro ao buscar logs:', error.message);
      return [];
    }
  }

  // Método para limpar logs antigos
  async cleanOldLogs(daysToKeep = 90) {
    try {
      if (!fs.existsSync(this.auditLogFile)) {
        return;
      }

      const logContent = fs.readFileSync(this.auditLogFile, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      
      const cutoffDate = moment().subtract(daysToKeep, 'days');
      const validLines = [];

      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line);
          const logDate = moment(logEntry.timestamp);
          
          if (logDate.isAfter(cutoffDate)) {
            validLines.push(line);
          }
        } catch (error) {
          // Manter linhas que não podem ser parseadas (logs corrompidos)
          validLines.push(line);
        }
      }

      // Reescrever arquivo com apenas logs válidos
      fs.writeFileSync(this.auditLogFile, validLines.join('\n') + '\n');
      
      console.log(`🧹 Logs de auditoria limpos. Mantidos logs dos últimos ${daysToKeep} dias.`);

    } catch (error) {
      console.error('❌ Erro ao limpar logs antigos:', error.message);
    }
  }
}

module.exports = AuditLogger;


