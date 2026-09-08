"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabaseClient";

type DistributionUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
};

type NextUser = DistributionUser | null;

type DistributionData = {
  setting: {
    enabled: boolean;
    strategy: string;
    lastAssignedUserId: string | null;
  };

  members: string[];

  users: DistributionUser[];

  nextUser: NextUser;

  canManage: boolean;
};

export default function DistribuicaoLeadsPage() {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    enabled,
    setEnabled,
  ] = useState(false);

  const [
    strategy,
    setStrategy,
  ] = useState(
    "round_robin"
  );

  const [
    users,
    setUsers,
  ] = useState<
    DistributionUser[]
  >([]);

  const [
    selectedMembers,
    setSelectedMembers,
  ] = useState<
    string[]
  >([]);

  const [
    nextUser,
    setNextUser,
  ] = useState<NextUser>(
    null
  );

  const [
    lastAssignedUserId,
    setLastAssignedUserId,
  ] = useState<
    string | null
  >(null);

  const [
    canManage,
    setCanManage,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    success,
    setSuccess,
  ] = useState<
    string | null
  >(null);

  const pegarToken =
    useCallback(
      async () => {
        const {
          data,
          error:
            sessionError,
        } =
          await supabase.auth
            .getSession();

        if (
          sessionError
        ) {
          throw new Error(
            sessionError.message
          );
        }

        const token =
          data.session
            ?.access_token;

        if (!token) {
          throw new Error(
            "Sessão não encontrada."
          );
        }

        return token;
      },
      []
    );

  const carregarConfiguracao =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const token =
            await pegarToken();

          const response =
            await fetch(
              "/api/lead-distribution",
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ||
                "Não foi possível carregar a distribuição de leads."
            );
          }

          const result =
            data as DistributionData;

          setEnabled(
            result.setting
              .enabled
          );

          setStrategy(
            result.setting
              .strategy ||
              "round_robin"
          );

          setLastAssignedUserId(
            result.setting
              .lastAssignedUserId ||
              null
          );

          setSelectedMembers(
            result.members ||
              []
          );

          setUsers(
            result.users ||
              []
          );

          setNextUser(
            result.nextUser ||
              null
          );

          setCanManage(
            Boolean(
              result.canManage
            )
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Erro ao carregar distribuição de leads."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        pegarToken,
      ]
    );

  useEffect(
    () => {
      void carregarConfiguracao();
    },
    [
      carregarConfiguracao,
    ]
  );

  const alternarMembro = (
    userId: string
  ) => {
    setSelectedMembers(
      (
        current
      ) => {
        if (
          current.includes(
            userId
          )
        ) {
          return current.filter(
            (
              id
            ) =>
              id !== userId
          );
        }

        return [
          ...current,
          userId,
        ];
      }
    );
  };

  const selecionarTodos = () => {
    setSelectedMembers(
      users.map(
        (
          user
        ) =>
          user.id
      )
    );
  };

  const limparSelecao = () => {
    setSelectedMembers(
      []
    );
  };

  const salvarConfiguracao =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (
        saving ||
        !canManage
      ) {
        return;
      }

      if (
        enabled &&
        selectedMembers.length ===
          0
      ) {
        setError(
          "Selecione pelo menos um participante antes de ativar a distribuição automática."
        );

        return;
      }

      try {
        setSaving(true);
        setError(null);
        setSuccess(null);

        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/lead-distribution",
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  enabled,

                  strategy,

                  memberIds:
                    selectedMembers,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Não foi possível salvar a configuração."
          );
        }

        setEnabled(
          Boolean(
            data.setting
              ?.enabled
          )
        );

        setStrategy(
          data.setting
            ?.strategy ||
            "round_robin"
        );

        setLastAssignedUserId(
          data.setting
            ?.lastAssignedUserId ||
            null
        );

        setSelectedMembers(
          data.members ||
            []
        );

        setUsers(
          data.users ||
            users
        );

        setNextUser(
          data.nextUser ||
            null
        );

        setSuccess(
          data.message ||
            "Configuração salva."
        );

        window.setTimeout(
          () => {
            setSuccess(
              null
            );
          },
          2200
        );
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Erro ao salvar configuração."
        );
      } finally {
        setSaving(false);
      }
    };

  const participantes =
    useMemo(
      () =>
        users.filter(
          (
            user
          ) =>
            selectedMembers.includes(
              user.id
            )
        ),
      [
        users,
        selectedMembers,
      ]
    );

  const ultimoUsuario =
    useMemo(
      () =>
        users.find(
          (
            user
          ) =>
            user.id ===
            lastAssignedUserId
        ) ||
        null,
      [
        users,
        lastAssignedUserId,
      ]
    );

  const podeAtivar =
    selectedMembers.length >
    0;

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Carregando distribuição de leads...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Configurações
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Distribuição de leads
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Defina como novos contatos recebidos pelo WhatsApp serão distribuídos automaticamente entre os membros da equipe.
        </p>
      </div>

      <form
        onSubmit={
          salvarConfiguracao
        }
        className="space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* CONFIGURAÇÃO PRINCIPAL */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Distribuição automática
                  </h2>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                    Quando ativada, cada novo lead recebido pelo WhatsApp será atribuído automaticamente a um participante da fila.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    !canManage
                  }
                  onClick={() => {
                    if (
                      !enabled &&
                      !podeAtivar
                    ) {
                      setError(
                        "Selecione pelo menos um participante antes de ativar a distribuição."
                      );

                      return;
                    }

                    setError(
                      null
                    );

                    setEnabled(
                      (
                        current
                      ) =>
                        !current
                    );
                  }}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                    enabled
                      ? "bg-emerald-500"
                      : "bg-slate-200"
                  } ${
                    !canManage
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                  aria-pressed={
                    enabled
                  }
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                      enabled
                        ? "left-7"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      enabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {enabled
                      ? "Ativada"
                      : "Desativada"}
                  </span>

                  <span className="text-xs text-slate-400">
                    {
                      selectedMembers.length
                    }{" "}
                    {selectedMembers.length ===
                    1
                      ? "participante selecionado"
                      : "participantes selecionados"}
                  </span>
                </div>
              </div>
            </section>

            {/* ESTRATÉGIA */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Estratégia
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Escolha como os novos leads serão distribuídos.
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Método de distribuição
                </label>

                <select
                  value={
                    strategy
                  }
                  disabled={
                    !canManage
                  }
                  onChange={(
                    event
                  ) =>
                    setStrategy(
                      event
                        .target
                        .value
                    )
                  }
                  className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="round_robin">
                    Rodízio automático
                  </option>
                </select>

                <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs leading-5 text-slate-500">
                    O Zion entrega um lead para cada participante da fila e, ao chegar ao último, volta automaticamente para o primeiro.
                  </p>
                </div>
              </div>
            </section>

            {/* PARTICIPANTES */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Participantes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Escolha quem poderá receber novos leads automaticamente.
                  </p>
                </div>

                {canManage &&
                  users.length >
                    0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={
                          selecionarTodos
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Selecionar todos
                      </button>

                      <button
                        type="button"
                        onClick={
                          limparSelecao
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
              </div>

              {users.length ===
              0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Nenhum usuário disponível
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Cadastre usuários ativos na empresa para utilizar a distribuição.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map(
                    (
                      user
                    ) => {
                      const selecionado =
                        selectedMembers.includes(
                          user.id
                        );

                      return (
                        <label
                          key={
                            user.id
                          }
                          className={`flex cursor-pointer items-center gap-4 px-5 py-4 transition ${
                            selecionado
                              ? "bg-slate-50"
                              : "hover:bg-slate-50/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              selecionado
                            }
                            disabled={
                              !canManage
                            }
                            onChange={() =>
                              alternarMembro(
                                user.id
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold uppercase text-slate-600">
                            {(
                              user.name ||
                              user.email
                            )
                              .trim()
                              .charAt(
                                0
                              )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {user.name ||
                                user.email}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {
                                user.email
                              }
                            </p>
                          </div>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                            {user.role ===
                            "admin"
                              ? "Administrador"
                              : "Atendente"}
                          </span>
                        </label>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>

          {/* PAINEL LATERAL */}
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Próximo da fila
              </p>

              {enabled &&
              nextUser ? (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold uppercase text-emerald-700">
                    {(
                      nextUser.name ||
                      nextUser.email
                    )
                      .trim()
                      .charAt(
                        0
                      )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {nextUser.name ||
                        nextUser.email}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Receberá o próximo lead
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-4">
                  <p className="text-sm text-slate-500">
                    {enabled
                      ? "Nenhum participante disponível."
                      : "Ative a distribuição para iniciar o rodízio."}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Participantes
              </p>

              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {
                  participantes.length
                }
              </p>

              <p className="mt-1 text-xs text-slate-400">
                usuários na fila
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Último atendimento distribuído
              </p>

              <div className="mt-3">
                {ultimoUsuario ? (
                  <>
                    <p className="text-sm font-semibold text-slate-800">
                      {ultimoUsuario.name ||
                        ultimoUsuario.email}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      O próximo participante será escolhido após ele.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Nenhum lead distribuído ainda.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">
                Como funciona
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Somente novos contatos recebidos pelo WhatsApp entram na distribuição automática. Leads já existentes não terão o responsável alterado.
              </p>
            </section>
          </aside>
        </div>

        {/* SALVAR */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur">
          <div>
            <p className="text-sm font-medium text-slate-800">
              Configuração da distribuição
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              As alterações só entram em vigor depois de salvar.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              saving ||
              !canManage ||
              (
                enabled &&
                selectedMembers.length ===
                  0
              )
            }
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving
              ? "Salvando..."
              : "Salvar configuração"}
          </button>
        </div>
      </form>

      {error && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-red-200 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-start gap-3">
            <p className="flex-1 text-sm font-medium text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setError(
                  null
                )
              }
              className="text-xs text-slate-400"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-emerald-700">
            {success}
          </p>
        </div>
      )}
    </div>
  );
}