using System;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;

namespace RecepcaoHSE
{
    public partial class MainForm : Form
    {
        private TabControl tabControl;
        private DataGridView dgvVisitantes;
        private Timer refreshTimer;

        public MainForm()
        {
            InitializeComponent();
            InitializeTimer();
            LoadData();
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();

            // Configurações da janela principal
            this.Text = "Sistema de Recepção HSE v1.0";
            this.Size = new Size(1200, 800);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.MinimumSize = new Size(800, 600);
            this.Icon = SystemIcons.Application;

            // Criar TabControl
            tabControl = new TabControl();
            tabControl.Dock = DockStyle.Fill;
            tabControl.Font = new Font("Segoe UI", 10F);

            // Aba Dashboard
            CreateDashboardTab();

            // Aba Cadastro
            CreateCadastroTab();

            // Aba Visitantes
            CreateVisitantesTab();

            this.Controls.Add(tabControl);
            this.ResumeLayout(false);
        }

        private void CreateDashboardTab()
        {
            var dashboardTab = new TabPage("📊 Dashboard");
            
            var panel = new Panel();
            panel.Dock = DockStyle.Fill;
            panel.Padding = new Padding(20);

            // Título
            var lblTitle = new Label();
            lblTitle.Text = "Sistema de Recepção HSE";
            lblTitle.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
            lblTitle.ForeColor = Color.DarkBlue;
            lblTitle.AutoSize = true;
            lblTitle.Location = new Point(20, 20);

            // Status
            var lblStatus = new Label();
            lblStatus.Text = "🟢 Sistema Online";
            lblStatus.Font = new Font("Segoe UI", 12F);
            lblStatus.ForeColor = Color.Green;
            lblStatus.AutoSize = true;
            lblStatus.Location = new Point(20, 60);

            // Cartões de estatísticas
            var cardPanel = new Panel();
            cardPanel.Location = new Point(20, 100);
            cardPanel.Size = new Size(800, 200);

            // Cartão 1 - Visitantes Hoje
            var card1 = CreateStatCard("Visitantes Hoje", "0", Color.FromArgb(52, 152, 219));
            card1.Location = new Point(0, 0);

            // Cartão 2 - Visitantes Ativos
            var card2 = CreateStatCard("Visitantes Ativos", "0", Color.FromArgb(46, 204, 113));
            card2.Location = new Point(200, 0);

            // Cartão 3 - Total Setores
            var card3 = CreateStatCard("Total de Setores", "8", Color.FromArgb(155, 89, 182));
            card3.Location = new Point(400, 0);

            cardPanel.Controls.AddRange(new Control[] { card1, card2, card3 });

            panel.Controls.AddRange(new Control[] { lblTitle, lblStatus, cardPanel });
            dashboardTab.Controls.Add(panel);
            tabControl.TabPages.Add(dashboardTab);
        }

        private Panel CreateStatCard(string title, string value, Color color)
        {
            var card = new Panel();
            card.Size = new Size(180, 120);
            card.BackColor = Color.White;
            card.BorderStyle = BorderStyle.FixedSingle;

            var lblTitle = new Label();
            lblTitle.Text = title;
            lblTitle.Font = new Font("Segoe UI", 10F);
            lblTitle.ForeColor = Color.Gray;
            lblTitle.AutoSize = true;
            lblTitle.Location = new Point(10, 10);

            var lblValue = new Label();
            lblValue.Text = value;
            lblValue.Font = new Font("Segoe UI", 24F, FontStyle.Bold);
            lblValue.ForeColor = color;
            lblValue.AutoSize = true;
            lblValue.Location = new Point(10, 40);

            card.Controls.AddRange(new Control[] { lblTitle, lblValue });
            return card;
        }

        private void CreateCadastroTab()
        {
            var cadastroTab = new TabPage("📝 Cadastro");
            
            var panel = new Panel();
            panel.Dock = DockStyle.Fill;
            panel.Padding = new Padding(20);
            panel.AutoScroll = true;

            // Título
            var lblTitle = new Label();
            lblTitle.Text = "Cadastro de Visitante";
            lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            lblTitle.AutoSize = true;
            lblTitle.Location = new Point(20, 20);

            // Formulário
            var formPanel = new Panel();
            formPanel.Location = new Point(20, 60);
            formPanel.Size = new Size(600, 400);

            // Nome
            var lblNome = new Label();
            lblNome.Text = "Nome Completo:";
            lblNome.AutoSize = true;
            lblNome.Location = new Point(0, 20);
            lblNome.Font = new Font("Segoe UI", 10F);

            var txtNome = new TextBox();
            txtNome.Name = "txtNome";
            txtNome.Size = new Size(300, 25);
            txtNome.Location = new Point(0, 45);

            // CPF
            var lblCPF = new Label();
            lblCPF.Text = "CPF:";
            lblCPF.AutoSize = true;
            lblCPF.Location = new Point(0, 80);
            lblCPF.Font = new Font("Segoe UI", 10F);

            var txtCPF = new TextBox();
            txtCPF.Name = "txtCPF";
            txtCPF.Size = new Size(200, 25);
            txtCPF.Location = new Point(0, 105);

            // Setor
            var lblSetor = new Label();
            lblSetor.Text = "Setor:";
            lblSetor.AutoSize = true;
            lblSetor.Location = new Point(0, 140);
            lblSetor.Font = new Font("Segoe UI", 10F);

            var cmbSetor = new ComboBox();
            cmbSetor.Name = "cmbSetor";
            cmbSetor.Size = new Size(200, 25);
            cmbSetor.Location = new Point(0, 165);
            cmbSetor.DropDownStyle = ComboBoxStyle.DropDownList;

            // Paciente
            var lblPaciente = new Label();
            lblPaciente.Text = "Paciente:";
            lblPaciente.AutoSize = true;
            lblPaciente.Location = new Point(0, 200);
            lblPaciente.Font = new Font("Segoe UI", 10F);

            var txtPaciente = new TextBox();
            txtPaciente.Name = "txtPaciente";
            txtPaciente.Size = new Size(300, 25);
            txtPaciente.Location = new Point(0, 225);

            // Botão Cadastrar
            var btnCadastrar = new Button();
            btnCadastrar.Text = "Cadastrar Visitante";
            btnCadastrar.Size = new Size(150, 35);
            btnCadastrar.Location = new Point(0, 270);
            btnCadastrar.BackColor = Color.FromArgb(52, 152, 219);
            btnCadastrar.ForeColor = Color.White;
            btnCadastrar.FlatStyle = FlatStyle.Flat;
            btnCadastrar.Click += BtnCadastrar_Click;

            formPanel.Controls.AddRange(new Control[] {
                lblNome, txtNome, lblCPF, txtCPF, lblSetor, cmbSetor,
                lblPaciente, txtPaciente, btnCadastrar
            });

            panel.Controls.AddRange(new Control[] { lblTitle, formPanel });
            cadastroTab.Controls.Add(panel);
            tabControl.TabPages.Add(cadastroTab);

            // Carregar setores
            LoadSetores();
        }

        private void CreateVisitantesTab()
        {
            var visitantesTab = new TabPage("👥 Visitantes");
            
            var panel = new Panel();
            panel.Dock = DockStyle.Fill;
            panel.Padding = new Padding(20);

            // Título
            var lblTitle = new Label();
            lblTitle.Text = "Lista de Visitantes";
            lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            lblTitle.AutoSize = true;
            lblTitle.Location = new Point(20, 20);

            // DataGridView
            dgvVisitantes = new DataGridView();
            dgvVisitantes.Location = new Point(20, 60);
            dgvVisitantes.Size = new Size(1000, 500);
            dgvVisitantes.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dgvVisitantes.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dgvVisitantes.ReadOnly = true;
            dgvVisitantes.AllowUserToAddRows = false;

            panel.Controls.AddRange(new Control[] { lblTitle, dgvVisitantes });
            visitantesTab.Controls.Add(panel);
            tabControl.TabPages.Add(visitantesTab);
        }

        private void InitializeTimer()
        {
            refreshTimer = new Timer();
            refreshTimer.Interval = 5000; // 5 segundos
            refreshTimer.Tick += RefreshTimer_Tick;
            refreshTimer.Start();
        }

        private void RefreshTimer_Tick(object sender, EventArgs e)
        {
            LoadData();
        }

        private void LoadData()
        {
            try
            {
                // Atualizar estatísticas do dashboard
                UpdateDashboardStats();

                // Atualizar lista de visitantes
                LoadVisitantes();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao carregar dados: {ex.Message}", "Erro", 
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateDashboardStats()
        {
            var visitantesHoje = DatabaseManager.GetVisitantesHoje();
            var visitantesAtivos = DatabaseManager.GetVisitantesAtivos();
            var totalSetores = DatabaseManager.GetTotalSetores();

            // Atualizar cartões (assumindo que são os primeiros 3 controles do painel)
            if (tabControl.TabPages[0].Controls[0] is Panel dashboardPanel)
            {
                var cardPanel = dashboardPanel.Controls.OfType<Panel>().FirstOrDefault();
                if (cardPanel != null)
                {
                    var cards = cardPanel.Controls.OfType<Panel>().ToArray();
                    if (cards.Length >= 3)
                    {
                        // Atualizar valores dos cartões
                        var lblValue1 = cards[0].Controls.OfType<Label>().Skip(1).FirstOrDefault();
                        var lblValue2 = cards[1].Controls.OfType<Label>().Skip(1).FirstOrDefault();
                        var lblValue3 = cards[2].Controls.OfType<Label>().Skip(1).FirstOrDefault();

                        if (lblValue1 != null) lblValue1.Text = visitantesHoje.ToString();
                        if (lblValue2 != null) lblValue2.Text = visitantesAtivos.ToString();
                        if (lblValue3 != null) lblValue3.Text = totalSetores.ToString();
                    }
                }
            }
        }

        private void LoadSetores()
        {
            try
            {
                var cadastroTab = tabControl.TabPages[1];
                var cmbSetor = cadastroTab.Controls.Find("cmbSetor", true).FirstOrDefault() as ComboBox;
                
                if (cmbSetor != null)
                {
                    cmbSetor.Items.Clear();
                    using (var connection = DatabaseManager.GetConnection())
                    {
                        connection.Open();
                        string query = "SELECT nome FROM setores WHERE ativo = 1 ORDER BY nome";
                        using (var command = new SQLiteCommand(query, connection))
                        using (var reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                cmbSetor.Items.Add(reader["nome"].ToString());
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao carregar setores: {ex.Message}", "Erro", 
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void LoadVisitantes()
        {
            try
            {
                using (var connection = DatabaseManager.GetConnection())
                {
                    connection.Open();
                    string query = @"
                        SELECT 
                            id,
                            nome,
                            cpf,
                            setor,
                            paciente,
                            data_entrada,
                            data_saida,
                            status
                        FROM visitantes 
                        ORDER BY data_entrada DESC";
                    
                    using (var adapter = new SQLiteDataAdapter(query, connection))
                    {
                        var dataTable = new DataTable();
                        adapter.Fill(dataTable);
                        dgvVisitantes.DataSource = dataTable;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao carregar visitantes: {ex.Message}", "Erro", 
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void BtnCadastrar_Click(object sender, EventArgs e)
        {
            try
            {
                var cadastroTab = tabControl.TabPages[1];
                var txtNome = cadastroTab.Controls.Find("txtNome", true).FirstOrDefault() as TextBox;
                var txtCPF = cadastroTab.Controls.Find("txtCPF", true).FirstOrDefault() as TextBox;
                var cmbSetor = cadastroTab.Controls.Find("cmbSetor", true).FirstOrDefault() as ComboBox;
                var txtPaciente = cadastroTab.Controls.Find("txtPaciente", true).FirstOrDefault() as TextBox;

                if (string.IsNullOrWhiteSpace(txtNome?.Text))
                {
                    MessageBox.Show("Por favor, informe o nome do visitante.", "Validação", 
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (cmbSetor?.SelectedItem == null)
                {
                    MessageBox.Show("Por favor, selecione um setor.", "Validação", 
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (string.IsNullOrWhiteSpace(txtPaciente?.Text))
                {
                    MessageBox.Show("Por favor, informe o nome do paciente.", "Validação", 
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                // Inserir visitante
                using (var connection = DatabaseManager.GetConnection())
                {
                    connection.Open();
                    string query = @"
                        INSERT INTO visitantes (nome, cpf, setor, paciente) 
                        VALUES (@nome, @cpf, @setor, @paciente)";
                    
                    using (var command = new SQLiteCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@nome", txtNome.Text.Trim());
                        command.Parameters.AddWithValue("@cpf", txtCPF?.Text?.Trim() ?? "");
                        command.Parameters.AddWithValue("@setor", cmbSetor.SelectedItem.ToString());
                        command.Parameters.AddWithValue("@paciente", txtPaciente.Text.Trim());
                        
                        command.ExecuteNonQuery();
                    }
                }

                // Limpar formulário
                txtNome.Clear();
                txtCPF?.Clear();
                cmbSetor.SelectedIndex = -1;
                txtPaciente.Clear();

                MessageBox.Show("Visitante cadastrado com sucesso!", "Sucesso", 
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                // Atualizar dados
                LoadData();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao cadastrar visitante: {ex.Message}", "Erro", 
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (MessageBox.Show("Deseja realmente sair do sistema?", "Confirmar Saída", 
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.No)
            {
                e.Cancel = true;
            }
            else
            {
                refreshTimer?.Stop();
                refreshTimer?.Dispose();
            }
        }
    }
}
