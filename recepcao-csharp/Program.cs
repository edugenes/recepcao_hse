using System;
using System.Windows.Forms;

namespace RecepcaoHSE
{
    internal static class Program
    {
        /// <summary>
        /// Ponto de entrada principal para o aplicativo.
        /// </summary>
        [STAThread]
        static void Main()
        {
            // Configurar aplicativo Windows Forms
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            try
            {
                // Inicializar banco de dados
                DatabaseManager.Initialize();
                
                // Executar aplicativo principal
                Application.Run(new MainForm());
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao inicializar o sistema:\n\n{ex.Message}", 
                    "Erro de Inicialização", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
