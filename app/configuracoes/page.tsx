"use client";

import { useState } from 'react';
import { 
  Building2, Users, MessageCircle, GitBranchPlus, Tag, Zap, 
  BookOpen, Clock, Bell, Puzzle, ShieldCheck, ChevronRight, 
  CheckCircle2, XCircle 
} from 'lucide-react';

const categoriasConfig = [
  { icon: Building2, titulo: 'Empresa', desc: 'Dados da empresa, logo e informações fiscais.' },
  { icon: Users, titulo: 'Usuários e Permissões', desc: 'Adicione atendentes, gestores e defina o que cada um pode ver.' },
  { icon: MessageCircle, titulo: 'WhatsApp', desc: 'Conexão via QR Code ou API Oficial, números conectados.' },
  { icon: GitBranchPlus, titulo: 'Funil de Vendas', desc: 'Personalize as etapas do funil, crie novas colunas.' },
  { icon: Tag, titulo: 'Tags', desc: 'Crie e gerencie tags para organizar seus contatos.' },
  { icon: Zap, titulo: 'Automações', desc: 'Regras de mensagens automáticas e gatilhos.' },
  { icon: BookOpen, titulo: 'Mensagens Rápidas', desc: 'Atalhos de texto para agilizar o atendimento.' },
  { icon: Clock, titulo: 'Horário de Atendimento', desc: 'Defina horário comercial para automações fora do expediente.' },
  { icon: Bell, titulo: 'Notificações', desc: 'Alertas de nova mensagem, follow-up e leads parados.' },
  { icon: Puzzle, titulo: 'Integrações', desc: 'Conexões com Meta Ads, Google Ads e webhooks.' },
];

export default function ConfiguracoesPage() {
  const [whatsappConectado, setWhatsappConectado] = useState(true);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Ajuste o CRM Zion para a realidade da sua empresa.</p>
      </div>

      {/* Card Especial: Status do WhatsApp (O mais importante para o CRM) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50">
            <MessageCircle size={24} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Conexão com WhatsApp</h3>
            <p className="text-sm text-slate-500 mt-1">
              {whatsappConectado ? 'Conectado via API Oficial. Número: +55 11 99999-0000' : 'Desconectado. Conecte para começar a receber leads.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {whatsappConectado ? (
            <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
              <CheckCircle2 size={18} />
              Online
            </div>
          ) : (
             <div className="flex items-center gap-2 text-red-500 font-medium text-sm">
             <XCircle size={18} />
             Offline
           </div>
          )}
          
          <button 
            onClick={() => setWhatsappConectado(!whatsappConectado)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {whatsappConectado ? 'Desconectar' : 'Conectar via QR Code'}
          </button>
        </div>
      </div>

      {/* Grid de Categorias de Configuração */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categoriasConfig.map((cat, index) => (
          <div 
            key={index} 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-slate-100 group-hover:bg-blue-50 transition-colors">
              <cat.icon size={20} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{cat.titulo}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
            </div>

            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}