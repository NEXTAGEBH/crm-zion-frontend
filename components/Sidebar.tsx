"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, MessageCircle, Users, GitBranchPlus, Clock, 
  Zap, BookOpen, Megaphone, BarChart3, Settings, LogOut, CircleDot, ShieldCheck 
} from 'lucide-react';

// Simulação: Se for true, você vê o botão de Admin. Se for false, some.
const isZionAdmin = true; 

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: MessageCircle, label: 'WhatsApp', path: '/whatsapp' },
  { icon: Users, label: 'Contatos', path: '/contatos' },
  { icon: GitBranchPlus, label: 'Funil', path: '/funil' },
  { icon: Clock, label: 'Follow ups', path: '/followups' },
  { icon: Zap, label: 'Automações', path: '/automacoes' },
  { icon: BookOpen, label: 'Mensagens rápidas', path: '/mensagens-rapidas' },
  { icon: Megaphone, label: 'Campanhas', path: '/campanhas' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col justify-between p-4 fixed top-0 left-0 z-50">
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-8 px-2 tracking-tight">CRM Zion</h1>
        <nav className="space-y-1">
          
          {/* Botão Secreto do Admin Zion */}
          {isZionAdmin && (
            <Link 
              href="/admin-zion" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-amber-700 bg-amber-50 mb-2 group"
            >
              <ShieldCheck size={20} className="text-amber-600" />
              <span className="font-medium text-sm">Painel Zion</span>
            </Link>
          )}

          {/* Menu Normal do CRM */}
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                  ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <item.icon size={20} className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Rodapé do Menu - Usuário e WhatsApp Status */}
      <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">Z</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">Zion Admin</p>
            <p className="text-xs text-slate-500 truncate">empresa@zion.com</p>
          </div>
          <LogOut size={16} className="text-slate-400 cursor-pointer hover:text-red-500 transition-colors" />
        </div>
        <div className="px-2 flex items-center gap-2 text-xs">
          <CircleDot size={14} className="text-emerald-500 fill-emerald-500" />
          <span className="text-slate-500 font-medium">WhatsApp Conectado</span>
        </div>
      </div>
    </aside>
  );
};