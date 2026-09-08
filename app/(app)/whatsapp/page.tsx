"use client";

import {
  FormEvent,
  KeyboardEvent,
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

type CurrentUserInfo = {
  id: string;
  role: string;
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
  currentUser?: CurrentUserInfo;
};

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  companyId: string;
  isActive: boolean;
};

type FunnelStep = {
  id: string;
  name: string;
  order: number;
  companyId: string;
  stageType?: string;
};

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
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
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
      hour: "2-digit",
      minute: "2-digit",
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
      day: "2-digit",
      month: "long",

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

  return "Mensagem";
}

function statusMensagem(
  status: string
) {
  if (
    status ===
    "pending"
  ) {
    return "Enviando";
  }

  if (
    status ===
    "sent"
  ) {
    return "Enviada";
  }

  if (
    status ===
    "delivered"
  ) {
    return "Entregue";
  }

  if (
    status ===
    "read"
  ) {
    return "Lida";
  }

  if (
    status ===
    "failed"
  ) {
    return "Falhou";
  }

  return "";
}

export default function WhatsAppPage() {
  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(
    null
  );

  const [
    detail,
    setDetail,
  ] = useState<ConversationDetail | null>(
    null
  );

  const [
    teamUsers,
    setTeamUsers,
  ] = useState<TeamUser[]>([]);

  const [
    funnelSteps,
    setFunnelSteps,
  ] = useState<FunnelStep[]>([]);

  const [
    quickMessages,
    setQuickMessages,
  ] = useState<QuickMessage[]>([]);

  const [
    currentUser,
    setCurrentUser,
  ] = useState<CurrentUserInfo | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingDetail,
    setLoadingDetail,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    savingResponsible,
    setSavingResponsible,
  ] = useState(false);

  const [
    savingFunnel,
    setSavingFunnel,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    messageText,
    setMessageText,
  ] = useState("");

  const [
    quickMenuOpen,
    setQuickMenuOpen,
  ] = useState(false);

  const [
    quickSearch,
    setQuickSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    success,
    setSuccess,
  ] = useState<string | null>(
    null
  );

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const selectedIdRef =
    useRef<string | null>(
      null
    );

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

  const carregarOpcoes =
    useCallback(
      async () => {
        try {
          const {
            data: authData,
            error: authError,
          } =
            await supabase.auth
              .getUser();

          if (
            authError ||
            !authData.user
          ) {
            throw new Error(
              "Usuário não autenticado."
            );
          }

          const {
            data: crmUser,
            error:
              crmUserError,
          } =
            await supabase
              .from("User")
              .select(
                "id, name, email, role, companyId, isActive"
              )
              .eq(
                "id",
                authData.user.id
              )
              .maybeSingle();

          if (
            crmUserError ||
            !crmUser
          ) {
            throw new Error(
              crmUserError
                ?.message ||
                "Usuário não encontrado."
            );
          }

          setCurrentUser({
            id:
              crmUser.id,

            role:
              crmUser.role,
          });

          const token =
            await pegarToken();

          const [
            usersResult,
            stepsResult,
            quickResponse,
          ] =
            await Promise.all([
              supabase
                .from("User")
                .select(
                  "id, name, email, role, companyId, isActive"
                )
                .eq(
                  "companyId",
                  crmUser.companyId
                )
                .eq(
                  "isActive",
                  true
                )
                .order(
                  "name",
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from("FunnelStep")
                .select(
                  "id, name, order, companyId, stageType"
                )
                .eq(
                  "companyId",
                  crmUser.companyId
                )
                .order(
                  "order",
                  {
                    ascending:
                      true,
                  }
                ),

              fetch(
                "/api/quick-messages?active=true",
                {
                  method: "GET",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  cache:
                    "no-store",
                }
              ),
            ]);

          if (
            usersResult.error
          ) {
            throw new Error(
              usersResult.error
                .message
            );
          }

          if (
            stepsResult.error
          ) {
            throw new Error(
              stepsResult.error
                .message
            );
          }

          setTeamUsers(
            (
              usersResult.data ||
              []
            ) as TeamUser[]
          );

          setFunnelSteps(
            (
              stepsResult.data ||
              []
            ) as FunnelStep[]
          );

          const quickData =
            await quickResponse.json();

          if (
            !quickResponse.ok
          ) {
            throw new Error(
              quickData.error ||
                "Erro ao carregar mensagens rápidas."
            );
          }

          setQuickMessages(
            (
              quickData.quickMessages ||
              []
            ) as QuickMessage[]
          );
        } catch (
          err
        ) {
          console.error(
            "Erro ao carregar opções do atendimento:",
            err
          );
        }
      },
      [
        pegarToken,
      ]
    );

  const carregarLista =
    useCallback(
      async (
        mostrarLoading =
          false
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

          if (
            data.currentUser
          ) {
            setCurrentUser(
              data.currentUser
            );
          }

          if (
            lista.length >
              0 &&
            !selectedIdRef.current
          ) {
            setSelectedId(
              lista[0].id
            );
          }

          if (
            selectedIdRef.current &&
            !lista.some(
              (
                item
              ) =>
                item.id ===
                selectedIdRef.current
            ) &&
            data.currentUser
              ?.role ===
              "atendente"
          ) {
            setSelectedId(
              lista[0]?.id ||
                null
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
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        pegarToken,
      ]
    );

  const marcarComoLida =
    useCallback(
      async (
        conversationId:
          string
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
                  JSON.stringify({
                    action:
                      "mark_read",

                    conversationId,
                  }),
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
          return;
        }
      },
      [
        pegarToken,
      ]
    );

  const carregarDetalhe =
    useCallback(
      async (
        conversationId:
          string,
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

          if (
            data.currentUser
          ) {
            setCurrentUser(
              data.currentUser
            );
          }

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

  const atualizarResponsavel =
    useCallback(
      async (
        responsibleId:
          string | null
      ) => {
        const conversationId =
          selectedIdRef.current;

        if (
          !conversationId ||
          savingResponsible
        ) {
          return;
        }

        try {
          setSavingResponsible(
            true
          );

          setError(null);

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
                  JSON.stringify({
                    action:
                      "assign_responsible",

                    conversationId,

                    responsibleId,
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
                "Não foi possível alterar o responsável."
            );
          }

          if (
            data.contact
          ) {
            setDetail(
              (
                current
              ) =>
                current
                  ? {
                      ...current,

                      contact:
                        data.contact,
                    }
                  : current
            );

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

                          contact:
                            data.contact,
                        }
                      : conversation
                )
            );
          }

          setSuccess(
            responsibleId
              ? "Responsável atualizado."
              : "Responsável removido."
          );

          window.setTimeout(
            () => {
              setSuccess(null);
            },
            1800
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Erro ao alterar responsável."
          );
        } finally {
          setSavingResponsible(
            false
          );
        }
      },
      [
        pegarToken,
        savingResponsible,
      ]
    );

  const atualizarEtapa =
    useCallback(
      async (
        funnelStepId:
          string
      ) => {
        const conversationId =
          selectedIdRef.current;

        if (
          !conversationId ||
          !funnelStepId ||
          savingFunnel
        ) {
          return;
        }

        try {
          setSavingFunnel(
            true
          );

          setError(null);

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
                  JSON.stringify({
                    action:
                      "update_funnel_step",

                    conversationId,

                    funnelStepId,
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
                "Não foi possível alterar a etapa."
            );
          }

          if (
            data.contact
          ) {
            setDetail(
              (
                current
              ) =>
                current
                  ? {
                      ...current,

                      contact:
                        data.contact,
                    }
                  : current
            );

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

                          contact:
                            data.contact,
                        }
                      : conversation
                )
            );
          }

          setSuccess(
            "Etapa atualizada."
          );

          window.setTimeout(
            () => {
              setSuccess(null);
            },
            1800
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Erro ao alterar etapa."
          );
        } finally {
          setSavingFunnel(
            false
          );
        }
      },
      [
        pegarToken,
        savingFunnel,
      ]
    );

  const usarMensagemRapida =
    useCallback(
      (
        item:
          QuickMessage
      ) => {
        setMessageText(
          item.body
        );

        setQuickMenuOpen(
          false
        );

        setQuickSearch(
          ""
        );

        window.setTimeout(
          () => {
            textareaRef.current
              ?.focus();
          },
          50
        );
      },
      []
    );

  const alterarTextoMensagem =
    useCallback(
      (
        value:
          string
      ) => {
        const texto =
          value.trim();

        if (
          texto.startsWith(
            "/"
          ) &&
          !texto.includes(
            " "
          ) &&
          !texto.includes(
            "\n"
          )
        ) {
          const mensagemEncontrada =
            quickMessages.find(
              (
                item
              ) =>
                item.shortcut
                  ?.toLowerCase() ===
                texto.toLowerCase()
            );

          if (
            mensagemEncontrada
          ) {
            setMessageText(
              mensagemEncontrada.body
            );

            setQuickMenuOpen(
              false
            );

            setQuickSearch(
              ""
            );

            return;
          }

          setQuickSearch(
            texto
          );

          setQuickMenuOpen(
            true
          );
        }

        setMessageText(
          value
        );
      },
      [
        quickMessages,
      ]
    );

  const enviarMensagem =
    useCallback(
      async () => {
        const conversationId =
          selectedIdRef.current;

        const text =
          messageText.trim();

        if (
          !conversationId ||
          !text ||
          sending
        ) {
          return;
        }

        try {
          setSending(true);
          setError(null);
          setSuccess(null);

          const token =
            await pegarToken();

          const response =
            await fetch(
              "/api/whatsapp/messages",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                body:
                  JSON.stringify({
                    conversationId,
                    text,
                  }),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok
          ) {
            const metaCode =
              data.metaCode
                ? ` Código Meta: ${data.metaCode}.`
                : "";

            throw new Error(
              `${
                data.error ||
                "Não foi possível enviar a mensagem."
              }${metaCode}`
            );
          }

          setMessageText("");

          setQuickMenuOpen(
            false
          );

          setSuccess(
            "Mensagem enviada."
          );

          await carregarDetalhe(
            conversationId,
            false,
            false
          );

          await carregarLista();

          window.setTimeout(
            () => {
              setSuccess(null);
            },
            1800
          );

          window.setTimeout(
            () => {
              textareaRef.current
                ?.focus();
            },
            50
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Erro ao enviar mensagem."
          );
        } finally {
          setSending(false);
        }
      },
      [
        carregarDetalhe,
        carregarLista,
        messageText,
        pegarToken,
        sending,
      ]
    );

  const handleSubmit = (
    event: FormEvent
  ) => {
    event.preventDefault();

    void enviarMensagem();
  };

  const handleKeyDown = (
    event:
      KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key ===
        "Escape"
    ) {
      setQuickMenuOpen(
        false
      );

      return;
    }

    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void enviarMensagem();
    }
  };

  useEffect(
    () => {
      void Promise.all([
        carregarLista(),
        carregarOpcoes(),
      ]);
    },
    [
      carregarLista,
      carregarOpcoes,
    ]
  );

  useEffect(
    () => {
      if (!selectedId) {
        setDetail(null);

        return;
      }

      setDetail(null);
      setMessageText("");
      setQuickMenuOpen(false);
      setQuickSearch("");

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
              currentId &&
              !sending
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
      sending,
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

  const quickMessagesFiltradas =
    useMemo(
      () => {
        const term =
          quickSearch
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
        quickSearch,
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

  const podeAtribuir =
    currentUser
      ? [
          "admin",
          "zion_admin",
        ].includes(
          currentUser.role
        )
      : false;

  const responsavelAtual =
    detail
      ? teamUsers.find(
          (
            user
          ) =>
            user.id ===
            detail.contact
              .responsibleId
        )
      : undefined;

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
      <section className="flex w-[360px] min-w-[310px] flex-col border-r border-slate-200">
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
                    {totalUnread}
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
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {refreshing
                ? "Atualizando..."
                : "Atualizar"}
            </button>
          </div>

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar conversa..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
          />
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
                        <p className="truncate text-sm font-medium text-slate-800">
                          {conversation
                            .contact
                            ?.name ||
                            conversation
                              .contact
                              ?.phone ||
                            "Contato"}
                        </p>

                        <span className="shrink-0 text-[11px] text-slate-400">
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
                        <p className="truncate text-xs text-slate-500">
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
                            {unread}
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

      <section className="flex min-w-0 flex-1 flex-col bg-slate-50">
        {!selectedId ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">
              Selecione uma conversa.
            </p>
          </div>
        ) : loadingDetail &&
          !detail ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">
              Abrindo conversa...
            </p>
          </div>
        ) : detail ? (
          <>
            <div className="shrink-0 border-b border-slate-200 bg-white">
              <div className="flex min-h-[72px] items-center justify-between gap-5 px-5 py-3">
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

                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  WhatsApp
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 px-5 py-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Responsável
                  </label>

                  {podeAtribuir ? (
                    <select
                      value={
                        detail
                          .contact
                          .responsibleId ||
                        ""
                      }
                      disabled={
                        savingResponsible
                      }
                      onChange={(
                        event
                      ) =>
                        void atualizarResponsavel(
                          event
                            .target
                            .value ||
                            null
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                    >
                      <option value="">
                        Sem responsável
                      </option>

                      {teamUsers.map(
                        (
                          user
                        ) => (
                          <option
                            key={
                              user.id
                            }
                            value={
                              user.id
                            }
                          >
                            {user.name ||
                              user.email}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {responsavelAtual
                        ?.name ||
                        responsavelAtual
                          ?.email ||
                        "Sem responsável"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Etapa do funil
                  </label>

                  <select
                    value={
                      detail
                        .contact
                        .funnelStepId ||
                      ""
                    }
                    disabled={
                      savingFunnel
                    }
                    onChange={(
                      event
                    ) =>
                      void atualizarEtapa(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                  >
                    {funnelSteps.map(
                      (
                        step
                      ) => (
                        <option
                          key={
                            step.id
                          }
                          value={
                            step.id
                          }
                        >
                          {step.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto flex max-w-4xl flex-col gap-2">
                {detail.messages.map(
                  (
                    message,
                    index
                  ) => {
                    const anterior =
                      detail.messages[
                        index - 1
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
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="relative shrink-0 border-t border-slate-200 bg-white p-4"
            >
              {quickMenuOpen && (
                <div className="absolute bottom-[92px] left-4 z-30 w-[420px] max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-3">
                    <input
                      value={
                        quickSearch
                      }
                      onChange={(
                        event
                      ) =>
                        setQuickSearch(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Buscar mensagem rápida..."
                      autoFocus
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {quickMessagesFiltradas.length ===
                    0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-slate-500">
                          Nenhuma mensagem encontrada.
                        </p>
                      </div>
                    ) : (
                      quickMessagesFiltradas.map(
                        (
                          item
                        ) => (
                          <button
                            key={
                              item.id
                            }
                            type="button"
                            onClick={() =>
                              usarMensagemRapida(
                                item
                              )
                            }
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">
                                {
                                  item.title
                                }
                              </p>

                              {item.shortcut && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                                  {
                                    item.shortcut
                                  }
                                </span>
                              )}
                            </div>

                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {
                                item.body
                              }
                            </p>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="mx-auto max-w-4xl">
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickMenuOpen(
                        (
                          current
                        ) =>
                          !current
                      );

                      setQuickSearch(
                        ""
                      );
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Mensagens rápidas
                  </button>

                  {quickMessages
                    .filter(
                      (
                        item
                      ) =>
                        item.shortcut
                    )
                    .slice(
                      0,
                      4
                    )
                    .map(
                      (
                        item
                      ) => (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          title={
                            item.title
                          }
                          onClick={() =>
                            usarMensagemRapida(
                              item
                            )
                          }
                          className="hidden rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500 transition hover:bg-slate-200 md:block"
                        >
                          {
                            item.shortcut
                          }
                        </button>
                      )
                    )}
                </div>

                <div className="flex items-end gap-3">
                  <textarea
                    ref={
                      textareaRef
                    }
                    value={
                      messageText
                    }
                    onChange={(
                      event
                    ) =>
                      alterarTextoMensagem(
                        event
                          .target
                          .value
                      )
                    }
                    onKeyDown={
                      handleKeyDown
                    }
                    disabled={
                      sending
                    }
                    maxLength={
                      4096
                    }
                    rows={1}
                    placeholder="Digite uma mensagem ou use /atalho..."
                    className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50"
                  />

                  <button
                    type="submit"
                    disabled={
                      sending ||
                      !messageText.trim()
                    }
                    className="h-[46px] rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {sending
                      ? "Enviando..."
                      : "Enviar"}
                  </button>
                </div>

                <div className="mt-2 flex justify-between px-1">
                  <p className="text-[10px] text-slate-400">
                    Enter envia. Shift + Enter quebra linha. Digite um atalho como /ola.
                  </p>

                  <p className="text-[10px] text-slate-400">
                    {
                      messageText.length
                    }
                    /4096
                  </p>
                </div>
              </div>
            </form>
          </>
        ) : null}
      </section>

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
            {success}
          </p>
        </div>
      )}
    </div>
  );
}