"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabaseClient";

type Contact = {
  id: string;
  name: string;
  phone: string;
  whatsappWaId: string | null;
  responsibleId: string | null;
  funnelStepId: string | null;
};

type Message = {
  id: string;
  conversationId: string;
  direction: string;
  type: string;
  body: string | null;
  status: string;
  mediaId: string | null;
  mediaMimeType: string | null;
  messageTimestamp: string | null;
  createdAt: string;
};

type Conversation = {
  id: string;
  companyId: string;
  whatsappAccountId: string;
  contactId: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;

  contact: Contact | null;
  lastMessage: Message | null;
};

type ConversationDetail = {
  conversation: {
    id: string;
    companyId: string;
    whatsappAccountId: string;
    contactId: string;
    status: string;
    unreadCount: number;
    lastMessageAt: string | null;
    createdAt: string;
    updatedAt: string;
  };

  contact: Contact;

  messages: Message[];
};

function formatarHorario(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const agora =
    new Date();

  const mesmoDia =
    agora.getFullYear() ===
      date.getFullYear() &&
    agora.getMonth() ===
      date.getMonth() &&
    agora.getDate() ===
      date.getDate();

  if (mesmoDia) {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "2-digit",
    }
  ).format(date);
}

function formatarHorarioMensagem(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(date);
}

function formatarDiaMensagem(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const hoje =
    new Date();

  const ontem =
    new Date();

  ontem.setDate(
    hoje.getDate() - 1
  );

  const mesmaData = (
    a: Date,
    b: Date
  ) =>
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate();

  if (
    mesmaData(
      date,
      hoje
    )
  ) {
    return "Hoje";
  }

  if (
    mesmaData(
      date,
      ontem
    )
  ) {
    return "Ontem";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        date.getFullYear() !==
        hoje.getFullYear()
          ? "numeric"
          : undefined,
    }
  ).format(date);
}

function resumoMensagem(
  message: Message | null
) {
  if (!message) {
    return "Nenhuma mensagem.";
  }

  if (
    message.body &&
    message.body.trim()
  ) {
    return message.body;
  }

  if (
    message.type ===
    "image"
  ) {
    return "Imagem";
  }

  if (
    message.type ===
    "audio"
  ) {
    return "Áudio";
  }

  if (
    message.type ===
    "video"
  ) {
    return "Vídeo";
  }

  if (
    message.type ===
    "document"
  ) {
    return "Documento";
  }

  if (
    message.type ===
    "sticker"
  ) {
    return "Figurinha";
  }

  return "Mensagem";
}

function conteudoMensagem(
  message: Message
) {
  if (
    message.body &&
    message.body.trim()
  ) {
    return message.body;
  }

  if (
    message.type ===
    "image"
  ) {
    return "Imagem recebida";
  }

  if (
    message.type ===
    "audio"
  ) {
    return "Áudio recebido";
  }

  if (
    message.type ===
    "video"
  ) {
    return "Vídeo recebido";
  }

  if (
    message.type ===
    "document"
  ) {
    return "Documento recebido";
  }

  if (
    message.type ===
    "sticker"
  ) {
    return "Figurinha recebida";
  }

  return "Mensagem recebida";
}

function statusMensagem(
  status: string
) {
  if (
    status ===
    "read"
  ) {
    return "Lida";
  }

  if (
    status ===
    "delivered"
  ) {
    return "Entregue";
  }

  if (
    status ===
    "sent"
  ) {
    return "Enviada";
  }

  if (
    status ===
    "failed"
  ) {
    return "Falhou";
  }

  if (
    status ===
    "received"
  ) {
    return "";
  }

  return status;
}

export default function WhatsAppPage() {
  const [
    conversations,
    setConversations,
  ] = useState<
    Conversation[]
  >([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    detail,
    setDetail,
  ] = useState<
    ConversationDetail | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    loadingDetail,
    setLoadingDetail,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    refreshing,
    setRefreshing,
  ] = useState(
    false
  );

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const selectedIdRef =
    useRef<
      string | null
    >(null);

  useEffect(
    () => {
      selectedIdRef.current =
        selectedId;
    },
    [
      selectedId,
    ]
  );

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

  const carregarLista =
    useCallback(
      async (
        mostrarLoading = false
      ) => {
        try {
          if (
            mostrarLoading
          ) {
            setRefreshing(
              true
            );
          }

          const token =
            await pegarToken();

          const response =
            await fetch(
              "/api/whatsapp/conversations",
              {
                method:
                  "GET",

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
                "Erro ao carregar conversas."
            );
          }

          const lista =
            (
              data.conversations ||
              []
            ) as Conversation[];

          setConversations(
            lista
          );

          setError(
            null
          );

          if (
            lista.length >
              0 &&
            !selectedIdRef.current
          ) {
            setSelectedId(
              lista[0].id
            );
          }
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Erro ao carregar conversas."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        pegarToken,
      ]
    );

  const marcarComoLida =
    useCallback(
      async (
        conversationId: string
      ) => {
        try {
          const token =
            await pegarToken();

          const response =
            await fetch(
              "/api/whatsapp/conversations",
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
                  JSON.stringify(
                    {
                      action:
                        "mark_read",

                      conversationId,
                    }
                  ),
              }
            );

          if (
            !response.ok
          ) {
            return;
          }

          setConversations(
            (
              current
            ) =>
              current.map(
                (
                  conversation
                ) =>
                  conversation.id ===
                  conversationId
                    ? {
                        ...conversation,

                        unreadCount:
                          0,
                      }
                    : conversation
              )
          );
        } catch {
          /*
           * Falha ao marcar como
           * lida não deve impedir
           * a abertura da conversa.
           */
        }
      },
      [
        pegarToken,
      ]
    );

  const carregarDetalhe =
    useCallback(
      async (
        conversationId: string,
        marcarLida = true,
        mostrarLoading = true
      ) => {
        try {
          if (
            mostrarLoading
          ) {
            setLoadingDetail(
              true
            );
          }

          const token =
            await pegarToken();

          const response =
            await fetch(
              `/api/whatsapp/conversations?conversationId=${encodeURIComponent(
                conversationId
              )}`,
              {
                method:
                  "GET",

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
                "Erro ao abrir conversa."
            );
          }

          if (
            selectedIdRef.current !==
            conversationId
          ) {
            return;
          }

          setDetail(
            data as ConversationDetail
          );

          setError(
            null
          );

          if (
            marcarLida &&
            Number(
              data
                .conversation
                ?.unreadCount ||
                0
            ) > 0
          ) {
            void marcarComoLida(
              conversationId
            );
          }
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Erro ao abrir conversa."
          );
        } finally {
          if (
            mostrarLoading
          ) {
            setLoadingDetail(
              false
            );
          }
        }
      },
      [
        marcarComoLida,
        pegarToken,
      ]
    );

  useEffect(
    () => {
      void carregarLista();
    },
    [
      carregarLista,
    ]
  );

  useEffect(
    () => {
      if (
        !selectedId
      ) {
        setDetail(
          null
        );

        return;
      }

      setDetail(
        null
      );

      void carregarDetalhe(
        selectedId,
        true,
        true
      );
    },
    [
      selectedId,
      carregarDetalhe,
    ]
  );

  /*
   * Atualização periódica da
   * caixa de entrada.
   *
   * Nesta primeira versão usamos
   * polling. Depois podemos migrar
   * para Supabase Realtime.
   */
  useEffect(
    () => {
      const interval =
        window.setInterval(
          () => {
            if (
              document
                .visibilityState !==
              "visible"
            ) {
              return;
            }

            void carregarLista();

            const currentId =
              selectedIdRef.current;

            if (
              currentId
            ) {
              void carregarDetalhe(
                currentId,
                false,
                false
              );
            }
          },
          5000
        );

      return () => {
        window.clearInterval(
          interval
        );
      };
    },
    [
      carregarDetalhe,
      carregarLista,
    ]
  );

  useEffect(
    () => {
      messagesEndRef.current
        ?.scrollIntoView({
          behavior:
            "smooth",
        });
    },
    [
      detail?.messages,
    ]
  );

  const filteredConversations =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        if (!term) {
          return conversations;
        }

        return conversations.filter(
          (
            conversation
          ) => {
            const nome =
              conversation
                .contact
                ?.name
                ?.toLowerCase() ||
              "";

            const telefone =
              conversation
                .contact
                ?.phone
                ?.toLowerCase() ||
              "";

            const ultimaMensagem =
              resumoMensagem(
                conversation
                  .lastMessage
              ).toLowerCase();

            return (
              nome.includes(
                term
              ) ||
              telefone.includes(
                term
              ) ||
              ultimaMensagem.includes(
                term
              )
            );
          }
        );
      },
      [
        conversations,
        search,
      ]
    );

  const totalUnread =
    useMemo(
      () =>
        conversations.reduce(
          (
            total,
            conversation
          ) =>
            total +
            Number(
              conversation.unreadCount ||
                0
            ),
          0
        ),
      [
        conversations,
      ]
    );

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Carregando WhatsApp...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* LISTA DE CONVERSAS */}
      <section className="flex w-[380px] min-w-[320px] flex-col border-r border-slate-200">
        <div className="border-b border-slate-200 px-5 pb-4 pt-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">
                  WhatsApp
                </h1>

                {totalUnread >
                  0 && (
                  <span className="flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                    {
                      totalUnread
                    }
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {
                  conversations.length
                }{" "}
                {conversations.length ===
                1
                  ? "conversa"
                  : "conversas"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void carregarLista(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Atualizando..."
                : "Atualizar"}
            </button>
          </div>

          <div className="relative">
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
              placeholder="Buscar conversa..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length ===
          0 ? (
            <div className="flex h-full items-center justify-center px-8">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg">
                  💬
                </div>

                <p className="text-sm font-medium text-slate-700">
                  Nenhuma conversa
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Quando uma
                  mensagem chegar
                  pelo WhatsApp ela
                  aparecerá aqui.
                </p>
              </div>
            </div>
          ) : (
            filteredConversations.map(
              (
                conversation
              ) => {
                const ativo =
                  selectedId ===
                  conversation.id;

                const unread =
                  Number(
                    conversation.unreadCount ||
                      0
                  );

                return (
                  <button
                    key={
                      conversation.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedId(
                        conversation.id
                      )
                    }
                    className={`flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition ${
                      ativo
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold uppercase text-slate-600">
                      {conversation.contact
                        ?.name
                        ?.trim()
                        ?.charAt(
                          0
                        ) ||
                        "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            unread >
                            0
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-800"
                          }`}
                        >
                          {conversation
                            .contact
                            ?.name ||
                            conversation
                              .contact
                              ?.phone ||
                            "Contato"}
                        </p>

                        <span
                          className={`shrink-0 text-[11px] ${
                            unread >
                            0
                              ? "font-medium text-slate-900"
                              : "text-slate-400"
                          }`}
                        >
                          {formatarHorario(
                            conversation.lastMessageAt ||
                              conversation
                                .lastMessage
                                ?.messageTimestamp ||
                              conversation
                                .lastMessage
                                ?.createdAt ||
                              null
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-xs ${
                            unread >
                            0
                              ? "font-medium text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {conversation
                            .lastMessage
                            ?.direction ===
                          "outbound"
                            ? "Você: "
                            : ""}

                          {resumoMensagem(
                            conversation.lastMessage
                          )}
                        </p>

                        {unread >
                          0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                            {
                              unread
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )
          )}
        </div>
      </section>

      {/* CONVERSA */}
      <section className="flex min-w-0 flex-1 flex-col bg-slate-50">
        {!selectedId ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                💬
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                Caixa de entrada
                do WhatsApp
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Selecione uma
                conversa para
                visualizar o
                histórico de
                mensagens.
              </p>
            </div>
          </div>
        ) : loadingDetail &&
          !detail ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

              <p className="text-sm text-slate-500">
                Abrindo
                conversa...
              </p>
            </div>
          </div>
        ) : detail ? (
          <>
            {/* CABEÇALHO */}
            <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold uppercase text-slate-600">
                  {detail.contact.name
                    ?.trim()
                    ?.charAt(
                      0
                    ) ||
                    "?"}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900">
                    {detail
                      .contact
                      .name ||
                      "Contato"}
                  </h2>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {detail
                      .contact
                      .phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  {detail
                    .contact
                    .responsibleId
                    ? "Lead atribuído"
                    : "Sem responsável"}
                </span>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                  WhatsApp
                </span>
              </div>
            </div>

            {/* MENSAGENS */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto flex max-w-4xl flex-col gap-2">
                {detail.messages.length ===
                0 ? (
                  <div className="py-20 text-center">
                    <p className="text-sm text-slate-400">
                      Nenhuma
                      mensagem nesta
                      conversa.
                    </p>
                  </div>
                ) : (
                  detail.messages.map(
                    (
                      message,
                      index
                    ) => {
                      const anterior =
                        detail
                          .messages[
                          index -
                            1
                        ];

                      const dataAtual =
                        message.messageTimestamp ||
                        message.createdAt;

                      const dataAnterior =
                        anterior
                          ? anterior.messageTimestamp ||
                            anterior.createdAt
                          : null;

                      const mostrarData =
                        !anterior ||
                        formatarDiaMensagem(
                          dataAtual
                        ) !==
                          formatarDiaMensagem(
                            dataAnterior
                          );

                      const outbound =
                        message.direction ===
                        "outbound";

                      return (
                        <div
                          key={
                            message.id
                          }
                        >
                          {mostrarData && (
                            <div className="my-5 flex justify-center">
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                                {formatarDiaMensagem(
                                  dataAtual
                                )}
                              </span>
                            </div>
                          )}

                          <div
                            className={`mb-2 flex ${
                              outbound
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                                outbound
                                  ? "rounded-br-md bg-slate-900 text-white"
                                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-5">
                                {conteudoMensagem(
                                  message
                                )}
                              </p>

                              <div
                                className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
                                  outbound
                                    ? "text-slate-300"
                                    : "text-slate-400"
                                }`}
                              >
                                <span>
                                  {formatarHorarioMensagem(
                                    message.messageTimestamp ||
                                      message.createdAt
                                  )}
                                </span>

                                {outbound &&
                                  statusMensagem(
                                    message.status
                                  ) && (
                                    <span>
                                      {statusMensagem(
                                        message.status
                                      )}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>
            </div>

            {/* COMPOSER */}
            <div className="shrink-0 border-t border-slate-200 bg-white p-4">
              <div className="mx-auto flex max-w-4xl items-center gap-3">
                <div className="flex-1">
                  <input
                    disabled
                    placeholder="O envio de mensagens será habilitado na próxima etapa."
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl bg-slate-300 px-5 py-3 text-sm font-semibold text-white"
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Não foi possível
                abrir a conversa.
              </p>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-red-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}