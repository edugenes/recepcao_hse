using System;
using System.Data.SQLite;
using System.IO;

namespace RecepcaoHSE
{
    public static class DatabaseManager
    {
        private static string connectionString;
        private static string dbPath;

        public static void Initialize()
        {
            try
            {
                // Caminho do banco de dados
                dbPath = Path.Combine(Application.StartupPath, "recepcao.db");
                connectionString = $"Data Source={dbPath};Version=3;";

                // Criar banco se não existir
                if (!File.Exists(dbPath))
                {
                    SQLiteConnection.CreateFile(dbPath);
                }

                // Criar tabelas
                CreateTables();
                
                // Inserir dados iniciais
                InsertInitialData();
            }
            catch (Exception ex)
            {
                throw new Exception($"Erro ao inicializar banco de dados: {ex.Message}", ex);
            }
        }

        private static void CreateTables()
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                // Tabela de visitantes
                string createVisitantes = @"
                    CREATE TABLE IF NOT EXISTS visitantes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT NOT NULL,
                        cpf TEXT,
                        setor TEXT NOT NULL,
                        paciente TEXT NOT NULL,
                        data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
                        data_saida DATETIME,
                        status TEXT DEFAULT 'ativo'
                    )";

                // Tabela de setores
                string createSetores = @"
                    CREATE TABLE IF NOT EXISTS setores (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT UNIQUE NOT NULL,
                        descricao TEXT,
                        ativo INTEGER DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )";

                using (var command = new SQLiteCommand(createVisitantes, connection))
                {
                    command.ExecuteNonQuery();
                }

                using (var command = new SQLiteCommand(createSetores, connection))
                {
                    command.ExecuteNonQuery();
                }
            }
        }

        private static void InsertInitialData()
        {
            using (var connection = new SQLiteConnection(connectionString))
            {
                connection.Open();

                string[] setores = { "UTI", "Emergência", "Cirurgia", "Cardiologia", 
                                   "Neurologia", "Pediatria", "Oncologia", "Outros" };

                foreach (string setor in setores)
                {
                    string insertSetor = "INSERT OR IGNORE INTO setores (nome) VALUES (@nome)";
                    using (var command = new SQLiteCommand(insertSetor, connection))
                    {
                        command.Parameters.AddWithValue("@nome", setor);
                        command.ExecuteNonQuery();
                    }
                }
            }
        }

        public static SQLiteConnection GetConnection()
        {
            return new SQLiteConnection(connectionString);
        }

        public static int GetVisitantesHoje()
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT COUNT(*) FROM visitantes WHERE DATE(data_entrada) = DATE('now')";
                using (var command = new SQLiteCommand(query, connection))
                {
                    return Convert.ToInt32(command.ExecuteScalar());
                }
            }
        }

        public static int GetVisitantesAtivos()
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT COUNT(*) FROM visitantes WHERE status = 'ativo'";
                using (var command = new SQLiteCommand(query, connection))
                {
                    return Convert.ToInt32(command.ExecuteScalar());
                }
            }
        }

        public static int GetTotalSetores()
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT COUNT(*) FROM setores WHERE ativo = 1";
                using (var command = new SQLiteCommand(query, connection))
                {
                    return Convert.ToInt32(command.ExecuteScalar());
                }
            }
        }
    }
}
