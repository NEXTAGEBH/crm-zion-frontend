"use client";

import { useState } from 'react';
import { Tag, User, Clock } from 'lucide-react';

// Dados iniciais do nosso Funil
const initialFunnel = [
  {
    id: 'novo',
    title: 'Novo Contato',
    color: 'bg-blue-500',
    leads: [
      { id: '1', name: 'Maria Silva', phone: '11 99999-1234', tag: 'Quente', time: '2 min' },
      { id: '2', name: 'Pedro Almeida', phone: '11 98888-5678', tag: 'Meta Ads', time: '15 min' },
    ]
  },
  {
    id: 'atendimento',
    title: 'Em Atendimento',
    color: 'bg-amber-500',
    leads: [
      { id: '3', name: 'Ana Costa', phone: '21 97777-9012', tag: 'Frio', time: '1h' },
    ]
  },
  {
    id: 'cotacao',
    title: 'Fazendo Cotação',
    color: 'bg-violet-500',
    leads: [
      { id: '4', name: 'João Santos', phone: '21 96666-3456', tag: 'Google Ads', time: '3h' },
      { id: '5', name: 'Carla Dias', phone: '11 95555-7890', tag: 'Indicação', time: '5h' },
    ]
  },
  {
    id: 'cliente',
    title: 'Cliente',
    color: 'bg-emerald-500',
    leads: [
      { id: '6', name: 'Roberto Lima', phone: '31 94444-2345', tag: 'Cliente', time: '2d' },
    ]
  },
  {
    id: 'perdido',
    title: 'Perdido',
    color: 'bg-slate-400',
    leads: []
  }
];

export default function FunilPage() {
  const [funnel, setFunnel] = useState(initialFunnel);
  const [draggedLead, setDraggedLead] = useState<any>(null);
  const [draggedFromStep, setDraggedFromStep] = useState<string | null>(null);

  // Lógica de Arrastar e Soltar
  const handleDragStart = (lead: any, stepId: string) => {
    setDraggedLead(lead);
    setDraggedFromStep(stepId);
  };

  const handleDrop = (toStepId: string) => {
    if (!draggedLead || !draggedFromStep || draggedFromStep === toStepId) return;

    setFunnel(prevFunnel => {
      // 1. Remove o lead da coluna original
      const updatedFunnel = prevFunnel.map(step => {
        if (step.id === draggedFromStep) {
          return { ...step, leads: step.leads.filter(l => l.id !== draggedLead.id) };
        }
        return step;
      });

      // 2. Adiciona o lead na nova coluna
      return updatedFunnel.map(step => {
        if (step.id === toStepId) {
          return { ...step, leads: [...step.leads, draggedLead] };
        }
        return step;
      });
    });

    setDraggedLead(null);
    setDraggedFromStep(null);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Funil de Vendas</h1>
        <p className="text-slate-500 text-sm mt-1">Arraste os leads entre as etapas para atualizar o status.</p>
      </div>

      {/* Área do Kanban */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {funnel.map((step) => (
          <div 
            key={step.id} 
            className="w-72 flex-shrink-0 bg-slate-100 rounded-xl p-3 flex flex-col"
            onDragOver={(e) => e.preventDefault()} // Necessário para permitir o drop
            onDrop={() => handleDrop(step.id)}
          >
            {/* Header da Coluna */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className={`w-2.5 h-2.5 rounded-full ${step.color}`}></div>
              <h3 className="font-semibold text-slate-700 text-sm">{step.title}</h3>
              <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{step.leads.length}</span>
            </div>

            {/* Lista de Cards (Leads) */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {step.leads.map((lead) => (
                <div 
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead, step.id)}
                  className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm cursor-grab active:shadow-md hover:border-blue-300 transition-all"
                >
                  <h4 className="font-semibold text-slate-800 text-sm">{lead.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{lead.phone}</p>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">{lead.tag}</span>
                    <div className="flex items-center text-slate-400 text-[10px] gap-1">
                      <Clock size={10} />
                      <span>{lead.time}</span>
                    </div>
                  </div>
                </div>
              ))}

              {step.leads.length === 0 && (
                <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-400">
                  Arraste leads aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}