"use client";

import { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal, ChevronDown } from 'lucide-react';

// Dados fictícios de contatos que vieram de tráfego pago
const contatosIniciais = [
  { id: '1', nome: 'Maria Silva', telefone: '(11) 99999-1234', etapa: 'Novo', responsavel: 'William', origem: 'Meta Ads', campanha: 'Campanha Verão', ultimaInteracao: '2 min atrás' },
  { id: '2', nome: 'João Santos', telefone: '(21) 98888-5678', etapa: 'Cotação', responsavel: 'Ana', origem: 'Google Ads', campanha: 'Search Principal', ultimaInteracao: '1h atrás' },
  { id: '3', nome: 'Ana Costa', telefone: '(21) 97777-9012', etapa: 'Atendimento', responsavel: 'William', origem: 'Instagram', campanha: 'Stories Promo', ultimaInteracao: '3h atrás' },
  { id: '4', nome: 'Pedro Almeida', telefone: '(11) 96666-3456', etapa: 'Cliente', responsavel: 'Carlos', origem: 'Meta Ads', campanha: 'Retargeting', ultimaInteracao: '1 dia' },
  { id: '5', nome: 'Carla Dias', telefone: '(31) 95555-7890', etapa: 'Novo', responsavel: 'Ana', origem: 'Indicação', campanha: '-', ultimaInteracao: '2 dias' },
  { id: '6', nome: 'Roberto Lima', telefone: '(31) 94444-2345', etapa: 'Perdido', responsavel: 'Carlos', origem: 'Orgânico', campanha: '-', ultimaInteracao: '5 dias' },
];

// Cores das etapas para ficar visual e intuitivo
const etapaCores: Record<string, string> = {
  'Novo': 'bg-blue-100 text-blue-700',
  'Atendimento': 'bg-amber-100 text-amber-700',
  'Cotação': 'bg-violet-100 text-violet-700',
  'Cliente': 'bg-emerald-100 text-emerald-700',
  'Perdido': 'bg-slate-100 text-slate-500',
};

export default function ContatosPage() {
  const [busca, setBusca] = useState('');

  // Filtro simples de busca por nome ou telefone
  const contatosFiltrados = contatosIniciais.filter(contato => 
    contato.nome.toLowerCase().includes(busca.toLowerCase()) || 
    contato.telefone.includes(busca)
  );

  return (
    <div>
      {/* Header da Página */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contatos</h1>
          <p className="text-slate-500 text-sm mt-1">Todos os leads e clientes da sua operação.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} />
          Adicionar Contato
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou telefone..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
          <Filter size={16} />
          Filtrar
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Tabela de Contatos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapa</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Origem</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Campanha</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Interação</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {contatosFiltrados.map((contato) => (
                <tr key={contato.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
                        {contato.nome.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{contato.nome}</p>
                        <p className="text-xs text-slate-500">{contato.telefone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${etapaCores[contato.etapa] || 'bg-slate-100 text-slate-500'}`}>
                      {contato.etapa}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{contato.responsavel}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{contato.origem}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">{contato.campanha}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">{contato.ultimaInteracao}</td>
                  <td className="py-3 px-4">
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Rodapé da Tabela (Paginação Visual) */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-500">Mostrando {contatosFiltrados.length} de {contatosIniciais.length} contatos</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">Anterior</button>
            <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}