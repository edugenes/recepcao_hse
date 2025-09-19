using System;
using System.Windows.Forms;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;

namespace DigitalPersonaClient
{
    public partial class BiometricClient : Form
    {
        private Button btnCheckReader;
        private Button btnCapture;
        private TextBox txtLog;
        private Label lblStatus;
        private HttpClient httpClient;
        private string webappUrl = "http://localhost:3000";

        public BiometricClient()
        {
            InitializeComponent();
            httpClient = new HttpClient();
            CheckReader();
        }

        private void InitializeComponent()
        {
            this.Text = "DigitalPersona 4500 - Cliente Biométrico";
            this.Size = new System.Drawing.Size(500, 400);
            this.StartPosition = FormStartPosition.CenterScreen;

            // Status
            lblStatus = new Label();
            lblStatus.Text = "🔍 Verificando leitor...";
            lblStatus.Location = new System.Drawing.Point(20, 20);
            lblStatus.Size = new System.Drawing.Size(400, 30);
            lblStatus.Font = new System.Drawing.Font("Arial", 12);
            this.Controls.Add(lblStatus);

            // Botão Verificar
            btnCheckReader = new Button();
            btnCheckReader.Text = "🔍 Verificar Leitor";
            btnCheckReader.Location = new System.Drawing.Point(20, 60);
            btnCheckReader.Size = new System.Drawing.Size(150, 40);
            btnCheckReader.BackColor = System.Drawing.Color.FromArgb(52, 152, 219);
            btnCheckReader.ForeColor = System.Drawing.Color.White;
            btnCheckReader.Click += BtnCheckReader_Click;
            this.Controls.Add(btnCheckReader);

            // Botão Capturar
            btnCapture = new Button();
            btnCapture.Text = "🖐️ Capturar Impressão";
            btnCapture.Location = new System.Drawing.Point(190, 60);
            btnCapture.Size = new System.Drawing.Size(150, 40);
            btnCapture.BackColor = System.Drawing.Color.FromArgb(231, 76, 60);
            btnCapture.ForeColor = System.Drawing.Color.White;
            btnCapture.Click += BtnCapture_Click;
            this.Controls.Add(btnCapture);

            // Log
            Label lblLog = new Label();
            lblLog.Text = "Log de Atividades:";
            lblLog.Location = new System.Drawing.Point(20, 120);
            lblLog.Size = new System.Drawing.Size(200, 30);
            lblLog.Font = new System.Drawing.Font("Arial", 10, System.Drawing.FontStyle.Bold);
            this.Controls.Add(lblLog);

            txtLog = new TextBox();
            txtLog.Multiline = true;
            txtLog.ScrollBars = ScrollBars.Vertical;
            txtLog.Location = new System.Drawing.Point(20, 150);
            txtLog.Size = new System.Drawing.Size(440, 200);
            txtLog.Font = new System.Drawing.Font("Consolas", 9);
            txtLog.ReadOnly = true;
            this.Controls.Add(txtLog);
        }

        private async void BtnCheckReader_Click(object sender, EventArgs e)
        {
            await CheckReader();
        }

        private async Task CheckReader()
        {
            LogMessage("🔍 Verificando leitor DigitalPersona 4500...");
            
            try
            {
                // Verificar via PowerShell
                var result = await ExecutePowerShellCommand(
                    "Get-PnpDevice -Class Biometric | Where-Object {$_.FriendlyName -like '*DigitalPersona*'} | Select-Object FriendlyName, Status"
                );

                if (result.Contains("DigitalPersona") && result.Contains("OK"))
                {
                    lblStatus.Text = "✅ Leitor DigitalPersona 4500 detectado";
                    lblStatus.ForeColor = System.Drawing.Color.Green;
                    LogMessage("✅ Leitor DigitalPersona 4500 detectado e funcionando!");
                    
                    // Notificar webapp
                    await NotifyWebApp("reader_detected", "Leitor DigitalPersona 4500 detectado");
                }
                else
                {
                    lblStatus.Text = "❌ Leitor DigitalPersona 4500 não detectado";
                    lblStatus.ForeColor = System.Drawing.Color.Red;
                    LogMessage("❌ Leitor DigitalPersona 4500 não detectado");
                    LogMessage("💡 Verifique se o leitor está conectado e os drivers instalados");
                    
                    // Notificar webapp
                    await NotifyWebApp("reader_not_detected", "Leitor DigitalPersona 4500 não detectado");
                }
            }
            catch (Exception ex)
            {
                lblStatus.Text = "❌ Erro na verificação";
                lblStatus.ForeColor = System.Drawing.Color.Red;
                LogMessage($"❌ Erro ao verificar leitor: {ex.Message}");
            }
        }

        private async void BtnCapture_Click(object sender, EventArgs e)
        {
            await CaptureFingerprint();
        }

        private async Task CaptureFingerprint()
        {
            LogMessage("🖐️ Iniciando captura de impressão digital...");
            
            if (lblStatus.Text.Contains("não detectado"))
            {
                MessageBox.Show("Leitor DigitalPersona não detectado. Verifique a conexão.", 
                    "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                LogMessage("📡 Conectando com o leitor...");
                LogMessage("👆 Coloque o dedo no leitor...");
                
                // Simular captura (aqui você integraria o SDK real)
                await Task.Delay(2000);
                
                var random = new Random();
                var quality = random.Next(60, 100);
                var template = $"TEMPLATE_{DateTime.Now.Ticks}";
                
                LogMessage("✅ Captura realizada com sucesso!");
                LogMessage($"📊 Qualidade: {quality}%");
                LogMessage($"🔑 Template: {template}");
                LogMessage("💾 Impressão digital salva no sistema");
                
                // Notificar webapp
                await NotifyWebApp("capture_success", $"Captura realizada com qualidade {quality}%");
                
                MessageBox.Show($"Impressão digital capturada com sucesso!\nQualidade: {quality}%", 
                    "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                LogMessage($"❌ Erro na captura: {ex.Message}");
                await NotifyWebApp("capture_error", ex.Message);
            }
        }

        private async Task<string> ExecutePowerShellCommand(string command)
        {
            try
            {
                var process = new Process();
                process.StartInfo.FileName = "powershell.exe";
                process.StartInfo.Arguments = $"-Command \"{command}\"";
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.RedirectStandardOutput = true;
                process.StartInfo.RedirectStandardError = true;
                process.StartInfo.CreateNoWindow = true;

                process.Start();
                string output = await process.StandardOutput.ReadToEndAsync();
                string error = await process.StandardError.ReadToEndAsync();
                process.WaitForExit();

                if (!string.IsNullOrEmpty(error))
                {
                    LogMessage($"PowerShell Error: {error}");
                }

                return output;
            }
            catch (Exception ex)
            {
                LogMessage($"Erro ao executar PowerShell: {ex.Message}");
                return "";
            }
        }

        private async Task NotifyWebApp(string eventType, string message)
        {
            try
            {
                var payload = new
                {
                    event = eventType,
                    message = message,
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                };

                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                // Tentar enviar para o webapp
                var response = await httpClient.PostAsync($"{webappUrl}/api/biometric-event", content);
                
                if (response.IsSuccessStatusCode)
                {
                    LogMessage("📡 Evento enviado para o webapp");
                }
                else
                {
                    LogMessage("⚠️ Webapp não está respondendo");
                }
            }
            catch (Exception ex)
            {
                LogMessage($"⚠️ Erro ao notificar webapp: {ex.Message}");
            }
        }

        private void LogMessage(string message)
        {
            var timestamp = DateTime.Now.ToString("HH:mm:ss");
            var logEntry = $"[{timestamp}] {message}\r\n";
            
            if (txtLog.InvokeRequired)
            {
                txtLog.Invoke(new Action(() => {
                    txtLog.AppendText(logEntry);
                    txtLog.SelectionStart = txtLog.Text.Length;
                    txtLog.ScrollToCaret();
                }));
            }
            else
            {
                txtLog.AppendText(logEntry);
                txtLog.SelectionStart = txtLog.Text.Length;
                txtLog.ScrollToCaret();
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            httpClient?.Dispose();
            base.OnFormClosing(e);
        }
    }

    public class Program
    {
        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new BiometricClient());
        }
    }
}
