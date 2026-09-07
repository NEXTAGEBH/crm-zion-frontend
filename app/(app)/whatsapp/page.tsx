import { Search, Phone, MoreVertical, Paperclip, Smile, Send, Tag, Clock, User } from 'lucide-react';

// Dados fictícios para simular o CRM já funcionando
const conversas = [
  { nome: 'Maria Silva', msg: 'Olá, gostaria de saber sobre o...', hora: '10:42', naoLidas: 2, etapa: 'Novo' },
  { nome: 'João Santos', msg: 'Certo, vou aguardar o orçamento.', hora: '10:15', naoLidas: 0, etapa: 'Cotação' },
  { nome: 'Ana Costa', msg: 'Vocês trabalham com entrega?', hora: '09:30', naoLidas: 1, etapa: 'Atendimento' },
  { nome: 'Pedro Almeida', msg: 'Muito obrigado pela ajuda!', hora: 'Ontem', naoLidas: 0, etapa: 'Cliente' },
];

export default function WhatsAppPage() {
  return (
    // -m-8 serve para cancelar o padding do layout principal e ocupar toda a tela
    <div className="flex h-[calc(100vh-4rem)] -m-8 bg-white overflow-hidden">
      
      {/* COLUNA 1: Lista de Conversas (Esquerda) */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Conversas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar contato..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversas.map((conversa, index) => (
            <div key={index} className={`flex items-center gap-3 p-4 cursor-pointer border-b border-slate-100 hover:bg-slate-100 ${index === 0 ? 'bg-blue-50' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-slate-300 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-slate-800 truncate">{conversa.nome}</span>
                  <span className="text-xs text-slate-500">{conversa.hora}</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-1">{conversa.msg}</p>
              </div>
              {conversa.naoLidas > 0 && (
                <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{conversa.naoLidas}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* COLUNA 2: Chat Central (Meio) */}
      <div className="flex-1 flex flex-col">
        {/* Header do Chat */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-300"></div>
            <div>
              <h3 className="font-semibold text-slate-800">Maria Silva</h3>
              <p className="text-xs text-emerald-500">Online</p>
            </div>
          </div>
          <div className="flex gap-4 text-slate-500">
            <Phone size={20} className="cursor-pointer hover:text-blue-600" />
            <MoreVertical size={20} className="cursor-pointer hover:text-blue-600" />
          </div>
        </div>

        {/* Área de Mensagens */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
          {/* Mensagem recebida */}
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-lg rounded-bl-none shadow-sm border border-slate-100 max-w-sm">
              <p className="text-sm text-slate-800">Olá, gostaria de saber sobre o plano profissional de vocês.</p>
              <span className="text-xs text-slate-400 mt-1 block text-right">10:42</span>
            </div>
          </div>
          {/* Mensagem enviada */}
          <div className="flex justify-end">
            <div className="bg-blue-600 p-3 rounded-lg rounded-br-none shadow-sm max-w-sm">
              <p className="text-sm text-white">Oi Maria! Tudo bem? Sou o William, vou te atender. Claro, vou te passar todos os detalhes.</p>
              <span className="text-xs text-blue-200 mt-1 block text-right">10:43 ✓✓</span>
            </div>
          </div>
        </div>

        {/* Barra de Envio */}
        <div className="h-16 border-t border-slate-200 flex items-center gap-4 px-6 bg-white">
          <Paperclip size={20} className="text-slate-500 cursor-pointer hover:text-blue-600" />
          <input 
            type="text" 
            placeholder="Digite uma mensagem... (/ para mensagens rápidas)" 
            className="flex-1 text-sm border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Smile size={20} className="text-slate-500 cursor-pointer hover:text-blue-600" />
          <button className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* COLUNA 3: Detalhes do Lead (Direita) */}
      <div className="w-80 border-l border-slate-200 bg-slate-50 overflow-y-auto p-5">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-slate-300 mb-3"></div>
          <h3 className="font-bold text-slate-800">Maria Silva</h3>
          <p className="text-sm text-slate-500">+55 11 99999-8888</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Etapa do Funil</label>
            <select className="w-full text-sm font-medium text-blue-600 bg-blue-50 p-1 rounded border-none focus:ring-0">
              <option>Novo Contato</option>
              <option>Em Atendimento</option>
              <option>Fazendo Cotação</option>
              <option>Cliente</option>
            </select>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="text-xs font-semibold text-slate-500 block mb-2">Tags</label>
            <div className="flex gap-2 flex-wrap">
              <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">Quente</span>
              <span className="bg-violet-100 text-violet-600 text-xs px-2 py-1 rounded-full font-medium">Meta Ads</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
            <User size={16} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Responsável</p>
              <p className="text-sm font-medium text-slate-800">William</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
            <Clock size={16} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Próximo Follow up</p>
              <p className="text-sm font-medium text-slate-800">Amanhã, 14:00</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}