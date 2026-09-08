import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  companyId: string;
  isActive: boolean;
};

type ConversationRow = {
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

type ContactRow = {
  id: string;
  name: string;
  phone: string;
  whatsappWaId: string | null;
  responsibleId: string | null;
  funnelStepId: string | null;
};

type MessageRow = {
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

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não configurada."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function pegarToken(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return authorization
    .replace(
      "Bearer ",
      ""
    )
    .trim();
}

async function autenticar(
  request: Request
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const token =
    pegarToken(
      request
    );

  if (!token) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Não autenticado.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  const {
    data: {
      user,
    },
    error: authError,
  } =
    await supabaseAdmin
      .auth
      .getUser(
        token
      );

  if (
    authError ||
    !user
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Sessão inválida.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  const {
    data: currentUser,
    error: userError,
  } =
    await supabaseAdmin
      .from("User")
      .select(
        "id, name, email, role, companyId, isActive"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    userError ||
    !currentUser
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Usuário não encontrado no CRM.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  const crmUser =
    currentUser as CurrentUser;

  if (
    !crmUser.isActive
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Usuário desativado.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  if (
    ![
      "admin",
      "zion_admin",
      "atendente",
    ].includes(
      crmUser.role
    )
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Usuário sem permissão.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  const {
    data: company,
    error: companyError,
  } =
    await supabaseAdmin
      .from("Company")
      .select(
        "id, name, isActive"
      )
      .eq(
        "id",
        crmUser.companyId
      )
      .maybeSingle();

  if (
    companyError ||
    !company ||
    !company.isActive
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Empresa indisponível.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    autorizado:
      true as const,

    supabaseAdmin,
    currentUser:
      crmUser,
    company,
  };
}

async function buscarContatoPermitido(
  supabaseAdmin:
    ReturnType<
      typeof getSupabaseAdmin
    >,
  currentUser:
    CurrentUser,
  contactId:
    string
) {
  let query =
    supabaseAdmin
      .from("Contact")
      .select(
        "id, name, phone, whatsappWaId, responsibleId, funnelStepId"
      )
      .eq(
        "id",
        contactId
      )
      .eq(
        "companyId",
        currentUser.companyId
      );

  if (
    currentUser.role ===
    "atendente"
  ) {
    query =
      query.eq(
        "responsibleId",
        currentUser.id
      );
  }

  const {
    data,
    error,
  } =
    await query
      .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao procurar contato: ${error.message}`
    );
  }

  return data as
    | ContactRow
    | null;
}

async function validarConversa(
  supabaseAdmin:
    ReturnType<
      typeof getSupabaseAdmin
    >,
  currentUser:
    CurrentUser,
  conversationId:
    string
) {
  const {
    data: conversation,
    error,
  } =
    await supabaseAdmin
      .from("Conversation")
      .select(
        "id, companyId, whatsappAccountId, contactId, status, unreadCount, lastMessageAt, createdAt, updatedAt"
      )
      .eq(
        "id",
        conversationId
      )
      .eq(
        "companyId",
        currentUser.companyId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao procurar conversa: ${error.message}`
    );
  }

  if (!conversation) {
    return null;
  }

  const contato =
    await buscarContatoPermitido(
      supabaseAdmin,
      currentUser,
      conversation.contactId
    );

  if (!contato) {
    return null;
  }

  return {
    conversation:
      conversation as
        ConversationRow,

    contact:
      contato,
  };
}

export async function GET(
  request: Request
) {
  try {
    const verificacao =
      await autenticar(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
      currentUser,
    } = verificacao;

    const url =
      new URL(
        request.url
      );

    const conversationId =
      url.searchParams.get(
        "conversationId"
      );

    /*
     * =================================================
     * DETALHE DE UMA CONVERSA
     * =================================================
     */
    if (conversationId) {
      const acesso =
        await validarConversa(
          supabaseAdmin,
          currentUser,
          conversationId
        );

      if (!acesso) {
        return NextResponse.json(
          {
            error:
              "Conversa não encontrada.",
          },
          {
            status: 404,
          }
        );
      }

      const {
        data: messages,
        error: messagesError,
      } =
        await supabaseAdmin
          .from("Message")
          .select(
            "id, conversationId, direction, type, body, status, mediaId, mediaMimeType, messageTimestamp, createdAt"
          )
          .eq(
            "companyId",
            currentUser.companyId
          )
          .eq(
            "conversationId",
            conversationId
          )
          .order(
            "messageTimestamp",
            {
              ascending: true,
            }
          )
          .order(
            "createdAt",
            {
              ascending: true,
            }
          )
          .limit(
            300
          );

      if (
        messagesError
      ) {
        return NextResponse.json(
          {
            error:
              messagesError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        conversation:
          acesso.conversation,

        contact:
          acesso.contact,

        messages:
          (
            messages ||
            []
          ) as MessageRow[],
      });
    }

    /*
     * =================================================
     * LISTAGEM DA CAIXA DE ENTRADA
     * =================================================
     */

    let contatosPermitidos:
      ContactRow[] = [];

    let contactsQuery =
      supabaseAdmin
        .from("Contact")
        .select(
          "id, name, phone, whatsappWaId, responsibleId, funnelStepId"
        )
        .eq(
          "companyId",
          currentUser.companyId
        );

    if (
      currentUser.role ===
      "atendente"
    ) {
      contactsQuery =
        contactsQuery.eq(
          "responsibleId",
          currentUser.id
        );
    }

    const {
      data: contacts,
      error:
        contactsError,
    } =
      await contactsQuery;

    if (
      contactsError
    ) {
      return NextResponse.json(
        {
          error:
            contactsError.message,
        },
        {
          status: 500,
        }
      );
    }

    contatosPermitidos =
      (
        contacts ||
        []
      ) as ContactRow[];

    const contactIds =
      contatosPermitidos.map(
        (
          contact
        ) =>
          contact.id
      );

    if (
      contactIds.length === 0
    ) {
      return NextResponse.json({
        conversations: [],
      });
    }

    const {
      data: conversations,
      error:
        conversationsError,
    } =
      await supabaseAdmin
        .from("Conversation")
        .select(
          "id, companyId, whatsappAccountId, contactId, status, unreadCount, lastMessageAt, createdAt, updatedAt"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .in(
          "contactId",
          contactIds
        )
        .order(
          "lastMessageAt",
          {
            ascending: false,
            nullsFirst: false,
          }
        );

    if (
      conversationsError
    ) {
      return NextResponse.json(
        {
          error:
            conversationsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const conversationRows =
      (
        conversations ||
        []
      ) as ConversationRow[];

    if (
      conversationRows.length ===
      0
    ) {
      return NextResponse.json({
        conversations: [],
      });
    }

    const conversationIds =
      conversationRows.map(
        (
          conversation
        ) =>
          conversation.id
      );

    const {
      data: messages,
      error:
        messagesError,
    } =
      await supabaseAdmin
        .from("Message")
        .select(
          "id, conversationId, direction, type, body, status, mediaId, mediaMimeType, messageTimestamp, createdAt"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .in(
          "conversationId",
          conversationIds
        )
        .order(
          "messageTimestamp",
          {
            ascending: false,
          }
        )
        .order(
          "createdAt",
          {
            ascending: false,
          }
        )
        .limit(
          1000
        );

    if (
      messagesError
    ) {
      return NextResponse.json(
        {
          error:
            messagesError.message,
        },
        {
          status: 500,
        }
      );
    }

    const contactMap =
      new Map(
        contatosPermitidos.map(
          (
            contact
          ) => [
            contact.id,
            contact,
          ]
        )
      );

    const latestMessageMap =
      new Map<
        string,
        MessageRow
      >();

    for (
      const message of
      (
        messages ||
        []
      ) as MessageRow[]
    ) {
      if (
        !latestMessageMap.has(
          message.conversationId
        )
      ) {
        latestMessageMap.set(
          message.conversationId,
          message
        );
      }
    }

    const inbox =
      conversationRows.map(
        (
          conversation
        ) => {
          return {
            ...conversation,

            contact:
              contactMap.get(
                conversation.contactId
              ) ||
              null,

            lastMessage:
              latestMessageMap.get(
                conversation.id
              ) ||
              null,
          };
        }
      );

    return NextResponse.json({
      conversations:
        inbox,
    });
  } catch (error) {
    console.error(
      "Erro na API de conversas WhatsApp:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const verificacao =
      await autenticar(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
      currentUser,
    } = verificacao;

    const body =
      await request.json();

    const action =
      typeof body.action ===
      "string"
        ? body.action
        : "";

    const conversationId =
      typeof body.conversationId ===
      "string"
        ? body.conversationId
        : "";

    if (
      !conversationId
    ) {
      return NextResponse.json(
        {
          error:
            "conversationId é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const acesso =
      await validarConversa(
        supabaseAdmin,
        currentUser,
        conversationId
      );

    if (!acesso) {
      return NextResponse.json(
        {
          error:
            "Conversa não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      action ===
      "mark_read"
    ) {
      const {
        error,
      } =
        await supabaseAdmin
          .from("Conversation")
          .update({
            unreadCount:
              0,

            updatedAt:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            conversationId
          )
          .eq(
            "companyId",
            currentUser.companyId
          );

      if (error) {
        return NextResponse.json(
          {
            error:
              error.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        message:
          "Conversa marcada como lida.",
      });
    }

    return NextResponse.json(
      {
        error:
          "Ação inválida.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao atualizar conversa WhatsApp:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado.",
      },
      {
        status: 500,
      }
    );
  }
}