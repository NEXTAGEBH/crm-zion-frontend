"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type StageType =
  | "open"
  | "won"
  | "lost";

type DashboardData = {
  company: {
    id: string;
    name: string;
  };

  currentUser: {
    id: string;
    name: string;
    role: string;
  };

  metrics: {
    totalContacts: number;
    openContacts: number;
    wonContacts: number;
    lostContacts: number;
    conversionRate: number;
    newToday: number;
    last7Days: number;
    last30Days: number;
  };

  funnel: {
    id: string;
    name: string;
    order: number;
    stageType: StageType;
    total: number;
  }[];

  origins: {
    name: string;
    total: number;
  }[];

  responsibles: {
    id: string | null;
    name: string;
    total: number;
  }[];

  recentContacts: {
    id: string;
    name: string;
    phone: string;
    origin: string;
    createdAt?: string | null;
    responsibleId?: string | null;
    responsibleName: string;
    funnelStepId?: string | null;
    funnelStepName: string;
    stageType: StageType;
  }[];
};

type ApiResponse =
  | DashboardData
  | {
      error: string;
    };

export default function DashboardPage() {
  const [
    data,
    setData,
  ] =
    useState<DashboardData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const carregar =
    async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!session) {
          window.location.href =
            "/login";

          return;
        }

        const response =
          await fetch(
            "/api/dashboard",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },

              cache:
                "no-store",
            }
          );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          setError(
            "error" in result
              ? result.error
              : "Não foi possível carregar o Dashboard."
          );

          return;
        }

        setData(
          result as DashboardData
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    carregar();
  }, []);

  const formatarData =
    (
      value?:
        string | null
    ) => {
      if (!value) {
        return "";
      }

      return new Intl.DateTimeFormat(
        "pt-BR",
        {
          timeZone:
            "America/Sao_Paulo",

          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(
        new Date(value)
      );
    };

  const badgeEtapa =
    (
      stageType: StageType
    ) => {
      if (
        stageType === "won"
      ) {
        return "bg-emerald-50 text-emerald-700";
      }

      if (
        stageType === "lost"
      ) {
        return "bg-red-50 text-red-700";
      }

      return "bg-blue-50 text-blue-700";
    };

  if (
    loading &&
    !data
  ) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-500 text-sm">
        Carregando Dashboard...
      </div>
    );
  }

  if (
    error &&
    !data
  ) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8">
        <h1 className="text-xl font-bold text-slate-800">
          Não foi possível carregar o Dashboard
        </h1>

        <p className="text-sm text-red-600 mt-2">
          {error}
        </p>

        <button
          type="button"
          onClick={
            carregar
          }
          className="mt-5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const maiorFunil =
    Math.max(
      1,
      ...data.funnel.map(
        (item) =>
          item.total
      )
    );

  const maiorOrigem =
    Math.max(
      1,
      ...data.origins.map(
        (item) =>
          item.total
      )
    );

  const isAtendente =
    data.currentUser.role ===
    "atendente";

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            {isAtendente
              ? "Acompanhe os resultados dos leads atribuídos a você."
              : `Visão comercial de ${data.company.name}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={
            carregar
          }
          disabled={
            loading
          }
          className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 rounded-lg text-sm text-slate-600 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Atualizar
        </button>
      </div>

      {error && (
        <div className="mb-5 border border-amber-200 bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-slate-100">
              <Users
                size={20}
                className="text-slate-600"
              />
            </div>

            <span className="text-xs text-slate-400">
              Total
            </span>
          </div>

          <p className="text-3xl font-bold text-slate-800 mt-4">
            {
              data.metrics
                .totalContacts
            }
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Leads
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Activity
                size={20}
                className="text-blue-600"
              />
            </div>

            <span className="text-xs text-blue-500">
              open
            </span>
          </div>

          <p className="text-3xl font-bold text-slate-800 mt-4">
            {
              data.metrics
                .openContacts
            }
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Em andamento
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <CheckCircle2
                size={20}
                className="text-emerald-600"
              />
            </div>

            <span className="text-xs text-emerald-600">
              won
            </span>
          </div>

          <p className="text-3xl font-bold text-slate-800 mt-4">
            {
              data.metrics
                .wonContacts
            }
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Vendas
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-red-50">
              <XCircle
                size={20}
                className="text-red-600"
              />
            </div>

            <span className="text-xs text-red-500">
              lost
            </span>
          </div>

          <p className="text-3xl font-bold text-slate-800 mt-4">
            {
              data.metrics
                .lostContacts
            }
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Perdidos
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-violet-50">
              <Target
                size={20}
                className="text-violet-600"
              />
            </div>

            <TrendingUp
              size={16}
              className="text-slate-400"
            />
          </div>

          <p className="text-3xl font-bold text-slate-800 mt-4">
            {
              data.metrics
                .conversionRate
            }
            %
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Conversão
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50">
              <UserPlus
                size={20}
                className="text-amber-600"
              />
            </div>

            <span className="text-xs text-slate-400">
              Hoje
            </span>
          </div>

          <p className="text-3xl font-bold text-slate-800 mt-4">
            {
              data.metrics
                .newToday
            }
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Novos leads
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-800">
              Distribuição no funil
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Quantidade de leads em cada etapa.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {data.funnel.length ===
            0 ? (
              <p className="text-sm text-slate-400">
                Nenhuma etapa configurada.
              </p>
            ) : (
              data.funnel.map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.stageType ===
                          "won" && (
                          <CheckCircle2
                            size={15}
                            className="text-emerald-600 flex-shrink-0"
                          />
                        )}

                        {item.stageType ===
                          "lost" && (
                          <XCircle
                            size={15}
                            className="text-red-500 flex-shrink-0"
                          />
                        )}

                        {item.stageType ===
                          "open" && (
                          <Clock3
                            size={15}
                            className="text-blue-500 flex-shrink-0"
                          />
                        )}

                        <span className="text-sm font-medium text-slate-700 truncate">
                          {
                            item.name
                          }
                        </span>
                      </div>

                      <span className="text-sm font-bold text-slate-800">
                        {
                          item.total
                        }
                      </span>
                    </div>

                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.stageType ===
                          "won"
                            ? "bg-emerald-500"
                            : item.stageType ===
                              "lost"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width:
                            `${Math.max(
                              item.total >
                                0
                                ? 4
                                : 0,

                              (item.total /
                                maiorFunil) *
                                100
                            )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-800">
              Origem dos leads
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              De onde estão chegando os contatos.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {data.origins.length ===
            0 ? (
              <p className="text-sm text-slate-400">
                Nenhum dado disponível.
              </p>
            ) : (
              data.origins
                .slice(
                  0,
                  8
                )
                .map(
                  (item) => (
                    <div
                      key={
                        item.name
                      }
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {
                            item.name
                          }
                        </span>

                        <span className="text-sm font-bold text-slate-800">
                          {
                            item.total
                          }
                        </span>
                      </div>

                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width:
                              `${Math.max(
                                4,

                                (item.total /
                                  maiorOrigem) *
                                  100
                              )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-800">
              Responsáveis
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Distribuição dos leads.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {data.responsibles.length ===
            0 ? (
              <div className="p-5 text-sm text-slate-400">
                Nenhum responsável encontrado.
              </div>
            ) : (
              data.responsibles.map(
                (item) => (
                  <div
                    key={
                      item.id ||
                      "sem-responsavel"
                    }
                    className="p-4 flex items-center justify-between"
                  >
                    <span className="text-sm text-slate-700">
                      {
                        item.name
                      }
                    </span>

                    <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full">
                      {
                        item.total
                      }
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-800">
              Contatos recentes
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Últimos leads visíveis para seu usuário.
            </p>
          </div>

          {data.recentContacts.length ===
          0 ? (
            <div className="p-8 text-sm text-slate-400 text-center">
              Nenhum contato encontrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentContacts.map(
                (contact) => (
                  <div
                    key={
                      contact.id
                    }
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800">
                        {
                          contact.name
                        }
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {
                          contact.phone
                        }
                        {" • "}
                        {
                          contact.origin
                        }
                      </p>

                      {contact.createdAt && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatarData(
                            contact.createdAt
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                        {
                          contact.responsibleName
                        }
                      </span>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeEtapa(
                          contact.stageType
                        )}`}
                      >
                        {
                          contact.funnelStepName
                        }
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-slate-100 rounded-xl p-4">
          <p className="text-xs text-slate-500">
            Leads hoje
          </p>

          <p className="text-xl font-bold text-slate-800 mt-1">
            {
              data.metrics
                .newToday
            }
          </p>
        </div>

        <div className="bg-slate-100 rounded-xl p-4">
          <p className="text-xs text-slate-500">
            Últimos 7 dias
          </p>

          <p className="text-xl font-bold text-slate-800 mt-1">
            {
              data.metrics
                .last7Days
            }
          </p>
        </div>

        <div className="bg-slate-100 rounded-xl p-4">
          <p className="text-xs text-slate-500">
            Últimos 30 dias
          </p>

          <p className="text-xl font-bold text-slate-800 mt-1">
            {
              data.metrics
                .last30Days
            }
          </p>
        </div>
      </div>
    </div>
  );
}