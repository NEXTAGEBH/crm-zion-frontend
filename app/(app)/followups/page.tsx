"use client";

import { AlertCircle, Clock, CalendarCheck, CheckCircle2, MessageCircle, Phone } from 'lucide-react';

// Dados fictícios de Follow-ups
const followUps = {
  atrasados: [
    { id: '1', nome: 'João Santos', telefone: '(21) 98888-5678', motivo: 'Enviar orçamento atualizado', horario: 'Ontem, 14:00', responsavel: 'William' },
    { id: '2', nome: 'Ana Costa', telefone: '(21) 97777-9012', motivo: 'Retorno sobre proposta', horario: 'Ontem, 16:30', responsavel: 'Ana' },
  ],
  hoje: [
    { id: '3', nome: 'Maria Silva', telefone: '(11) 99999-1234', motivo: 'Confirmar reunião de amanhã', horario: 'Hoje, 11:00', responsavel: 'William' },
    { id: '4', nome: 'Carla Dias', telefone: '(31) 95555-7890', motivo: 'Primeiro contato (Lead novo)', horario: 'Hoje, 15:00', responsavel: 'William' },
  ],
  proximos: [
    { id: '5', nome: 'Roberto Lima', telefone: '(31) 94444-2345', motivo: 'Follow-up pós-venda', horario: 'Amanhã, 10:00', responsavel: 'Carlos' },
    { id: '6', nome: 'Pedro Almeida', telefone: '(11) 96666-3456', motivo: 'Verificar se recebeu o e-mail', horario: 'Sexta, 09:00', responsavel: 'Ana' },
  ]
};

// Componente reutilizável para cada grupo de Follow-up
const FollowUpGroup = ({ titulo, icon: Icon, corIcon, corFundo, itens }: any) => {
  if (itens.length === 0) return null;
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-lg ${corFundo}`}>
          <Icon size={16} className={corIcon} />
        </div>
        <h2 className="font-semibold text-slate-800">{titulo}</h2>
        <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{itens.length}</span>
      </div>
      
      <div className="space-y-3">
        {itens.map((item: any) => (
          <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800 text-sm">{item.nome}</h3>
                <span className="text-xs text-slate-400">• {item.horario}</span>
              </div>
              <p className="text-sm text-slate-500 truncate">{item.motivo}</p>
            </div>
            
            <div className="flex-shrink-0 text-right mr-4">
              <p className="text-xs text-slate-500">Responsável</p>
              <p className="text-sm font-medium text-slate-700">{item.responsavel}</p>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2 border-l border-slate-200 pl-4">
              <button className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors" title="Marcar como feito">
                <CheckCircle2 size={18} />
              </button>
              <button className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Abrir no WhatsApp">
                <MessageCircle size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function FollowUpsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Follow Ups</h1>
        <p className="text-slate-500 text-sm mt-1">Nunca deixe um lead sem resposta. Gerencie seus contatos agendados.</p>
      </div>

      {/* Lista Agrupada */}
      <FollowUpGroup 
        titulo="Atrasados" 
        icon={AlertCircle} 
        corIcon="text-red-600" 
        corFundo="bg-red-50" 
        itens={followUps.atrasados} 
      />
      
      <FollowUpGroup 
        titulo="Hoje" 
        icon={Clock} 
        corIcon="text-amber-600" 
        corFundo="bg-amber-50" 
        itens={followUps.hoje} 
      />

      <FollowUpGroup 
        titulo="Próximos Dias" 
        icon={CalendarCheck} 
        corIcon="text-blue-600" 
        corFundo="bg-blue-50" 
        itens={followUps.proximos} 
      />

    </div>
  );
}