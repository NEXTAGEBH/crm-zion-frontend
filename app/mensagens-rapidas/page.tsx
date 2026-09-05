"use client";

import { Search, Plus, Copy } from 'lucide-react';

const mensagensRapidas = [
  { id: '1', titulo: 'Apresentação', atalho: '/apresentacao', categoria: 'Atendimento', mensagem: 'Olá, tudo bem? Meu nome é William, sou consultor aqui. Como posso te ajudar hoje?' },
  { id: '2', titulo: 'Pedido de Orçamento', atalho: '/orcamento', categoria: 'Cotação', mensagem: 'Para que eu possa montar o melhor orçamento pra você, me passa seu nome completo e qual serviço te interessa?' },
  { id: '3', titulo: 'Follow-up 24h', atalho: '/follow24', categoria: 'Follow up', mensagem: 'Oi, tudo bem? Vi que não conseguiu responder ainda. Fico à disposição caso tenha alguma dúvida!' },
  { id: '4', titulo: 'Link de Pagamento', atalho: '/pagamento', categoria: 'Financeiro', mensagem: 'Segue o link para realizar o pagamento: [LINK]. Qualquer dúvida, me chame!' },
  { id: '5', titulo: 'Encerramento', atalho: '/encerramento', categoria: 'Atendimento', mensagem: 'Muito obrigado pelo contato! Se precisar de algo no futuro, estaremos aqui. Tenha um ótimo dia!' },
];

// Cores das categorias
const categoriaCores: Record<string, string> = {
  'Atendimento': 'bg-blue-100 text-blue-700',
  'Cotação': 'bg-violet-100 text-violet-700',
  'Follow up': 'bg-amber-100 text-amber-700',
  'Financeiro': 'bg-emerald-100 text-emerald-700',
};

export default function MensagensRapidasPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mensagens Rápidas</h1>
          <p className="text-slate-500 text-sm mt-1">Crie atalhos para respostas padrão e agilize o atendimento no WhatsApp.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} />
          Nova Mensagem
        </button>
      </div>

      {/* Grid de Mensagens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {mensagensRapidas.map((msg) => (
          <div key={msg.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">{msg.titulo}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoriaCores[msg.categoria] || 'bg-slate-100 text-slate-500'}`}>
                {msg.categoria}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex-1">
              <p className="text-sm text-slate-600 leading-relaxed">{msg.mensagem}</p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md">
                <span className="text-xs font-mono font-bold text-slate-600">{msg.atalho}</span>
              </div>
              <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                <Copy size={14} />
                Copiar Atalho
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}