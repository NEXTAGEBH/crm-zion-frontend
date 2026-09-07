"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

import {
  hasPermission,
  permissionForPath,
} from "@/lib/permissions";

export function PermissionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    verificando,
    setVerificando,
  ] = useState(true);

  const [
    autorizado,
    setAutorizado,
  ] = useState(false);

  useEffect(() => {
    let ativo = true;

    const verificar =
      async () => {
        try {
          /*
            Painel Zion possui sua própria
            proteção administrativa.
          */
          if (
            pathname.startsWith(
              "/admin-zion"
            )
          ) {
            if (ativo) {
              setAutorizado(true);
              setVerificando(false);
            }

            return;
          }

          const permission =
            permissionForPath(
              pathname
            );

          /*
            Uma rota que ainda não possui
            regra específica continua liberada.
          */
          if (!permission) {
            if (ativo) {
              setAutorizado(true);
              setVerificando(false);
            }

            return;
          }

          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (!session) {
            router.replace(
              "/login"
            );

            return;
          }

          const response =
            await fetch(
              "/api/account/status",
              {
                method:
                  "GET",

                headers: {
                  Authorization:
                    `Bearer ${session.access_token}`,
                },

                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (!ativo) {
            return;
          }

          if (!response.ok) {
            setAutorizado(false);
            setVerificando(false);

            return;
          }

          const permitido =
            hasPermission(
              data.user.role,
              permission
            );

          if (!permitido) {
            setAutorizado(false);
            setVerificando(false);

            router.replace("/");

            return;
          }

          setAutorizado(true);
          setVerificando(false);
        } catch (error) {
          console.log(
            "Erro ao verificar permissão:",
            error
          );

          if (ativo) {
            setAutorizado(false);
            setVerificando(false);
          }
        }
      };

    verificar();

    return () => {
      ativo = false;
    };
  }, [
    pathname,
    router,
  ]);

  if (verificando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">
          Verificando permissões...
        </p>
      </div>
    );
  }

  if (!autorizado) {
    return null;
  }

  return <>{children}</>;
}