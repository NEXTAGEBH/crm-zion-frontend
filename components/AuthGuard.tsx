"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [podeAcessar, setPodeAcessar] = useState(false);

  useEffect(() => {
    const verificarLogin = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        // Não está logado? Manda para o login!
        router.replace("/login");
      } else {
        // Está logado? Libera o acesso!
        setPodeAcessar(true);
      }
    };

    verificarLogin();
  }, [router]);

  // Enquanto verifica, mostra uma tela de loading limpa
  if (!podeAcessar) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Verificando acesso...</div>
      </div>
    );
  }

  // Se passou no teste, mostra a página normalmente
  return <>{children}</>;
}