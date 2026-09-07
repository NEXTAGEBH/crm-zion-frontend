"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [verificando, setVerificando] = useState(true);
  const [liberado, setLiberado] = useState(false);

  const [tituloBloqueio, setTituloBloqueio] =
    useState("");

  const [mensagemBloqueio, setMensagemBloqueio] =
    useState("");

  const [motivo, setMotivo] =
    useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    const verificarAcesso = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!ativo) {
          return;
        }

        if (!session) {
          router.replace("/login");
          return;
        }

        const response = await fetch(
          "/api/account/status",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },

            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!ativo) {
          return;
        }

        if (response.status === 401) {
          await supabase.auth.signOut();

          router.replace("/login");
          return;
        }

        if (!response.ok) {
          setTituloBloqueio(
            "Acesso indisponível"
          );

          setMensagemBloqueio(
            data.error ||
              "Não foi possível validar seu acesso."
          );

          setLiberado(false);
          setVerificando(false);

          return;
        }

        if (!data.user.isActive) {
          setTituloBloqueio(
            "Seu acesso foi desativado"
          );

          setMensagemBloqueio(
            "Entre em contato com o administrador da sua conta."
          );

          setMotivo(
            data.user.deactivatedReason ||
              null
          );

          setLiberado(false);
          setVerificando(false);

          return;
        }

        if (!data.company.isActive) {
          setTituloBloqueio(
            "Acesso temporariamente suspenso"
          );

          setMensagemBloqueio(
            "Entre em contato com o administrador para regularizar o acesso ao CRM."
          );

          setMotivo(
            data.company.suspendedReason ||
              null
          );

          setLiberado(false);
          setVerificando(false);

          return;
        }

        setMotivo(null);
        setLiberado(true);
        setVerificando(false);
      } catch (error) {
        console.log(
          "Erro ao verificar acesso:",
          error
        );

        if (ativo) {
          setTituloBloqueio(
            "Erro ao verificar acesso"
          );

          setMensagemBloqueio(
            "Não foi possível validar sua conta."
          );

          setLiberado(false);
          setVerificando(false);
        }
      }
    };

    verificarAcesso();

    const intervalo = window.setInterval(
      verificarAcesso,
      60000
    );

    const verificarAoVoltar = () => {
      verificarAcesso();
    };

    window.addEventListener(
      "focus",
      verificarAoVoltar
    );

    return () => {
      ativo = false;

      window.clearInterval(intervalo);

      window.removeEventListener(
        "focus",
        verificarAoVoltar
      );
    };
  }, [router]);

  const sair = async () => {
    await supabase.auth.signOut();

    router.replace("/login");
  };

  if (verificando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">
          Verificando acesso...
        </p>
      </div>
    );
  }

  if (!liberado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">
            {tituloBloqueio}
          </h1>

          <p className="text-slate-500 mt-3">
            {mensagemBloqueio}
          </p>

          {motivo && (
            <div className="mt-5 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {motivo}
            </div>
          )}

          <button
            type="button"
            onClick={sair}
            className="mt-6 bg-slate-900 text-white px-5 py-3 rounded-xl font-semibold"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}