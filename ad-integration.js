const { Client } = require('ldapts');
const config = require('./config.example.js');

class ActiveDirectoryIntegration {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new Client({
        url: config.AD_SERVER,
        timeout: 10000,
        connectTimeout: 10000
      });

      await this.client.bind(config.AD_USER_DN, config.AD_PASSWORD);
      this.isConnected = true;
      console.log('✅ Conectado ao Active Directory com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar ao Active Directory:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.unbind();
        this.isConnected = false;
        console.log('🔌 Desconectado do Active Directory');
      } catch (error) {
        console.error('❌ Erro ao desconectar do AD:', error.message);
      }
    }
  }

  async authenticateUser(username, password) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Não foi possível conectar ao Active Directory');
      }
    }

    try {
      // Tentar autenticar o usuário
      const userClient = new Client({
        url: config.AD_SERVER,
        timeout: 10000,
        connectTimeout: 10000
      });

      // Construir DN do usuário
      const userDN = `CN=${username},${config.AD_BASE_DN}`;
      
      await userClient.bind(userDN, password);
      await userClient.unbind();

      // Verificar se o usuário pertence ao grupo de administradores
      const isAdmin = await this.isUserInAdminGroup(username);
      
      return {
        success: true,
        username: username,
        isAdmin: isAdmin,
        message: 'Autenticação bem-sucedida'
      };

    } catch (error) {
      console.error('❌ Erro na autenticação AD:', error.message);
      return {
        success: false,
        message: 'Credenciais inválidas ou usuário não encontrado'
      };
    }
  }

  async isUserInAdminGroup(username) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return false;
      }
    }

    try {
      // Buscar o usuário
      const userSearchResult = await this.client.search(config.AD_BASE_DN, {
        filter: `(sAMAccountName=${username})`,
        scope: 'sub',
        attributes: ['memberOf', 'displayName', 'mail']
      });

      if (userSearchResult.searchEntries.length === 0) {
        return false;
      }

      const user = userSearchResult.searchEntries[0];
      const memberOf = user.memberOf || [];

      // Verificar se o usuário pertence ao grupo de administradores
      const isInAdminGroup = memberOf.some(group => 
        group.includes(config.AD_ADMIN_GROUP)
      );

      return isInAdminGroup;

    } catch (error) {
      console.error('❌ Erro ao verificar grupo do usuário:', error.message);
      return false;
    }
  }

  async getUserInfo(username) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return null;
      }
    }

    try {
      const searchResult = await this.client.search(config.AD_BASE_DN, {
        filter: `(sAMAccountName=${username})`,
        scope: 'sub',
        attributes: ['displayName', 'mail', 'telephoneNumber', 'department', 'title']
      });

      if (searchResult.searchEntries.length === 0) {
        return null;
      }

      const user = searchResult.searchEntries[0];
      return {
        username: username,
        displayName: user.displayName || username,
        email: user.mail || '',
        phone: user.telephoneNumber || '',
        department: user.department || '',
        title: user.title || ''
      };

    } catch (error) {
      console.error('❌ Erro ao buscar informações do usuário:', error.message);
      return null;
    }
  }

  async searchUsers(searchTerm) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return [];
      }
    }

    try {
      const searchResult = await this.client.search(config.AD_BASE_DN, {
        filter: `(|(displayName=*${searchTerm}*)(sAMAccountName=*${searchTerm}*)(mail=*${searchTerm}*))`,
        scope: 'sub',
        attributes: ['sAMAccountName', 'displayName', 'mail', 'department', 'title'],
        sizeLimit: 50
      });

      return searchResult.searchEntries.map(user => ({
        username: user.sAMAccountName,
        displayName: user.displayName || user.sAMAccountName,
        email: user.mail || '',
        department: user.department || '',
        title: user.title || ''
      }));

    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error.message);
      return [];
    }
  }

  async getGroupMembers(groupName) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return [];
      }
    }

    try {
      const searchResult = await this.client.search(config.AD_BASE_DN, {
        filter: `(cn=${groupName})`,
        scope: 'sub',
        attributes: ['member']
      });

      if (searchResult.searchEntries.length === 0) {
        return [];
      }

      const group = searchResult.searchEntries[0];
      const members = group.member || [];

      // Buscar informações dos membros
      const memberInfo = [];
      for (const memberDN of members) {
        try {
          const memberSearch = await this.client.search(memberDN, {
            scope: 'base',
            attributes: ['sAMAccountName', 'displayName', 'mail']
          });

          if (memberSearch.searchEntries.length > 0) {
            const member = memberSearch.searchEntries[0];
            memberInfo.push({
              username: member.sAMAccountName,
              displayName: member.displayName || member.sAMAccountName,
              email: member.mail || ''
            });
          }
        } catch (error) {
          console.error(`❌ Erro ao buscar membro ${memberDN}:`, error.message);
        }
      }

      return memberInfo;

    } catch (error) {
      console.error('❌ Erro ao buscar membros do grupo:', error.message);
      return [];
    }
  }
}

module.exports = ActiveDirectoryIntegration;


