"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. TENTANDO LOGAR NO SUPABASE AUTH
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        console.error("❌ Erro de Autenticação:", authError);
        setError(authError.message || "E-mail ou senha incorretos.");
        return; // Para aqui se der erro no login
      }

      // 2. LOGIN DEU CERTO! Vamos buscar os dados da empresa
      if (data.user) {
        console.log("✅ Login bem sucedido! ID do Usuário:", data.user.id);
        
        // Busca o companyId e role na tabela User
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('companyId, role')
          .eq('id', data.user.id)
          .single();

                if (userError) {
           // Raio-X: Converte o erro para texto legível
           console.error("❌ Erro ao buscar dados na tabela User:", JSON.stringify(userError, null, 2));
           
           if (userError.code === 'PGRST116') {
             setError("Erro: O seu usuário está no Auth, mas não foi encontrado na tabela 'User'. O ID está diferente?");
           } else {
             setError("Erro de permissão no banco: " + (userError.message || "Verifique o Console (F12)."));
           }
           return;
        }
        

        if (userData) {
          console.log("✅ Dados da empresa encontrados:", userData);
          // Salva na memória do navegador (LocalStorage)
          localStorage.setItem('companyId', userData.companyId);
          localStorage.setItem('userRole', userData.role);
          localStorage.setItem('userName', email.split('@')[0]);
        }
        
        // 3. REDIRECIONA PARA O DASHBOARD
        router.push('/');
      }
    } catch (err) {
      console.error("❌ Erro crítico no try/catch:", err);
      setError("Ocorreu um erro inesperado no sistema.");
    } finally {
      setLoading(false); // Garante que o botão saia do estado "Carregando"
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
          <h2 className="text-4xl font-bold text-white leading-tight">Centralize seus leads e feche mais vendas no WhatsApp.</h2>
          <p className="text-blue-200 text-lg">O CRM mais simples e eficiente para empresas que investem em tráfego pago.</p>
          <div className="flex items-center gap-3 text-white">
            <MessageCircle size={32} className="text-blue-200" />
            <span className="font-medium">Integração direta com WhatsApp Business</span>
          </div>
        </div>
        <div className="relative z-10 text-blue-300 text-sm">Zion Media © {new Date().getFullYear()}</div>
      </div>

      {/* Lado Direito - Formulário de Login (Branco) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><h1 className="text-3xl font-bold text-blue-600 tracking-tight">CRM Zion</h1></div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo de volta</h3>
          <p className="text-slate-500 mb-8">Insira suas credenciais para acessar o sistema.</p>

          {/* Mensagem de Erro */}
          {error && <p className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium border border-red-100">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">E-mail</label>
              <input 
                type="email" 
                placeholder="seu@email.com" 
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800" 
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
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-10 text-slate-800" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}