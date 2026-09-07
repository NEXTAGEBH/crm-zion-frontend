"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Sidebar } from './Sidebar'; // Importa o Menu Lateral

const supabase = createClient(
  'https://hbqgwyrnpqkoyufznbta.supabase.co',
  'sb_publishable_DUQyEAGUow_ytseKpPUmHQ_L2qETeoh'
);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const checkAuth = async () => {
      // Verifica se tem alguém logado no Supabase
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        setIsAuthenticated(true);
        // Se está logado e tenta acessar o login, manda pro dashboard
        if (pathname === '/login') {
          router.push('/');
        }
      } else {
        setIsAuthenticated(false);
        // Se NÃO está logado e não é a página de login, manda pro login
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  // Tela de Loading enquanto verifica o acesso (Evita o "Flash" da tela)
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Verificando acesso seguro...</p>
      </div>
    );
  }

  // Se for a tela de Login, renderiza sem o Menu Lateral
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Se está logado, renderiza o layout completo do CRM com o Menu Lateral
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // Se cair aqui, está redirecionando para o login (retorna nulo)
  return null;
}