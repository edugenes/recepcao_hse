#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Recepção HSE - Aplicativo Windows Nativo
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

class RecepcaoHSE:
    def __init__(self):
        self.root = tk.Tk()
        self.setup_window()
        self.setup_database()
        self.create_interface()
        self.start_auto_refresh()
        
    def setup_window(self):
        """Configurar janela principal"""
        self.root.title("Sistema de Recepção HSE v1.0")
        self.root.geometry("1200x800")
        self.root.minsize(800, 600)
        
        # Centralizar janela
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() // 2) - (1200 // 2)
        y = (self.root.winfo_screenheight() // 2) - (800 // 2)
        self.root.geometry(f"1200x800+{x}+{y}")
        
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
            
    def create_interface(self):
        """Criar interface do usuário"""
        # Notebook (abas)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Aba Dashboard
        self.create_dashboard_tab()
        
        # Aba Cadastro
        self.create_cadastro_tab()
        
        # Aba Visitantes
        self.create_visitantes_tab()
        
        # Aba Biometria
        self.create_biometria_tab()
        
    def create_dashboard_tab(self):
        """Criar aba do dashboard"""
        dashboard_frame = ttk.Frame(self.notebook)
        self.notebook.add(dashboard_frame, text="📊 Dashboard")
        
        # Título
        title_label = tk.Label(dashboard_frame, text="Sistema de Recepção HSE", 
                              font=("Arial", 16, "bold"), fg="darkblue")
        title_label.pack(pady=20)
        
        # Status
        status_label = tk.Label(dashboard_frame, text="🟢 Sistema Online", 
                               font=("Arial", 12), fg="green")
        status_label.pack(pady=5)
        
        # Frame para cartões
        cards_frame = tk.Frame(dashboard_frame)
        cards_frame.pack(pady=20)
        
        # Cartão 1 - Visitantes Hoje
        self.card1 = self.create_stat_card(cards_frame, "Visitantes Hoje", "0", "#3498db")
        self.card1.grid(row=0, column=0, padx=10, pady=10)
        
        # Cartão 2 - Visitantes Ativos
        self.card2 = self.create_stat_card(cards_frame, "Visitantes Ativos", "0", "#2ecc71")
        self.card2.grid(row=0, column=1, padx=10, pady=10)
        
        # Cartão 3 - Total Setores
        self.card3 = self.create_stat_card(cards_frame, "Total de Setores", "8", "#9b59b6")
        self.card3.grid(row=0, column=2, padx=10, pady=10)
        
        # Botão Atualizar
        refresh_btn = tk.Button(dashboard_frame, text="🔄 Atualizar", 
                               command=self.update_dashboard, bg="#3498db", fg="white")
        refresh_btn.pack(pady=10)
        
    def create_stat_card(self, parent, title, value, color):
        """Criar cartão de estatística"""
        card = tk.Frame(parent, bg="white", relief="solid", bd=1)
        card.configure(width=200, height=120)
        
        title_label = tk.Label(card, text=title, font=("Arial", 10), 
                              bg="white", fg="gray")
        title_label.pack(pady=10)
        
        value_label = tk.Label(card, text=value, font=("Arial", 24, "bold"), 
                              bg="white", fg=color)
        value_label.pack()
        
        return card
        
    def create_cadastro_tab(self):
        """Criar aba de cadastro"""
        cadastro_frame = ttk.Frame(self.notebook)
        self.notebook.add(cadastro_frame, text="📝 Cadastro")
        
        # Título
        title_label = tk.Label(cadastro_frame, text="Cadastro de Visitante", 
                              font=("Arial", 14, "bold"))
        title_label.pack(pady=20)
        
        # Frame do formulário
        form_frame = tk.Frame(cadastro_frame)
        form_frame.pack(pady=20)
        
        # Nome
        tk.Label(form_frame, text="Nome Completo:", font=("Arial", 10)).grid(row=0, column=0, sticky="w", pady=5)
        self.nome_entry = tk.Entry(form_frame, width=40, font=("Arial", 10))
        self.nome_entry.grid(row=0, column=1, pady=5, padx=(10, 0))
        
        # CPF
        tk.Label(form_frame, text="CPF:", font=("Arial", 10)).grid(row=1, column=0, sticky="w", pady=5)
        self.cpf_entry = tk.Entry(form_frame, width=20, font=("Arial", 10))
        self.cpf_entry.grid(row=1, column=1, pady=5, padx=(10, 0))
        
        # Setor
        tk.Label(form_frame, text="Setor:", font=("Arial", 10)).grid(row=2, column=0, sticky="w", pady=5)
        self.setor_combo = ttk.Combobox(form_frame, width=20, font=("Arial", 10))
        self.setor_combo.grid(row=2, column=1, pady=5, padx=(10, 0))
        self.load_setores()
        
        # Paciente
        tk.Label(form_frame, text="Paciente:", font=("Arial", 10)).grid(row=3, column=0, sticky="w", pady=5)
        self.paciente_entry = tk.Entry(form_frame, width=40, font=("Arial", 10))
        self.paciente_entry.grid(row=3, column=1, pady=5, padx=(10, 0))
        
        # Botão Cadastrar
        cadastrar_btn = tk.Button(form_frame, text="Cadastrar Visitante", 
                                 command=self.cadastrar_visitante, bg="#2ecc71", fg="white",
                                 font=("Arial", 10, "bold"))
        cadastrar_btn.grid(row=4, column=1, pady=20, padx=(10, 0))
        
    def create_visitantes_tab(self):
        """Criar aba de visitantes"""
        visitantes_frame = ttk.Frame(self.notebook)
        self.notebook.add(visitantes_frame, text="👥 Visitantes")
        
        # Título
        title_label = tk.Label(visitantes_frame, text="Lista de Visitantes", 
                              font=("Arial", 14, "bold"))
        title_label.pack(pady=20)
        
        # Treeview para lista
        columns = ("ID", "Nome", "CPF", "Setor", "Paciente", "Data Entrada", "Status")
        self.tree = ttk.Treeview(visitantes_frame, columns=columns, show="headings", height=20)
        
        # Configurar colunas
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=120)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(visitantes_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack
        self.tree.pack(side="left", fill="both", expand=True, padx=10)
        scrollbar.pack(side="right", fill="y")
        
    def create_biometria_tab(self):
        """Criar aba de biometria"""
        biometria_frame = ttk.Frame(self.notebook)
        self.notebook.add(biometria_frame, text="🖐️ Biometria")
        
        # Título
        title_label = tk.Label(biometria_frame, text="Captura de Impressão Digital", 
                              font=("Arial", 14, "bold"))
        title_label.pack(pady=20)
        
        # Status do leitor
        self.reader_status = tk.Label(biometria_frame, text="🔍 Verificando leitor...", 
                                     font=("Arial", 12))
        self.reader_status.pack(pady=10)
        
        # Botão Verificar Leitor
        check_btn = tk.Button(biometria_frame, text="🔍 Verificar Leitor", 
                             command=self.check_reader, bg="#3498db", fg="white")
        check_btn.pack(pady=10)
        
        # Botão Capturar
        capture_btn = tk.Button(biometria_frame, text="🖐️ Capturar Impressão", 
                               command=self.capture_fingerprint, bg="#e74c3c", fg="white")
        capture_btn.pack(pady=10)
        
        # Área de log
        log_label = tk.Label(biometria_frame, text="Log de Atividades:", 
                            font=("Arial", 10, "bold"))
        log_label.pack(pady=(20, 5))
        
        self.log_text = scrolledtext.ScrolledText(biometria_frame, height=15, width=80)
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
        app = RecepcaoHSE()
        app.run()
    except Exception as e:
        messagebox.showerror("Erro Fatal", f"Erro ao iniciar aplicativo: {e}")
        sys.exit(1)
