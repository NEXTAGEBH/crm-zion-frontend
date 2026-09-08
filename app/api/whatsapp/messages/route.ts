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
};

type ContactRow = {
  id: string;
  name: string;
  phone: string;
  whatsappWaId: string | null;
  responsibleId: string | null;
};

type WhatsAppAccountRow = {
  id: string;
  companyId: string;
  phoneNumberId: string;
  status: string;
};

type MetaSendResponse = {
  messaging_product?: string;

  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;

  messages?: Array<{
    id?: string;
    message_status?: string;
  }>;

  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
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
  };
}

async function validarAcessoConversa(
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
    error:
      conversationError,
  } =
    await supabaseAdmin
      .from("Conversation")
      .select(
        "id, companyId, whatsappAccountId, contactId, status"
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

  if (
    conversationError
  ) {
    throw new Error(
      `Erro ao localizar conversa: ${conversationError.message}`
    );
  }

  if (!conversation) {
    return null;
  }

  let contactQuery =
    supabaseAdmin
      .from("Contact")
      .select(
        "id, name, phone, whatsappWaId, responsibleId"
      )
      .eq(
        "id",
        conversation.contactId
      )
      .eq(
        "companyId",
        currentUser.companyId
      );

  if (
    currentUser.role ===
    "atendente"
  ) {
    contactQuery =
      contactQuery.eq(
        "responsibleId",
        currentUser.id
      );
  }

  const {
    data: contact,
    error:
      contactError,
  } =
    await contactQuery
      .maybeSingle();

  if (
    contactError
  ) {
    throw new Error(
      `Erro ao localizar contato: ${contactError.message}`
    );
  }

  if (!contact) {
    return null;
  }

  const {
    data: account,
    error:
      accountError,
  } =
    await supabaseAdmin
      .from("WhatsAppAccount")
      .select(
        "id, companyId, phoneNumberId, status"
      )
      .eq(
        "id",
        conversation.whatsappAccountId
      )
      .eq(
        "companyId",
        currentUser.companyId
      )
      .maybeSingle();

  if (
    accountError
  ) {
    throw new Error(
      `Erro ao localizar conta WhatsApp: ${accountError.message}`
    );
  }

  if (
    !account ||
    account.status !==
      "active"
  ) {
    throw new Error(
      "Conta do WhatsApp indisponível."
    );
  }

  return {
    conversation:
      conversation as ConversationRow,

    contact:
      contact as ContactRow,

    account:
      account as WhatsAppAccountRow,
  };
}

export async function POST(
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

    const conversationId =
      typeof body.conversationId ===
      "string"
        ? body.conversationId.trim()
        : "";

    const text =
      typeof body.text ===
      "string"
        ? body.text.trim()
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

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Digite uma mensagem.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      text.length >
      4096
    ) {
      return NextResponse.json(
        {
          error:
            "A mensagem é muito longa.",
        },
        {
          status: 400,
        }
      );
    }

    const acesso =
      await validarAcessoConversa(
        supabaseAdmin,
        currentUser,
        conversationId
      );

    if (!acesso) {
      return NextResponse.json(
        {
          error:
            "Conversa não encontrada ou sem permissão.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      conversation,
      contact,
      account,
    } = acesso;

    const destinatario =
      contact.whatsappWaId ||
      contact.phone;

    if (
      !destinatario
    ) {
      return NextResponse.json(
        {
          error:
            "O contato não possui número de WhatsApp.",
        },
        {
          status: 400,
        }
      );
    }

    const accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN;

    if (
      !accessToken
    ) {
      return NextResponse.json(
        {
          error:
            "WHATSAPP_ACCESS_TOKEN não configurado.",
        },
        {
          status: 500,
        }
      );
    }

    const graphVersion =
      (
        process.env
          .WHATSAPP_GRAPH_VERSION ||
        "v26.0"
      ).trim();

    const agora =
      new Date()
        .toISOString();

    /*
     * Primeiro registramos a
     * tentativa no banco.
     *
     * Assim não perdemos o
     * histórico caso a Meta
     * devolva algum erro.
     */
    const {
      data:
        mensagemPendente,
      error:
        mensagemPendenteError,
    } =
      await supabaseAdmin
        .from("Message")
        .insert({
          companyId:
            currentUser.companyId,

          conversationId:
            conversation.id,

          whatsappAccountId:
            account.id,

          wamid:
            null,

          direction:
            "outbound",

          type:
            "text",

          body:
            text,

          status:
            "pending",

          mediaId:
            null,

          mediaMimeType:
            null,

          messageTimestamp:
            agora,

          metadata: {
            source:
              "crm_zion",
          },
        })
        .select(
          "id, conversationId, direction, type, body, status, messageTimestamp, createdAt"
        )
        .single();

    if (
      mensagemPendenteError ||
      !mensagemPendente
    ) {
      return NextResponse.json(
        {
          error:
            mensagemPendenteError
              ?.message ||
            "Não foi possível registrar a mensagem.",
        },
        {
          status: 500,
        }
      );
    }

    const endpoint =
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(
        account.phoneNumberId
      )}/messages`;

    let metaResponse:
      Response;

    let metaData:
      MetaSendResponse;

    try {
      metaResponse =
        await fetch(
          endpoint,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  messaging_product:
                    "whatsapp",

                  recipient_type:
                    "individual",

                  to:
                    destinatario,

                  type:
                    "text",

                  text: {
                    preview_url:
                      false,

                    body:
                      text,
                  },
                }
              ),
          }
        );

      metaData =
        (
          await metaResponse
            .json()
        ) as MetaSendResponse;
    } catch (
      fetchError
    ) {
      await supabaseAdmin
        .from("Message")
        .update({
          status:
            "failed",

          metadata: {
            source:
              "crm_zion",

            error:
              fetchError instanceof
                Error
                ? fetchError.message
                : "Falha de comunicação com a Meta.",
          },

          updatedAt:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          mensagemPendente.id
        )
        .eq(
          "companyId",
          currentUser.companyId
        );

      return NextResponse.json(
        {
          error:
            "Não foi possível comunicar com a Meta.",
        },
        {
          status: 502,
        }
      );
    }

    if (
      !metaResponse.ok
    ) {
      await supabaseAdmin
        .from("Message")
        .update({
          status:
            "failed",

          metadata: {
            source:
              "crm_zion",

            meta:
              metaData,
          },

          updatedAt:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          mensagemPendente.id
        )
        .eq(
          "companyId",
          currentUser.companyId
        );

      const mensagemMeta =
        metaData.error
          ?.message ||
        "A Meta recusou o envio da mensagem.";

      return NextResponse.json(
        {
          error:
            mensagemMeta,

          metaCode:
            metaData.error
              ?.code ||
            null,
        },
        {
          status: 502,
        }
      );
    }

    const wamid =
      metaData.messages
        ?.[0]
        ?.id;

    if (!wamid) {
      await supabaseAdmin
        .from("Message")
        .update({
          status:
            "failed",

          metadata: {
            source:
              "crm_zion",

            meta:
              metaData,
          },

          updatedAt:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          mensagemPendente.id
        )
        .eq(
          "companyId",
          currentUser.companyId
        );

      return NextResponse.json(
        {
          error:
            "A Meta não retornou o ID da mensagem.",
        },
        {
          status: 502,
        }
      );
    }

    const {
      data:
        mensagemEnviada,
      error:
        mensagemUpdateError,
    } =
      await supabaseAdmin
        .from("Message")
        .update({
          wamid,

          status:
            "sent",

          metadata: {
            source:
              "crm_zion",

            meta:
              metaData,
          },

          updatedAt:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          mensagemPendente.id
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .select(
          "id, conversationId, direction, type, body, status, messageTimestamp, createdAt"
        )
        .single();

    if (
      mensagemUpdateError ||
      !mensagemEnviada
    ) {
      console.error(
        "Mensagem foi aceita pela Meta, mas não foi possível atualizar o banco:",
        mensagemUpdateError
      );

      return NextResponse.json(
        {
          error:
            "A mensagem foi aceita pela Meta, mas houve erro ao atualizar o CRM.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error:
        conversationError,
    } =
      await supabaseAdmin
        .from("Conversation")
        .update({
          status:
            "open",

          lastMessageAt:
            agora,

          updatedAt:
            agora,
        })
        .eq(
          "id",
          conversation.id
        )
        .eq(
          "companyId",
          currentUser.companyId
        );

    if (
      conversationError
    ) {
      console.error(
        "Erro ao atualizar conversa depois do envio:",
        conversationError
      );
    }

    return NextResponse.json({
      message:
        mensagemEnviada,

      wamid,
    });
  } catch (error) {
    console.error(
      "Erro ao enviar mensagem WhatsApp:",
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