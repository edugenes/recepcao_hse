const { jsPDF } = require('jspdf');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, 'reports');
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  generateVisitorReport(visitantes, filters = {}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Visitantes', pageWidth / 2, 20, { align: 'center' });
    
    // Informações do relatório
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, 20, 35);
    
    if (filters.data_inicio || filters.data_fim) {
      const periodo = `${filters.data_inicio || 'Início'} até ${filters.data_fim || 'Fim'}`;
      doc.text(`Período: ${periodo}`, 20, 45);
    }
    
    if (filters.setor_id) {
      doc.text(`Setor: ${filters.setor_nome || 'Filtrado'}`, 20, 55);
    }

    // Estatísticas
    const totalVisitantes = visitantes.length;
    const visitantesAtivos = visitantes.filter(v => !v.saida).length;
    const visitantesFinalizados = visitantes.filter(v => v.saida).length;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas', 20, 75);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de visitantes: ${totalVisitantes}`, 20, 90);
    doc.text(`Visitantes ativos: ${visitantesAtivos}`, 20, 100);
    doc.text(`Visitantes finalizados: ${visitantesFinalizados}`, 20, 110);

    // Tabela de visitantes
    let yPosition = 130;
    const startY = yPosition;
    
    // Cabeçalho da tabela
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Nome', 20, yPosition);
    doc.text('Documento', 60, yPosition);
    doc.text('Setor', 100, yPosition);
    doc.text('Entrada', 140, yPosition);
    doc.text('Saída', 170, yPosition);
    doc.text('Status', 200, yPosition);
    
    yPosition += 10;
    
    // Linha separadora
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;
    
    // Dados dos visitantes
    doc.setFont('helvetica', 'normal');
    visitantes.forEach((visitante, index) => {
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      const nome = visitante.nome.length > 20 ? visitante.nome.substring(0, 17) + '...' : visitante.nome;
      const documento = visitante.documento.length > 15 ? visitante.documento.substring(0, 12) + '...' : visitante.documento;
      const setor = visitante.setor_nome ? (visitante.setor_nome.length > 15 ? visitante.setor_nome.substring(0, 12) + '...' : visitante.setor_nome) : 'N/A';
      const entrada = moment(visitante.entrada).format('DD/MM HH:mm');
      const saida = visitante.saida ? moment(visitante.saida).format('DD/MM HH:mm') : 'Ativo';
      const status = visitante.saida ? 'Finalizado' : 'Ativo';
      
      doc.text(nome, 20, yPosition);
      doc.text(documento, 60, yPosition);
      doc.text(setor, 100, yPosition);
      doc.text(entrada, 140, yPosition);
      doc.text(saida, 170, yPosition);
      doc.text(status, 200, yPosition);
      
      yPosition += 8;
    });

    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc;
  }

  generateKeyReport(chaves, movimentacoes, filters = {}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Chaves', pageWidth / 2, 20, { align: 'center' });
    
    // Informações do relatório
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, 20, 35);
    
    if (filters.data_inicio || filters.data_fim) {
      const periodo = `${filters.data_inicio || 'Início'} até ${filters.data_fim || 'Fim'}`;
      doc.text(`Período: ${periodo}`, 20, 45);
    }

    // Estatísticas
    const totalChaves = chaves.length;
    const chavesEmprestadas = chaves.filter(c => c.emprestada).length;
    const chavesDisponiveis = totalChaves - chavesEmprestadas;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas', 20, 65);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de chaves: ${totalChaves}`, 20, 80);
    doc.text(`Chaves emprestadas: ${chavesEmprestadas}`, 20, 90);
    doc.text(`Chaves disponíveis: ${chavesDisponiveis}`, 20, 100);

    // Tabela de chaves
    let yPosition = 120;
    
    // Cabeçalho da tabela
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Descrição', 20, yPosition);
    doc.text('Localização', 80, yPosition);
    doc.text('Status', 130, yPosition);
    doc.text('Emprestada para', 160, yPosition);
    doc.text('Data Retirada', 200, yPosition);
    
    yPosition += 10;
    
    // Linha separadora
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;
    
    // Dados das chaves
    doc.setFont('helvetica', 'normal');
    chaves.forEach((chave, index) => {
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      const descricao = chave.descricao.length > 25 ? chave.descricao.substring(0, 22) + '...' : chave.descricao;
      const localizacao = chave.localizacao ? (chave.localizacao.length > 20 ? chave.localizacao.substring(0, 17) + '...' : chave.localizacao) : 'N/A';
      const status = chave.emprestada ? 'Emprestada' : 'Disponível';
      const emprestadaPara = chave.emprestada ? (chave.retirado_por ? chave.retirado_por.substring(0, 15) + '...' : 'N/A') : '-';
      const dataRetirada = chave.emprestada && chave.retirada_em ? moment(chave.retirada_em).format('DD/MM HH:mm') : '-';
      
      doc.text(descricao, 20, yPosition);
      doc.text(localizacao, 80, yPosition);
      doc.text(status, 130, yPosition);
      doc.text(emprestadaPara, 160, yPosition);
      doc.text(dataRetirada, 200, yPosition);
      
      yPosition += 8;
    });

    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc;
  }

  generateAuditReport(logs, filters = {}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Auditoria', pageWidth / 2, 20, { align: 'center' });
    
    // Informações do relatório
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, 20, 35);
    
    if (filters.dateFrom || filters.dateTo) {
      const periodo = `${filters.dateFrom || 'Início'} até ${filters.dateTo || 'Fim'}`;
      doc.text(`Período: ${periodo}`, 20, 45);
    }
    
    if (filters.userId) {
      doc.text(`Usuário: ${filters.username || 'Filtrado'}`, 20, 55);
    }

    // Estatísticas
    const totalLogs = logs.length;
    const loginLogs = logs.filter(l => l.action === 'LOGIN_ATTEMPT').length;
    const adminLogs = logs.filter(l => l.details.adminId).length;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas', 20, 75);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de eventos: ${totalLogs}`, 20, 90);
    doc.text(`Tentativas de login: ${loginLogs}`, 20, 100);
    doc.text(`Ações administrativas: ${adminLogs}`, 20, 110);

    // Tabela de logs
    let yPosition = 130;
    
    // Cabeçalho da tabela
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Data/Hora', 20, yPosition);
    doc.text('Ação', 60, yPosition);
    doc.text('Usuário', 100, yPosition);
    doc.text('Detalhes', 140, yPosition);
    
    yPosition += 8;
    
    // Linha separadora
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;
    
    // Dados dos logs
    doc.setFont('helvetica', 'normal');
    logs.forEach((log, index) => {
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      const timestamp = moment(log.timestamp).format('DD/MM HH:mm');
      const action = log.action.length > 15 ? log.action.substring(0, 12) + '...' : log.action;
      const username = log.details.username || log.details.adminUsername || 'Sistema';
      const details = JSON.stringify(log.details).substring(0, 30) + '...';
      
      doc.text(timestamp, 20, yPosition);
      doc.text(action, 60, yPosition);
      doc.text(username, 100, yPosition);
      doc.text(details, 140, yPosition);
      
      yPosition += 6;
    });

    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc;
  }

  async saveReport(doc, filename) {
    const filepath = path.join(this.reportsDir, filename);
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(filepath, Buffer.from(pdfBuffer));
    return filepath;
  }

  generateCSV(visitantes, type = 'visitantes') {
    let csv = '';
    
    if (type === 'visitantes') {
      csv = 'Nome,Documento,Telefone,Setor,Paciente,Tipo,Entrada,Saída,Status\n';
      visitantes.forEach(visitante => {
        const nome = `"${visitante.nome}"`;
        const documento = `"${visitante.documento}"`;
        const telefone = `"${visitante.telefone || ''}"`;
        const setor = `"${visitante.setor_nome || ''}"`;
        const paciente = `"${visitante.paciente_nome || ''}"`;
        const tipo = `"${visitante.tipo || 'visitante'}"`;
        const entrada = `"${moment(visitante.entrada).format('DD/MM/YYYY HH:mm:ss')}"`;
        const saida = visitante.saida ? `"${moment(visitante.saida).format('DD/MM/YYYY HH:mm:ss')}"` : '""';
        const status = `"${visitante.saida ? 'Finalizado' : 'Ativo'}"`;
        
        csv += `${nome},${documento},${telefone},${setor},${paciente},${tipo},${entrada},${saida},${status}\n`;
      });
    }
    
    return csv;
  }

  async saveCSV(csv, filename) {
    const filepath = path.join(this.reportsDir, filename);
    fs.writeFileSync(filepath, csv, 'utf8');
    return filepath;
  }
}

module.exports = ReportGenerator;


