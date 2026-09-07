"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  LayoutDashboard,
  MessageCircle,
  Users,
  GitBranchPlus,
  Clock,
  Zap,
  BookOpen,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  CircleDot,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

import {
  hasPermission,
  Permission,
} from "@/lib/permissions";

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  permission: Permission;
};

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    permission: "dashboard",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    path: "/whatsapp",
    permission: "whatsapp",
  },
  {
    icon: Users,
    label: "Contatos",
    path: "/contatos",
    permission: "contacts",
  },
  {
    icon: GitBranchPlus,
    label: "Funil",
    path: "/funil",
    permission: "funnel",
  },
  {
    icon: Clock,
    label: "Follow ups",
    path: "/followups",
    permission: "followups",
  },
  {
    icon: Zap,
    label: "Automações",
    path: "/automacoes",
    permission: "automations",
  },
  {
    icon: BookOpen,
    label: "Mensagens rápidas",
    path: "/mensagens-rapidas",
    permission: "quick_messages",
  },
  {
    icon: Megaphone,
    label: "Campanhas",
    path: "/campanhas",
    permission: "campaigns",
  },
  {
    icon: BarChart3,
    label: "Relatórios",
    path: "/relatorios",
    permission: "reports",
  },
  {
    icon: Settings,
    label: "Configurações",
    path: "/configuracoes",
    permission: "settings",
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [
    userName,
    setUserName,
  ] = useState("Usuário");

  const [
    userEmail,
    setUserEmail,
  ] = useState("");

  const [
    userRole,
    setUserRole,
  ] = useState<string | null>(null);

  const [
    isZionAdmin,
    setIsZionAdmin,
  ] = useState(false);

  const [
    carregandoUsuario,
    setCarregandoUsuario,
  ] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregarUsuario = async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const token =
          session.access_token;

        /*
          Primeiro buscamos os dados
          reais do usuário logado.
        */
        const statusResponse =
          await fetch(
            "/api/account/status",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache: "no-store",
            }
          );

        const statusData =
          await statusResponse.json();

        if (!ativo) {
          return;
        }

        if (!statusResponse.ok) {
          console.error(
            "Erro ao carregar usuário:",
            statusData
          );

          setUserRole(null);
          setCarregandoUsuario(false);

          return;
        }

        const role =
          String(
            statusData.user?.role || ""
          )
            .trim()
            .toLowerCase();

        console.log(
          "Sidebar usuário:",
          {
            name:
              statusData.user?.name,

            email:
              statusData.user?.email,

            role,
          }
        );

        setUserName(
          statusData.user?.name ||
            "Usuário"
        );

        setUserEmail(
          statusData.user?.email ||
            ""
        );

        setUserRole(role);

        /*
          Depois verificamos separadamente
          se é administrador da Zion.
        */
        const zionResponse =
          await fetch(
            "/api/zion/companies",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache: "no-store",
            }
          );

        if (!ativo) {
          return;
        }

        setIsZionAdmin(
          zionResponse.ok
        );

        if (
          !zionResponse.ok &&
          pathname.startsWith(
            "/admin-zion"
          )
        ) {
          router.replace("/");
        }
      } catch (error) {
        console.error(
          "Erro no Sidebar:",
          error
        );

        if (ativo) {
          setUserRole(null);
          setIsZionAdmin(false);
        }
      } finally {
        if (ativo) {
          setCarregandoUsuario(false);
        }
      }
    };

    carregarUsuario();

    return () => {
      ativo = false;
    };
  }, [
    pathname,
    router,
  ]);

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      localStorage.removeItem(
        "companyId"
      );

      localStorage.removeItem(
        "userRole"
      );

      localStorage.removeItem(
        "userName"
      );

      router.replace("/login");
    };

  const inicialUsuario =
    userName
      .charAt(0)
      .toUpperCase() || "U";

  /*
    Aqui acontece a filtragem
    real do menu.
  */
  const itensPermitidos =
    userRole
      ? menuItems.filter(
          (item) =>
            hasPermission(
              userRole,
              item.permission
            )
        )
      : [];

  const rotaAtiva = (
    path: string
  ) => {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(
      path
    );
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col justify-between p-4 fixed top-0 left-0 z-50">
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-8 px-2 tracking-tight">
          CRM Zion
        </h1>

        <nav className="space-y-1">
          {carregandoUsuario ? (
            <div className="px-3 py-3 text-sm text-slate-400">
              Carregando menu...
            </div>
          ) : (
            <>
              {isZionAdmin && (
                <Link
                  href="/admin-zion"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 transition-all ${
                    pathname.startsWith(
                      "/admin-zion"
                    )
                      ? "text-amber-800 bg-amber-100"
                      : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                  }`}
                >
                  <ShieldCheck
                    size={20}
                    className="text-amber-600"
                  />

                  <span className="font-medium text-sm">
                    Painel Zion
                  </span>
                </Link>
              )}

              {itensPermitidos.map(
                (item) => {
                  const isActive =
                    rotaAtiva(
                      item.path
                    );

                  return (
                    <Link
                      key={
                        item.path
                      }
                      href={
                        item.path
                      }
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon
                        size={20}
                        className={
                          isActive
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-slate-600"
                        }
                      />

                      <span className="font-medium text-sm">
                        {
                          item.label
                        }
                      </span>
                    </Link>
                  );
                }
              )}
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {
              inicialUsuario
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {userName}
            </p>

            <p className="text-xs text-slate-500 truncate">
              {userEmail}
            </p>

            {userRole && (
              <p className="text-xs text-blue-600 font-medium mt-0.5">
                {userRole ===
                "zion_admin"
                  ? "Administrador Zion"
                  : userRole ===
                    "admin"
                  ? "Administrador"
                  : "Atendente"}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            title="Sair"
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut
              size={16}
            />
          </button>
        </div>

        <div className="px-2 flex items-center gap-2 text-xs">
          <CircleDot
            size={14}
            className="text-emerald-500 fill-emerald-500"
          />

          <span className="text-slate-500 font-medium">
            WhatsApp Conectado
          </span>
        </div>
      </div>
    </aside>
  );
};