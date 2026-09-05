import { Megaphone, Plus, Send, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const campanhas = [
  { 
    id: '1', 
    nome: 'Black Friday - Clientes Antigos', 
    publico: 'Tag: Cliente Recorrente', 
    status: 'Concluída',
    enviadas: 450,
    entregues: 432,
    respondidas: 85,
    erros: 18,
    icon: CheckCircle,
    corStatus: 'text-emerald-600 bg-emerald-50'
  },
  { 
    id: '2', 
    nome: 'Retargeting Site - Abandono', 
    publico: 'Etapa: Fazendo Cotação', 
    status: 'Enviando',
    enviadas: 120,
    entregues: 115,
    respondidas: 12,
    erros: 5,
    icon: Send,
    corStatus: 'text-blue-600 bg-blue-50'
  },
  { 
    id: '3', 
    nome: 'Promoção Fim de Ano', 
    publico: 'Origem: Meta Ads', 
    status: 'Agendada',
    enviadas: 0,
    entregues: 0,
    respondidas: 0,
    erros: 0,
    icon: Clock,
    corStatus: 'text-amber-600 bg-amber-50'
  },
];

export default function CampanhasPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campanhas</h1>
          <p className="text-slate-500 text-sm mt-1">Envio de mensagens em massa para listas de contatos qualificadas.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} />
          Nova Campanha
        </button>
      </div>

      <div className="space-y-5">
        {campanhas.map((camp) => (
          <div key={camp.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">{camp.nome}</h3>
                <p className="text-sm text-slate-500 mt-1">Público: {camp.publico}</p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${camp.corStatus}`}>
                <camp.icon size={14} />
                {camp.status}
              </div>
            </div>

            {camp.status !== 'Agendada' && (
              <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Enviadas</p>
                  <p className="text-lg font-bold text-slate-800">{camp.enviadas}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Entregues</p>
                  <p className="text-lg font-bold text-emerald-600">{camp.entregues}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Respondidas</p>
                  <p className="text-lg font-bold text-blue-600">{camp.respondidas}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Erros</p>
                  <p className="text-lg font-bold text-red-500 flex items-center gap-1">{camp.erros} {camp.erros > 0 && <AlertTriangle size={14}/>}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-sm text-amber-700">
        <Megaphone size={20} className="flex-shrink-0" />
        <span>Dica: Para evitar bloqueios no WhatsApp, envie campanhas apenas para contatos que já interagiram com sua empresa e respeite o limite diário da API Oficial.</span>
      </div>
    </div>
  );
}