import crypto from "crypto";

import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type WhatsAppAccount = {
  id: string;
  companyId: string;
  phoneNumberId: string;
};

type WhatsAppContact = {
  wa_id?: string;

  profile?: {
    name?: string;
  };
};

type WhatsAppMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;

  text?: {
    body?: string;
  };

  image?: {
    id?: string;
    mime_type?: string;
    caption?: string;
  };

  audio?: {
    id?: string;
    mime_type?: string;
  };

  video?: {
    id?: string;
    mime_type?: string;
    caption?: string;
  };

  document?: {
    id?: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
  };

  sticker?: {
    id?: string;
    mime_type?: string;
  };

  button?: {
    text?: string;
  };

  interactive?: unknown;

  [key: string]: unknown;
};

type WhatsAppStatus = {
  id?: string;
  status?: string;

  [key: string]: unknown;
};

type WhatsAppChangeValue = {
  messaging_product?: string;

  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };

  contacts?: WhatsAppContact[];

  messages?: WhatsAppMessage[];

  statuses?: WhatsAppStatus[];

  [key: string]: unknown;
};

type WhatsAppWebhookPayload = {
  object?: string;

  entry?: Array<{
    id?: string;

    changes?: Array<{
      field?: string;

      value?: WhatsAppChangeValue;
    }>;
  }>;
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

function validarAssinaturaMeta(
  rawBody: string,
  signature: string | null
) {
  const appSecret =
    process.env.META_APP_SECRET;

  if (!appSecret) {
    throw new Error(
      "META_APP_SECRET não configurado."
    );
  }

  if (!signature) {
    return false;
  }

  const expectedSignature =
    "sha256=" +
    crypto
      .createHmac(
        "sha256",
        appSecret
      )
      .update(
        rawBody,
        "utf8"
      )
      .digest("hex");

  const receivedBuffer =
    Buffer.from(
      signature,
      "utf8"
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function timestampParaIso(
  timestamp?: string
) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const seconds =
    Number(timestamp);

  if (
    !Number.isFinite(
      seconds
    )
  ) {
    return new Date().toISOString();
  }

  return new Date(
    seconds * 1000
  ).toISOString();
}

function extrairConteudo(
  message: WhatsAppMessage
) {
  const type =
    message.type ||
    "unknown";

  if (
    type === "text"
  ) {
    return {
      body:
        message.text?.body ||
        null,

      mediaId: null,
      mediaMimeType: null,
    };
  }

  if (
    type === "image"
  ) {
    return {
      body:
        message.image?.caption ||
        null,

      mediaId:
        message.image?.id ||
        null,

      mediaMimeType:
        message.image
          ?.mime_type ||
        null,
    };
  }

  if (
    type === "audio"
  ) {
    return {
      body: null,

      mediaId:
        message.audio?.id ||
        null,

      mediaMimeType:
        message.audio
          ?.mime_type ||
        null,
    };
  }

  if (
    type === "video"
  ) {
    return {
      body:
        message.video?.caption ||
        null,

      mediaId:
        message.video?.id ||
        null,

      mediaMimeType:
        message.video
          ?.mime_type ||
        null,
    };
  }

  if (
    type === "document"
  ) {
    return {
      body:
        message.document
          ?.caption ||
        message.document
          ?.filename ||
        null,

      mediaId:
        message.document?.id ||
        null,

      mediaMimeType:
        message.document
          ?.mime_type ||
        null,
    };
  }

  if (
    type === "sticker"
  ) {
    return {
      body: null,

      mediaId:
        message.sticker?.id ||
        null,

      mediaMimeType:
        message.sticker
          ?.mime_type ||
        null,
    };
  }

  if (
    type === "button"
  ) {
    return {
      body:
        message.button?.text ||
        null,

      mediaId: null,
      mediaMimeType: null,
    };
  }

  return {
    body: null,
    mediaId: null,
    mediaMimeType: null,
  };
}

async function buscarContaWhatsApp(
  phoneNumberId: string
): Promise<WhatsAppAccount | null> {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("WhatsAppAccount")
    .select(
      "id, companyId, phoneNumberId"
    )
    .eq(
      "phoneNumberId",
      phoneNumberId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao localizar conta WhatsApp: ${error.message}`
    );
  }

  return data;
}

async function buscarOuCriarContato(
  account: WhatsAppAccount,
  waId: string,
  nome: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: contatoExistente,
    error:
      contatoExistenteError,
  } = await supabaseAdmin
    .from("Contact")
    .select(
      "id, name, phone, whatsappWaId, funnelStepId, responsibleId"
    )
    .eq(
      "companyId",
      account.companyId
    )
    .eq(
      "whatsappWaId",
      waId
    )
    .maybeSingle();

  if (
    contatoExistenteError
  ) {
    throw new Error(
      `Erro ao procurar contato: ${contatoExistenteError.message}`
    );
  }

  if (
    contatoExistente
  ) {
    return contatoExistente;
  }

  /*
   * Segunda tentativa:
   * contato manual já cadastrado
   * com o telefone exatamente
   * igual ao WA ID.
   */
  const {
    data: contatoPorTelefone,
    error:
      contatoTelefoneError,
  } = await supabaseAdmin
    .from("Contact")
    .select(
      "id, name, phone, whatsappWaId, funnelStepId, responsibleId"
    )
    .eq(
      "companyId",
      account.companyId
    )
    .eq(
      "phone",
      waId
    )
    .maybeSingle();

  if (
    contatoTelefoneError
  ) {
    throw new Error(
      `Erro ao procurar telefone: ${contatoTelefoneError.message}`
    );
  }

  if (
    contatoPorTelefone
  ) {
    const {
      data: contatoAtualizado,
      error:
        updateError,
    } = await supabaseAdmin
      .from("Contact")
      .update({
        whatsappWaId:
          waId,
      })
      .eq(
        "id",
        contatoPorTelefone.id
      )
      .eq(
        "companyId",
        account.companyId
      )
      .select(
        "id, name, phone, whatsappWaId, funnelStepId, responsibleId"
      )
      .single();

    if (
      updateError
    ) {
      throw new Error(
        `Erro ao vincular WhatsApp ao contato: ${updateError.message}`
      );
    }

    return contatoAtualizado;
  }

  /*
   * Todo lead novo do WhatsApp
   * entra automaticamente na
   * primeira etapa do funil.
   */
  const {
    data: primeiraEtapa,
    error:
      etapaError,
  } = await supabaseAdmin
    .from("FunnelStep")
    .select(
      "id, name, order"
    )
    .eq(
      "companyId",
      account.companyId
    )
    .order(
      "order",
      {
        ascending: true,
      }
    )
    .limit(1)
    .maybeSingle();

  if (etapaError) {
    throw new Error(
      `Erro ao identificar o funil: ${etapaError.message}`
    );
  }

  if (!primeiraEtapa) {
    throw new Error(
      `A empresa ${account.companyId} não possui etapas no funil.`
    );
  }

  const {
    data: novoContato,
    error:
      novoContatoError,
  } = await supabaseAdmin
    .from("Contact")
    .insert({
      name:
        nome ||
        waId,

      phone:
        waId,

      origin:
        "WhatsApp",

      companyId:
        account.companyId,

      whatsappWaId:
        waId,

      funnelStepId:
        primeiraEtapa.id,

      responsibleId:
        null,
    })
    .select(
      "id, name, phone, whatsappWaId, funnelStepId, responsibleId"
    )
    .single();

  if (
    novoContatoError
  ) {
    throw new Error(
      `Erro ao criar contato: ${novoContatoError.message}`
    );
  }

  return novoContato;
}

async function buscarOuCriarConversa(
  account: WhatsAppAccount,
  contactId: string,
  messageTimestamp: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: conversa,
    error:
      conversaError,
  } = await supabaseAdmin
    .from("Conversation")
    .select(
      "id, unreadCount, status"
    )
    .eq(
      "whatsappAccountId",
      account.id
    )
    .eq(
      "contactId",
      contactId
    )
    .maybeSingle();

  if (conversaError) {
    throw new Error(
      `Erro ao procurar conversa: ${conversaError.message}`
    );
  }

  if (conversa) {
    const unreadCount =
      typeof conversa.unreadCount ===
      "number"
        ? conversa.unreadCount +
          1
        : 1;

    const {
      data: conversaAtualizada,
      error:
        updateError,
    } = await supabaseAdmin
      .from("Conversation")
      .update({
        status:
          "open",

        unreadCount,

        lastMessageAt:
          messageTimestamp,

        updatedAt:
          new Date().toISOString(),
      })
      .eq(
        "id",
        conversa.id
      )
      .eq(
        "companyId",
        account.companyId
      )
      .select(
        "id, unreadCount, status"
      )
      .single();

    if (updateError) {
      throw new Error(
        `Erro ao atualizar conversa: ${updateError.message}`
      );
    }

    return conversaAtualizada;
  }

  const {
    data: novaConversa,
    error:
      novaConversaError,
  } = await supabaseAdmin
    .from("Conversation")
    .insert({
      companyId:
        account.companyId,

      whatsappAccountId:
        account.id,

      contactId,

      status:
        "open",

      unreadCount:
        1,

      lastMessageAt:
        messageTimestamp,
    })
    .select(
      "id, unreadCount, status"
    )
    .single();

  if (
    novaConversaError
  ) {
    throw new Error(
      `Erro ao criar conversa: ${novaConversaError.message}`
    );
  }

  return novaConversa;
}

async function processarMensagemRecebida(
  value: WhatsAppChangeValue,
  account: WhatsAppAccount,
  message: WhatsAppMessage
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const wamid =
    message.id;

  const sender =
    message.from;

  if (
    !wamid ||
    !sender
  ) {
    return;
  }

  /*
   * A Meta pode reenviar webhooks.
   * Antes de qualquer alteração,
   * verificamos se a mensagem já
   * foi processada.
   */
  const {
    data: mensagemExistente,
    error:
      mensagemExistenteError,
  } = await supabaseAdmin
    .from("Message")
    .select("id")
    .eq(
      "wamid",
      wamid
    )
    .maybeSingle();

  if (
    mensagemExistenteError
  ) {
    throw new Error(
      `Erro ao verificar mensagem existente: ${mensagemExistenteError.message}`
    );
  }

  if (
    mensagemExistente
  ) {
    return;
  }

  const contatoMeta =
    value.contacts?.find(
      (contact) =>
        contact.wa_id ===
        sender
    ) ||
    value.contacts?.[0];

  const waId =
    contatoMeta?.wa_id ||
    sender;

  const nome =
    contatoMeta?.profile
      ?.name ||
    waId;

  const contato =
    await buscarOuCriarContato(
      account,
      waId,
      nome
    );

  const messageTimestamp =
    timestampParaIso(
      message.timestamp
    );

  const conversa =
    await buscarOuCriarConversa(
      account,
      contato.id,
      messageTimestamp
    );

  const conteudo =
    extrairConteudo(
      message
    );

  const {
    error:
      mensagemError,
  } = await supabaseAdmin
    .from("Message")
    .insert({
      companyId:
        account.companyId,

      conversationId:
        conversa.id,

      whatsappAccountId:
        account.id,

      wamid,

      direction:
        "inbound",

      type:
        message.type ||
        "unknown",

      body:
        conteudo.body,

      status:
        "received",

      mediaId:
        conteudo.mediaId,

      mediaMimeType:
        conteudo.mediaMimeType,

      messageTimestamp,

      metadata:
        message,
    });

  if (mensagemError) {
    /*
     * 23505 significa que outra
     * execução já salvou o wamid.
     */
    if (
      mensagemError.code ===
      "23505"
    ) {
      return;
    }

    throw new Error(
      `Erro ao salvar mensagem: ${mensagemError.message}`
    );
  }
}

async function processarStatus(
  status: WhatsAppStatus
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  if (
    !status.id ||
    !status.status
  ) {
    return;
  }

  const statusPermitidos = [
    "sent",
    "delivered",
    "read",
    "failed",
  ];

  if (
    !statusPermitidos.includes(
      status.status
    )
  ) {
    return;
  }

  const {
    error,
  } = await supabaseAdmin
    .from("Message")
    .update({
      status:
        status.status,

      updatedAt:
        new Date().toISOString(),
    })
    .eq(
      "wamid",
      status.id
    );

  if (error) {
    throw new Error(
      `Erro ao atualizar status: ${error.message}`
    );
  }
}

/*
 * =========================================================
 * GET
 * Verificação inicial do webhook pela Meta
 * =========================================================
 */
export async function GET(
  request: Request
) {
  const url =
    new URL(
      request.url
    );

  const mode =
    url.searchParams.get(
      "hub.mode"
    );

  const token =
    url.searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    url.searchParams.get(
      "hub.challenge"
    );

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error(
      "WHATSAPP_VERIFY_TOKEN não configurado."
    );

    return new NextResponse(
      "Webhook não configurado.",
      {
        status: 500,
      }
    );
  }

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(
      challenge,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/plain",
        },
      }
    );
  }

  return new NextResponse(
    "Verificação recusada.",
    {
      status: 403,
    }
  );
}

/*
 * =========================================================
 * POST
 * Recebe mensagens e status do WhatsApp
 * =========================================================
 */
export async function POST(
  request: Request
) {
  try {
    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "x-hub-signature-256"
      );

    const assinaturaValida =
      validarAssinaturaMeta(
        rawBody,
        signature
      );

    if (
      !assinaturaValida
    ) {
      console.warn(
        "Webhook WhatsApp com assinatura inválida."
      );

      return NextResponse.json(
        {
          error:
            "Assinatura inválida.",
        },
        {
          status: 401,
        }
      );
    }

    let payload:
      WhatsAppWebhookPayload;

    try {
      payload =
        JSON.parse(
          rawBody
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "JSON inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      payload.object !==
      "whatsapp_business_account"
    ) {
      return NextResponse.json(
        {
          received: true,
        }
      );
    }

    for (
      const entry of
      payload.entry || []
    ) {
      for (
        const change of
        entry.changes || []
      ) {
        if (
          change.field !==
          "messages"
        ) {
          continue;
        }

        const value =
          change.value;

        if (!value) {
          continue;
        }

        const phoneNumberId =
          value.metadata
            ?.phone_number_id;

        if (!phoneNumberId) {
          console.warn(
            "Webhook sem phone_number_id."
          );

          continue;
        }

        /*
         * Este é o ponto central
         * do multi tenant.
         *
         * phone_number_id
         * ↓
         * WhatsAppAccount
         * ↓
         * companyId
         */
        const account =
          await buscarContaWhatsApp(
            phoneNumberId
          );

        if (!account) {
          console.warn(
            `Número WhatsApp não cadastrado no Zion: ${phoneNumberId}`
          );

          /*
           * Retornamos 200 no final.
           * Não adianta a Meta ficar
           * reenviando um evento de
           * um número ainda não cadastrado.
           */
          continue;
        }

        for (
          const message of
          value.messages ||
          []
        ) {
          await processarMensagemRecebida(
            value,
            account,
            message
          );
        }

        for (
          const status of
          value.statuses ||
          []
        ) {
          await processarStatus(
            status
          );
        }
      }
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Erro no webhook WhatsApp:",
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