"use client";

import { useState } from 'react';
import { Building2, Users, ShieldCheck, Plus, Power, PowerOff } from 'lucide-react';

// Simulação dos clientes da sua agência
const clientesIniciais = [
  { id: '1', empresa: 'Dentista Sorriso Perfeito', slug: 'dentista-sorriso', admin: 'carlos@dentista.com', qtdeUsuarios: 4, status: true },
  { id: '2', empresa: 'Auto Escola Piloto', slug: 'auto-escola', admin: 'maria@autoescola.com', qtdeUsuarios: 2, status: true },
  { id: '3', empresa: 'Loja de Roupas Fashion', slug: 'loja-fashion', admin: 'joao@fashion.com', qtdeUsuarios: 1, status: false }, // Inativo
];

export default function AdminZionPage() {
  const [clientes, setClientes] = useState(clientesIniciais);

  const toggleStatus = (id: string) => {
    setClientes(clientes.map(c => c.id === id ? { ...c, status: !c.status } : c));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">Painel Zion</h1>
          </div>
          <p className="text-slate-500 text-sm">Gerencie as contas das empresas (seus clientes) e libere acessos.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} />
          Cadastrar Nova Empresa
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Empresa</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Admin (E-mail)</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Usuários</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Ação</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                      {cliente.empresa.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{cliente.empresa}</p>
                      <p className="text-xs text-slate-400">{cliente.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-slate-600">{cliente.admin}</td>
                <td className="py-4 px-4 text-sm text-slate-600 text-center">
                  <span className="flex items-center gap-1"><Users size={14}/> {cliente.qtdeUsuarios}</span>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cliente.status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {cliente.status ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <button 
                    onClick={() => toggleStatus(cliente.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cliente.status ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    {cliente.status ? <><PowerOff size={14}/> Bloquear</> : <><Power size={14}/> Liberar</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}