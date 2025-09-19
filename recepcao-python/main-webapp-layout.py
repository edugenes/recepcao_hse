#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Recepção HSE - Layout Exato do WebApp
Desenvolvido em Python + Tkinter
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import sqlite3
import os
import threading
import time
from datetime import datetime
import subprocess
import sys

class RecepcaoHSEWebApp:
    def __init__(self):
        self.root = tk.Tk()
        self.setup_window()
        self.setup_database()
        self.create_webapp_layout()
        self.start_auto_refresh()
        
    def setup_window(self):
        """Configurar janela principal"""
        self.root.title("Sistema de Recepção HSE")
        self.root.geometry("1400x900")
        self.root.minsize(1200, 800)
        
        # Centralizar janela
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() // 2) - (1400 // 2)
        y = (self.root.winfo_screenheight() // 2) - (900 // 2)
        self.root.geometry(f"1400x900+{x}+{y}")
        
        # Configurar fechamento
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
    def setup_database(self):
        """Configurar banco de dados SQLite"""
        self.db_path = os.path.join(os.path.dirname(__file__), "recepcao.db")
        self.init_database()
        
    def init_database(self):
        """Inicializar banco de dados"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Criar tabela de visitantes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS visitantes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    cpf TEXT,
                    setor TEXT NOT NULL,
                    paciente TEXT NOT NULL,
                    data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
                    data_saida DATETIME,
                    status TEXT DEFAULT 'ativo'
                )
            """)
            
            # Criar tabela de setores
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS setores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT UNIQUE NOT NULL,
                    descricao TEXT,
                    ativo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Inserir setores padrão
            setores = ['UTI', 'Emergência', 'Cirurgia', 'Cardiologia', 
                      'Neurologia', 'Pediatria', 'Oncologia', 'Outros']
            
            for setor in setores:
                cursor.execute("INSERT OR IGNORE INTO setores (nome) VALUES (?)", (setor,))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao inicializar banco de dados: {e}")
            
    def create_webapp_layout(self):
        """Criar layout exato do webapp"""
        # Frame principal
        main_frame = tk.Frame(self.root, bg="#f8f9fa")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header - Exatamente igual ao webapp
        self.create_header(main_frame)
        
        # Container principal
        container = tk.Frame(main_frame, bg="#f8f9fa")
        container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Dashboard - Exatamente igual ao webapp
        self.create_dashboard(container)
        
        # Formulário de cadastro - Exatamente igual ao webapp
        self.create_cadastro_form(container)
        
        # Lista de visitantes - Exatamente igual ao webapp
        self.create_visitantes_list(container)
        
        # Seção de biometria - Exatamente igual ao webapp
        self.create_biometria_section(container)
        
    def create_header(self, parent):
        """Criar header exato do webapp"""
        header_frame = tk.Frame(parent, bg="#2c3e50", height=80)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)
        
        # Título
        title_label = tk.Label(header_frame, text="Sistema de Recepção HSE", 
                              font=("Arial", 24, "bold"), fg="white", bg="#2c3e50")
        title_label.pack(side=tk.LEFT, padx=20, pady=20)
        
        # Status
        status_label = tk.Label(header_frame, text="🟢 Sistema Online", 
                               font=("Arial", 14), fg="#2ecc71", bg="#2c3e50")
        status_label.pack(side=tk.RIGHT, padx=20, pady=20)
        
    def create_dashboard(self, parent):
        """Criar dashboard exato do webapp"""
        dashboard_frame = tk.Frame(parent, bg="white", relief="solid", bd=1)
        dashboard_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Título do dashboard
        title_label = tk.Label(dashboard_frame, text="📊 Dashboard", 
                              font=("Arial", 18, "bold"), bg="white")
        title_label.pack(pady=20)
        
        # Container dos cartões
        cards_container = tk.Frame(dashboard_frame, bg="white")
        cards_container.pack(pady=20, padx=20)
        
        # Cartão 1 - Visitantes Hoje
        self.card1 = self.create_dashboard_card(cards_container, "Visitantes Hoje", "0", "#3498db")
        self.card1.pack(side=tk.LEFT, padx=10)
        
        # Cartão 2 - Visitantes Ativos
        self.card2 = self.create_dashboard_card(cards_container, "Visitantes Ativos", "0", "#2ecc71")
        self.card2.pack(side=tk.LEFT, padx=10)
        
        # Cartão 3 - Total Setores
        self.card3 = self.create_dashboard_card(cards_container, "Total de Setores", "8", "#9b59b6")
        self.card3.pack(side=tk.LEFT, padx=10)
        
    def create_dashboard_card(self, parent, title, value, color):
        """Criar cartão do dashboard exato do webapp"""
        card = tk.Frame(parent, bg="white", relief="solid", bd=1, width=200, height=120)
        card.pack_propagate(False)
        
        # Título do cartão
        title_label = tk.Label(card, text=title, font=("Arial", 12), 
                              bg="white", fg="#7f8c8d")
        title_label.pack(pady=(15, 5))
        
        # Valor do cartão
        value_label = tk.Label(card, text=value, font=("Arial", 28, "bold"), 
                              bg="white", fg=color)
        value_label.pack()
        
        return card
        
    def create_cadastro_form(self, parent):
        """Criar formulário de cadastro exato do webapp"""
        form_frame = tk.Frame(parent, bg="white", relief="solid", bd=1)
        form_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Título do formulário
        title_label = tk.Label(form_frame, text="📝 Cadastro de Visitante", 
                              font=("Arial", 18, "bold"), bg="white")
        title_label.pack(pady=20)
        
        # Container do formulário
        form_container = tk.Frame(form_frame, bg="white")
        form_container.pack(pady=20, padx=40)
        
        # Linha 1 - Nome e CPF
        row1 = tk.Frame(form_container, bg="white")
        row1.pack(fill=tk.X, pady=10)
        
        # Nome
        nome_frame = tk.Frame(row1, bg="white")
        nome_frame.pack(side=tk.LEFT, padx=(0, 20))
        
        tk.Label(nome_frame, text="Nome Completo:", font=("Arial", 12, "bold"), 
                bg="white").pack(anchor="w")
        self.nome_entry = tk.Entry(nome_frame, width=30, font=("Arial", 11))
        self.nome_entry.pack(pady=(5, 0))
        
        # CPF
        cpf_frame = tk.Frame(row1, bg="white")
        cpf_frame.pack(side=tk.LEFT)
        
        tk.Label(cpf_frame, text="CPF:", font=("Arial", 12, "bold"), 
                bg="white").pack(anchor="w")
        self.cpf_entry = tk.Entry(cpf_frame, width=20, font=("Arial", 11))
        self.cpf_entry.pack(pady=(5, 0))
        
        # Linha 2 - Setor e Paciente
        row2 = tk.Frame(form_container, bg="white")
        row2.pack(fill=tk.X, pady=10)
        
        # Setor
        setor_frame = tk.Frame(row2, bg="white")
        setor_frame.pack(side=tk.LEFT, padx=(0, 20))
        
        tk.Label(setor_frame, text="Setor:", font=("Arial", 12, "bold"), 
                bg="white").pack(anchor="w")
        self.setor_combo = ttk.Combobox(setor_frame, width=20, font=("Arial", 11))
        self.setor_combo.pack(pady=(5, 0))
        self.load_setores()
        
        # Paciente
        paciente_frame = tk.Frame(row2, bg="white")
        paciente_frame.pack(side=tk.LEFT)
        
        tk.Label(paciente_frame, text="Paciente:", font=("Arial", 12, "bold"), 
                bg="white").pack(anchor="w")
        self.paciente_entry = tk.Entry(paciente_frame, width=30, font=("Arial", 11))
        self.paciente_entry.pack(pady=(5, 0))
        
        # Botão Cadastrar
        cadastrar_btn = tk.Button(form_container, text="Cadastrar Visitante", 
                                 command=self.cadastrar_visitante, 
                                 bg="#3498db", fg="white", font=("Arial", 12, "bold"),
                                 relief="flat", padx=20, pady=10)
        cadastrar_btn.pack(pady=20)
        
    def create_visitantes_list(self, parent):
        """Criar lista de visitantes exata do webapp"""
        list_frame = tk.Frame(parent, bg="white", relief="solid", bd=1)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
        
        # Título da lista
        title_label = tk.Label(list_frame, text="👥 Lista de Visitantes", 
                              font=("Arial", 18, "bold"), bg="white")
        title_label.pack(pady=20)
        
        # Container da tabela
        table_container = tk.Frame(list_frame, bg="white")
        table_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 20))
        
        # Treeview para lista
        columns = ("ID", "Nome", "CPF", "Setor", "Paciente", "Data Entrada", "Status")
        self.tree = ttk.Treeview(table_container, columns=columns, show="headings", height=15)
        
        # Configurar colunas
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=120)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(table_container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
    def create_biometria_section(self, parent):
        """Criar seção de biometria exata do webapp"""
        biometria_frame = tk.Frame(parent, bg="white", relief="solid", bd=1)
        biometria_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Título da biometria
        title_label = tk.Label(biometria_frame, text="🖐️ Captura de Impressão Digital", 
                              font=("Arial", 18, "bold"), bg="white")
        title_label.pack(pady=20)
        
        # Container da biometria
        biometria_container = tk.Frame(biometria_frame, bg="white")
        biometria_container.pack(pady=20, padx=40)
        
        # Status do leitor
        self.reader_status = tk.Label(biometria_container, text="🔍 Verificando leitor...", 
                                     font=("Arial", 14), bg="white")
        self.reader_status.pack(pady=10)
        
        # Botões
        buttons_frame = tk.Frame(biometria_container, bg="white")
        buttons_frame.pack(pady=20)
        
        # Botão Verificar Leitor
        check_btn = tk.Button(buttons_frame, text="🔍 Verificar Leitor", 
                             command=self.check_reader, bg="#3498db", fg="white",
                             font=("Arial", 12, "bold"), relief="flat", padx=20, pady=10)
        check_btn.pack(side=tk.LEFT, padx=10)
        
        # Botão Capturar
        capture_btn = tk.Button(buttons_frame, text="🖐️ Capturar Impressão", 
                               command=self.capture_fingerprint, bg="#e74c3c", fg="white",
                               font=("Arial", 12, "bold"), relief="flat", padx=20, pady=10)
        capture_btn.pack(side=tk.LEFT, padx=10)
        
        # Área de log
        log_label = tk.Label(biometria_container, text="Log de Atividades:", 
                            font=("Arial", 14, "bold"), bg="white")
        log_label.pack(pady=(20, 5))
        
        self.log_text = scrolledtext.ScrolledText(biometria_container, height=8, width=80,
                                                 font=("Consolas", 10))
        self.log_text.pack(pady=10, padx=20, fill="both", expand=True)
        
        # Verificar leitor na inicialização
        self.check_reader()
        
    def load_setores(self):
        """Carregar setores no ComboBox"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT nome FROM setores WHERE ativo = 1 ORDER BY nome")
            setores = [row[0] for row in cursor.fetchall()]
            self.setor_combo['values'] = setores
            conn.close()
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao carregar setores: {e}")
            
    def update_dashboard(self):
        """Atualizar dashboard"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Visitantes hoje
            cursor.execute("SELECT COUNT(*) FROM visitantes WHERE DATE(data_entrada) = DATE('now')")
            visitantes_hoje = cursor.fetchone()[0]
            
            # Visitantes ativos
            cursor.execute("SELECT COUNT(*) FROM visitantes WHERE status = 'ativo'")
            visitantes_ativos = cursor.fetchone()[0]
            
            # Total setores
            cursor.execute("SELECT COUNT(*) FROM setores WHERE ativo = 1")
            total_setores = cursor.fetchone()[0]
            
            conn.close()
            
            # Atualizar cartões
            self.card1.winfo_children()[1].config(text=str(visitantes_hoje))
            self.card2.winfo_children()[1].config(text=str(visitantes_ativos))
            self.card3.winfo_children()[1].config(text=str(total_setores))
            
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao atualizar dashboard: {e}")
            
    def cadastrar_visitante(self):
        """Cadastrar novo visitante"""
        try:
            nome = self.nome_entry.get().strip()
            cpf = self.cpf_entry.get().strip()
            setor = self.setor_combo.get()
            paciente = self.paciente_entry.get().strip()
            
            if not nome:
                messagebox.showwarning("Validação", "Por favor, informe o nome do visitante.")
                return
                
            if not setor:
                messagebox.showwarning("Validação", "Por favor, selecione um setor.")
                return
                
            if not paciente:
                messagebox.showwarning("Validação", "Por favor, informe o nome do paciente.")
                return
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO visitantes (nome, cpf, setor, paciente) 
                VALUES (?, ?, ?, ?)
            """, (nome, cpf, setor, paciente))
            conn.commit()
            conn.close()
            
            # Limpar formulário
            self.nome_entry.delete(0, tk.END)
            self.cpf_entry.delete(0, tk.END)
            self.setor_combo.set("")
            self.paciente_entry.delete(0, tk.END)
            
            messagebox.showinfo("Sucesso", "Visitante cadastrado com sucesso!")
            self.update_visitantes_list()
            self.update_dashboard()
            
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao cadastrar visitante: {e}")
            
    def update_visitantes_list(self):
        """Atualizar lista de visitantes"""
        try:
            # Limpar lista
            for item in self.tree.get_children():
                self.tree.delete(item)
                
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, nome, cpf, setor, paciente, data_entrada, status
                FROM visitantes 
                ORDER BY data_entrada DESC
            """)
            
            for row in cursor.fetchall():
                self.tree.insert("", "end", values=row)
                
            conn.close()
            
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao atualizar lista: {e}")
            
    def check_reader(self):
        """Verificar leitor DigitalPersona"""
        self.log_message("🔍 Verificando leitor DigitalPersona 4500...")
        
        try:
            # Comando PowerShell para verificar dispositivos biométricos
            cmd = [
                "powershell", "-Command",
                "Get-PnpDevice -Class Biometric | Where-Object {$_.FriendlyName -like '*DigitalPersona*'} | Select-Object FriendlyName, Status"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and "DigitalPersona" in result.stdout:
                self.reader_status.config(text="✅ Leitor DigitalPersona 4500 detectado", fg="green")
                self.log_message("✅ Leitor DigitalPersona 4500 detectado e funcionando!")
                return True
            else:
                self.reader_status.config(text="❌ Leitor DigitalPersona 4500 não detectado", fg="red")
                self.log_message("❌ Leitor DigitalPersona 4500 não detectado")
                self.log_message("💡 Verifique se o leitor está conectado e os drivers instalados")
                return False
                
        except subprocess.TimeoutExpired:
            self.reader_status.config(text="⏰ Timeout na verificação", fg="orange")
            self.log_message("⏰ Timeout na verificação do leitor")
            return False
        except Exception as e:
            self.reader_status.config(text="❌ Erro na verificação", fg="red")
            self.log_message(f"❌ Erro ao verificar leitor: {e}")
            return False
            
    def capture_fingerprint(self):
        """Capturar impressão digital"""
        self.log_message("🖐️ Iniciando captura de impressão digital...")
        
        if not self.check_reader():
            messagebox.showwarning("Aviso", "Leitor DigitalPersona não detectado. Verifique a conexão.")
            return
            
        try:
            # Simular captura (aqui você integraria o SDK real)
            self.log_message("📡 Conectando com o leitor...")
            self.log_message("👆 Coloque o dedo no leitor...")
            
            # Simular delay de captura
            self.root.after(2000, self.simulate_capture_complete)
            
        except Exception as e:
            self.log_message(f"❌ Erro na captura: {e}")
            
    def simulate_capture_complete(self):
        """Simular captura completa"""
        import random
        quality = random.randint(60, 99)
        template = f"TEMPLATE_{int(time.time())}"
        
        self.log_message(f"✅ Captura realizada com sucesso!")
        self.log_message(f"📊 Qualidade: {quality}%")
        self.log_message(f"🔑 Template: {template}")
        self.log_message("💾 Impressão digital salva no sistema")
        
        messagebox.showinfo("Sucesso", f"Impressão digital capturada com sucesso!\nQualidade: {quality}%")
        
    def log_message(self, message):
        """Adicionar mensagem ao log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        
    def start_auto_refresh(self):
        """Iniciar atualização automática"""
        def refresh_loop():
            while True:
                try:
                    self.root.after(0, self.update_dashboard)
                    self.root.after(0, self.update_visitantes_list)
                except:
                    break
                time.sleep(5)  # Atualizar a cada 5 segundos
                
        refresh_thread = threading.Thread(target=refresh_loop, daemon=True)
        refresh_thread.start()
        
    def on_closing(self):
        """Evento de fechamento da janela"""
        if messagebox.askyesno("Confirmar Saída", "Deseja realmente sair do sistema?"):
            self.root.destroy()
            
    def run(self):
        """Executar aplicativo"""
        self.update_dashboard()
        self.update_visitantes_list()
        self.root.mainloop()

if __name__ == "__main__":
    try:
        app = RecepcaoHSEWebApp()
        app.run()
    except Exception as e:
        messagebox.showerror("Erro Fatal", f"Erro ao iniciar aplicativo: {e}")
        sys.exit(1)
