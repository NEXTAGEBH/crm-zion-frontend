import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

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
    caption?: string;
    mime_type?: string;
  };

  audio?: {
    id?: string;
    mime_type?: string;
  };

  video?: {
    id?: string;
    caption?: string;
    mime_type?: string;
  };

  document?: {
    id?: string;
    caption?: string;
    filename?: string;
    mime_type?: string;
  };

  sticker?: {
    id?: string;
    mime_type?: string;
  };

  button?: {
    text?: string;
    payload?: string;
  };

  interactive?: {
    type?: string;

    button_reply?: {
      id?: string;
      title?: string;
    };

    list_reply?: {
      id?: string;
      title?: string;
      description?: string;
    };
  };
};

type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
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
};

type WhatsAppChange = {
  field?: string;
  value?: WhatsAppChangeValue;
};

type WhatsAppEntry = {
  id?: string;
  changes?: WhatsAppChange[];
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: WhatsAppEntry[];

  /*
   * O painel de testes da Meta
   * também pode enviar diretamente
   * field + value.
   */
  field?: string;
  value?: WhatsAppChangeValue;
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
    createHmac(
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

  return timingSafeEqual(
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

  if (type === "text") {
    return {
      body:
        message.text?.body ||
        null,

      mediaId: null,
      mediaMimeType: null,
    };
  }

  if (type === "image") {
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

  if (type === "audio") {
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

  if (type === "video") {
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

  if (type === "document") {
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

  if (type === "sticker") {
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

  if (type === "button") {
    return {
      body:
        message.button?.text ||
        null,

      mediaId: null,
      mediaMimeType: null,
    };
  }

  if (type === "interactive") {
    return {
      body:
        message.interactive
          ?.button_reply?.title ||
        message.interactive
          ?.list_reply?.title ||
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

function extrairChanges(
  payload: WhatsAppWebhookPayload
): WhatsAppChange[] {
  /*
   * Formato usado pela tela de
   * teste do painel da Meta.
   *
   * {
   *   field: "messages",
   *   value: {...}
   * }
   */
  if (
    payload.field &&
    payload.value
  ) {
    return [
      {
        field: payload.field,
        value: payload.value,
      },
    ];
  }

  /*
   * Formato real dos webhooks
   * da WhatsApp Cloud API.
   *
   * object
   * entry[]
   * changes[]
   */
  const changes: WhatsAppChange[] =
    [];

  for (
    const entry of
    payload.entry || []
  ) {
    for (
      const change of
      entry.changes || []
    ) {
      changes.push(change);
    }
  }

  return changes;
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
    error: contatoExistenteError,
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
   * Procura um contato cadastrado
   * manualmente usando o telefone.
   */
  const {
    data: contatoPorTelefone,
    error: contatoTelefoneError,
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
      error: updateError,
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
   * Todo novo lead recebido pelo
   * WhatsApp entra na primeira
   * etapa do funil da empresa.
   */
  const {
    data: primeiraEtapa,
    error: etapaError,
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
    error: novoContatoError,
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
    error: conversaError,
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

  if (
    conversaError
  ) {
    throw new Error(
      `Erro ao procurar conversa: ${conversaError.message}`
    );
  }

  if (conversa) {
    const unreadCount =
      typeof conversa.unreadCount ===
      "number"
        ? conversa.unreadCount + 1
        : 1;

    const {
      data: conversaAtualizada,
      error: updateError,
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
    error: novaConversaError,
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
    console.warn(
      "Mensagem recebida sem id ou remetente."
    );

    return;
  }

  /*
   * Webhooks podem ser reenviados
   * pela Meta. O wamid impede
   * duplicidade.
   */
  const {
    data: mensagemExistente,
    error: mensagemExistenteError,
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
    error: mensagemError,
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
     * 23505 é unique violation.
     * Outra execução já pode ter
     * salvo o mesmo wamid.
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

  console.log(
    "Mensagem WhatsApp recebida e salva.",
    {
      phoneNumberId:
        account.phoneNumberId,

      companyId:
        account.companyId,

      contactId:
        contato.id,

      wamid,
    }
  );
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

async function processarChange(
  change: WhatsAppChange
) {
  if (
    change.field !==
    "messages"
  ) {
    return;
  }

  const value =
    change.value;

  if (!value) {
    return;
  }

  const phoneNumberId =
    value.metadata
      ?.phone_number_id;

  if (!phoneNumberId) {
    console.warn(
      "Webhook sem phone_number_id."
    );

    return;
  }

  /*
   * Ponto central do multi tenant:
   *
   * phone_number_id
   * WhatsAppAccount
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

    return;
  }

  for (
    const message of
    value.messages || []
  ) {
    await processarMensagemRecebida(
      value,
      account,
      message
    );
  }

  for (
    const status of
    value.statuses || []
  ) {
    await processarStatus(
      status
    );
  }
}

/*
 * Verificação inicial do webhook
 * feita pela Meta.
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
 * Recebe mensagens e atualizações
 * de status da WhatsApp Cloud API.
 *
 * Aceita:
 *
 * 1. Payload real de produção
 *
 * object
 * entry[]
 * changes[]
 *
 * 2. Payload direto enviado pela
 * ferramenta de teste da Meta
 *
 * field
 * value
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
        ) as WhatsAppWebhookPayload;
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

    /*
     * Agora normalizamos os dois
     * formatos em uma única lista.
     */
    const changes =
      extrairChanges(
        payload
      );

    if (
      changes.length === 0
    ) {
      console.log(
        "Webhook recebido sem changes processáveis."
      );

      return NextResponse.json({
        received: true,
        processed: 0,
      });
    }

    let processados = 0;

    for (
      const change of
      changes
    ) {
      if (
        change.field !==
        "messages"
      ) {
        continue;
      }

      await processarChange(
        change
      );

      processados++;
    }

    return NextResponse.json({
      received: true,
      processed:
        processados,
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