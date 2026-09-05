"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica de autenticação real virá aqui (conexão com backend)
    // Por enquanto, só vamos redirecionar para testar o visual
    if(email && password) {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* Lado Esquerdo - Branding (Azul) */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.1),_transparent_50%)]"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">CRM Zion</h1>
        </div>
        
        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Centralize seus leads e feche mais vendas no WhatsApp.
          </h2>
          <p className="text-blue-200 text-lg">
            O CRM mais simples e eficiente para empresas que investem em tráfego pago.
          </p>
          <div className="flex items-center gap-3 text-white">
            <MessageCircle size={32} className="text-blue-200" />
            <span className="font-medium">Integração direta com WhatsApp Business</span>
          </div>
        </div>

        <div className="relative z-10 text-blue-300 text-sm">
          Zion Media © {new Date().getFullYear()}
        </div>
      </div>

      {/* Lado Direito - Formulário de Login (Branco) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-blue-600 tracking-tight">CRM Zion</h1>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo de volta</h3>
          <p className="text-slate-500 mb-8">Insira suas credenciais para acessar o sistema.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">E-mail</label>
              <input 
                type="email" 
                placeholder="seu@email.com" 
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Lembrar de mim
              </label>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">Esqueceu a senha?</a>
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}