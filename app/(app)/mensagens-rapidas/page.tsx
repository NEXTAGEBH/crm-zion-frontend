"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabaseClient";

type QuickMessage = {
  id: string;
  companyId: string;
  title: string;
  body: string;
  shortcut: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  title: string;
  body: string;
  shortcut: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  body: "",
  shortcut: "",
};

export default function MensagensRapidasPage() {
  const [
    quickMessages,
    setQuickMessages,
  ] = useState<
    QuickMessage[]
  >([]);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    EMPTY_FORM
  );

  const [
    editingId,
    setEditingId,
  ] = useState<
    string | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    string | null
  >(null);

  const [
    togglingId,
    setTogglingId,
  ] = useState<
    string | null
  >(null);

  const [
    canManage,
    setCanManage,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

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

  const carregarMensagens =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const token =
            await pegarToken();

          const response =
            await fetch(
              "/api/quick-messages",
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
                "Erro ao carregar mensagens rápidas."
            );
          }

          setQuickMessages(
            data.quickMessages ||
              []
          );

          setCanManage(
            Boolean(
              data.canManage
            )
          );

          setError(null);
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Erro ao carregar mensagens rápidas."
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
      void carregarMensagens();
    },
    [
      carregarMensagens,
    ]
  );

  const limparFormulario = () => {
    setForm(
      EMPTY_FORM
    );

    setEditingId(
      null
    );
  };

  const mostrarSucesso = (
    mensagem: string
  ) => {
    setSuccess(
      mensagem
    );

    window.setTimeout(
      () => {
        setSuccess(
          null
        );
      },
      2000
    );
  };

  const salvarMensagem =
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

      const title =
        form.title.trim();

      const body =
        form.body.trim();

      const shortcut =
        form.shortcut.trim();

      if (
        !title ||
        !body
      ) {
        setError(
          "Preencha o título e a mensagem."
        );

        return;
      }

      try {
        setSaving(true);
        setError(null);

        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/quick-messages",
            {
              method:
                editingId
                  ? "PATCH"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify(
                  editingId
                    ? {
                        id:
                          editingId,

                        title,

                        body,

                        shortcut,
                      }
                    : {
                        title,

                        body,

                        shortcut,
                      }
                ),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Não foi possível salvar a mensagem."
          );
        }

        if (editingId) {
          setQuickMessages(
            (
              current
            ) =>
              current
                .map(
                  (
                    item
                  ) =>
                    item.id ===
                    editingId
                      ? data.quickMessage
                      : item
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    a.title.localeCompare(
                      b.title,
                      "pt-BR"
                    )
                )
          );

          mostrarSucesso(
            "Mensagem rápida atualizada."
          );
        } else {
          setQuickMessages(
            (
              current
            ) =>
              [
                ...current,
                data.quickMessage,
              ].sort(
                (
                  a,
                  b
                ) =>
                  a.title.localeCompare(
                    b.title,
                    "pt-BR"
                  )
              )
          );

          mostrarSucesso(
            "Mensagem rápida criada."
          );
        }

        limparFormulario();
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Erro ao salvar mensagem rápida."
        );
      } finally {
        setSaving(false);
      }
    };

  const editarMensagem = (
    item: QuickMessage
  ) => {
    setEditingId(
      item.id
    );

    setForm({
      title:
        item.title,

      body:
        item.body,

      shortcut:
        item.shortcut ||
        "",
    });

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  };

  const alternarStatus =
    async (
      item: QuickMessage
    ) => {
      if (
        !canManage ||
        togglingId
      ) {
        return;
      }

      try {
        setTogglingId(
          item.id
        );

        setError(null);

        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/quick-messages",
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
                  id:
                    item.id,

                  isActive:
                    !item.isActive,
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
              "Não foi possível alterar o status."
          );
        }

        setQuickMessages(
          (
            current
          ) =>
            current.map(
              (
                currentItem
              ) =>
                currentItem.id ===
                item.id
                  ? data.quickMessage
                  : currentItem
            )
        );

        mostrarSucesso(
          data.quickMessage
            .isActive
            ? "Mensagem ativada."
            : "Mensagem desativada."
        );
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Erro ao alterar status."
        );
      } finally {
        setTogglingId(
          null
        );
      }
    };

  const excluirMensagem =
    async (
      item: QuickMessage
    ) => {
      if (
        !canManage ||
        deletingId
      ) {
        return;
      }

      const confirmou =
        window.confirm(
          `Excluir a mensagem "${item.title}"?`
        );

      if (!confirmou) {
        return;
      }

      try {
        setDeletingId(
          item.id
        );

        setError(null);

        const token =
          await pegarToken();

        const response =
          await fetch(
            `/api/quick-messages?id=${encodeURIComponent(
              item.id
            )}`,
            {
              method:
                "DELETE",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Não foi possível excluir."
          );
        }

        setQuickMessages(
          (
            current
          ) =>
            current.filter(
              (
                currentItem
              ) =>
                currentItem.id !==
                item.id
            )
        );

        if (
          editingId ===
          item.id
        ) {
          limparFormulario();
        }

        mostrarSucesso(
          "Mensagem rápida excluída."
        );
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Erro ao excluir mensagem."
        );
      } finally {
        setDeletingId(
          null
        );
      }
    };

  const mensagensFiltradas =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        if (!term) {
          return quickMessages;
        }

        return quickMessages.filter(
          (
            item
          ) =>
            item.title
              .toLowerCase()
              .includes(
                term
              ) ||
            item.body
              .toLowerCase()
              .includes(
                term
              ) ||
            (
              item.shortcut ||
              ""
            )
              .toLowerCase()
              .includes(
                term
              )
        );
      },
      [
        quickMessages,
        search,
      ]
    );

  const ativas =
    quickMessages.filter(
      (
        item
      ) =>
        item.isActive
    ).length;

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Carregando mensagens rápidas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Mensagens rápidas
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Cadastre respostas prontas para agilizar o atendimento no WhatsApp.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Cadastradas
            </p>

            <p className="mt-1 text-xl font-semibold text-slate-900">
              {
                quickMessages.length
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Ativas
            </p>

            <p className="mt-1 text-xl font-semibold text-slate-900">
              {ativas}
            </p>
          </div>
        </div>
      </div>

      {canManage && (
        <form
          onSubmit={
            salvarMensagem
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {editingId
                  ? "Editar mensagem"
                  : "Nova mensagem rápida"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                O atendente poderá inserir essa mensagem durante uma conversa.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={
                  limparFormulario
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Título
              </label>

              <input
                value={
                  form.title
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,

                      title:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="Ex.: Saudação inicial"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Atalho
              </label>

              <input
                value={
                  form.shortcut
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,

                      shortcut:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="/ola"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
              />

              <p className="mt-1 text-[10px] text-slate-400">
                Opcional. A barra será adicionada automaticamente.
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  saving ||
                  !form.title.trim() ||
                  !form.body.trim()
                }
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Cadastrar mensagem"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Mensagem
            </label>

            <textarea
              value={
                form.body
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,

                    body:
                      event
                        .target
                        .value,
                  })
                )
              }
              rows={5}
              maxLength={
                4096
              }
              placeholder="Digite a mensagem que será utilizada durante o atendimento..."
              className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
            />

            <div className="mt-1 flex justify-end">
              <span className="text-[10px] text-slate-400">
                {
                  form.body.length
                }
                /4096
              </span>
            </div>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Biblioteca
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Mensagens disponíveis para esta empresa.
            </p>
          </div>

          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Buscar mensagem..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-slate-400 md:w-[280px]"
          />
        </div>

        {mensagensFiltradas.length ===
        0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
              💬
            </div>

            <p className="text-sm font-medium text-slate-700">
              Nenhuma mensagem rápida
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Cadastre a primeira resposta para começar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mensagensFiltradas.map(
              (
                item
              ) => (
                <div
                  key={
                    item.id
                  }
                  className={`p-5 ${
                    item.isActive
                      ? ""
                      : "bg-slate-50 opacity-70"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {
                            item.title
                          }
                        </h3>

                        {item.shortcut && (
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">
                            {
                              item.shortcut
                            }
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {item.isActive
                            ? "Ativa"
                            : "Inativa"}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {
                          item.body
                        }
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editarMensagem(
                              item
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={
                            togglingId ===
                            item.id
                          }
                          onClick={() =>
                            void alternarStatus(
                              item
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {togglingId ===
                          item.id
                            ? "Salvando..."
                            : item.isActive
                              ? "Desativar"
                              : "Ativar"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingId ===
                            item.id
                          }
                          onClick={() =>
                            void excluirMensagem(
                              item
                            )
                          }
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId ===
                          item.id
                            ? "Excluindo..."
                            : "Excluir"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-red-200 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-start gap-3">
            <p className="flex-1 text-sm font-medium text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setError(null)
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
            {
              success
            }
          </p>
        </div>
      )}
    </div>
  );
}