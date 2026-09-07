"use client";

import { useState } from 'react';
import { Zap, Plus, MessageCircle, Clock, UserPlus, AlertCircle } from 'lucide-react';

// Dados fictícios de Automações
const automacoesIniciais = [
  { 
    id: '1', 
    nome: 'Boas-vindas Automáticas', 
    gatilho: 'Novo Contato', 
    acao: 'Enviar mensagem de saudação', 
    status: true,
    icon: UserPlus,
    corGatilho: 'text-blue-600 bg-blue-50'
  },
  { 
    id: '2', 
    nome: 'Fora do Horário', 
    gatilho: 'Mensagem fora do horário', 
    acao: 'Avisar que retornaremos no próximo dia útil', 
    status: true,
    icon: Clock,
    corGatilho: 'text-amber-600 bg-amber-50'
  },
  { 
    id: '3', 
    nome: 'Follow-up Automático', 
    gatilho: 'Sem resposta por 24h', 
    acao: 'Enviar mensagem de cobrança amigável', 
    status: false,
    icon: AlertCircle,
    corGatilho: 'text-red-600 bg-red-50'
  },
  { 
    id: '4', 
    nome: 'Pedido de Orçamento', 
    gatilho: 'Tag "Orçamento" adicionada', 
    acao: 'Enviar template de pedido de dados', 
    status: true,
    icon: MessageCircle,
    corGatilho: 'text-emerald-600 bg-emerald-50'
  },
];

export default function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState(automacoesIniciais);

  // Função para ligar/desligar a automação
  const toggleAutomacao = (id: string) => {
    setAutomacoes(automacoes.map(auto => 
      auto.id === id ? { ...auto, status: !auto.status } : auto
    ));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Automações</h1>
          <p className="text-slate-500 text-sm mt-1">Crie gatilhos automáticos para atender melhor e mais rápido.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} />
          Nova Automação
        </button>
      </div>

      {/* Lista de Automações */}
      <div className="space-y-4">
        {automacoes.map((auto) => (
          <div key={auto.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
            
            {/* Ícone da Automação */}
            <div className={`p-3 rounded-lg ${auto.corGatilho}`}>
              <auto.icon size={22} />
            </div>

            {/* Informações */}
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">{auto.nome}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className={`px-2 py-0.5 rounded-full font-medium ${auto.corGatilho}`}>Gatilho: {auto.gatilho}</span>
                <span>→</span>
                <span>{auto.acao}</span>
              </div>
            </div>

            {/* Toggle Switch (Liga/Desliga) */}
            <div className="flex-shrink-0">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={auto.status} 
                  onChange={() => toggleAutomacao(auto.id)}
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Dica Visual */}
      <div className="mt-8 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3 text-sm text-blue-700">
        <Zap size={20} className="flex-shrink-0" />
        <span>Dica: Use automações para garantir que nenhum lead fique sem resposta, mesmo fora do horário comercial.</span>
      </div>
    </div>
  );
}