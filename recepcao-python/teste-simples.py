#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste simples do aplicativo
"""

import tkinter as tk
from tkinter import messagebox

def testar():
    messagebox.showinfo("Teste", "Aplicativo Python funcionando!")

# Criar janela
root = tk.Tk()
root.title("Teste - Sistema HSE")
root.geometry("400x300")

# Botão de teste
btn = tk.Button(root, text="Testar Aplicativo", command=testar, 
                bg="blue", fg="white", font=("Arial", 12))
btn.pack(pady=50)

# Label
lbl = tk.Label(root, text="Sistema de Recepção HSE\nAplicativo Python Funcionando!", 
               font=("Arial", 14), fg="green")
lbl.pack(pady=20)

print("Aplicativo iniciado!")
root.mainloop()
print("Aplicativo finalizado!")
