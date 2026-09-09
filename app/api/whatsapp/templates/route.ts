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

type WhatsAppTemplateRow = {
  id: string;
  companyId: string;
  whatsappAccountId: string | null;
  wabaId: string | null;
  friendlyName: string;
  metaName: string;
  category: string;
  language: string;
  status: string;
  body: string;
  variables: unknown;
  metaTemplateId: string | null;
  rejectionReason: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type WhatsAppAccountRow = {
  id: string;
  companyId: string;
  wabaId: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: string;
};

type MetaTemplateComponent = {
  type?: string;
  format?: string;
  text?: string;
  buttons?: unknown[];
  example?: unknown;
};

type MetaTemplate = {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  language?: string;
  components?: MetaTemplateComponent[];
};

type MetaTemplatesResponse = {
  data?: MetaTemplate[];
  paging?: {
    next?: string;
    cursors?: {
      before?: string;
      after?: string;
    };
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

const STATUS_PERMITIDOS = new Set([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "DISABLED",
  "IN_APPEAL",
  "PENDING_DELETION",
  "DELETED",
  "LIMIT_EXCEEDED",
]);

const CATEGORIAS_PERMITIDAS = new Set([
  "MARKETING",
  "UTILITY",
  "AUTHENTICATION",
]);

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
    .replace("Bearer ", "")
    .trim();
}

async function autenticar(
  request: Request
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const token =
    pegarToken(request);

  if (!token) {
    return {
      autorizado: false as const,

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
      .getUser(token);

  if (
    authError ||
    !user
  ) {
    return {
      autorizado: false as const,

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
      autorizado: false as const,

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

  if (!crmUser.isActive) {
    return {
      autorizado: false as const,

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
      autorizado: false as const,

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
      autorizado: false as const,

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
    autorizado: true as const,
    supabaseAdmin,
    currentUser: crmUser,
  };
}

function normalizarStatus(
  status?: string
) {
  const valor =
    (
      status ||
      "PENDING"
    )
      .trim()
      .toUpperCase();

  if (
    STATUS_PERMITIDOS.has(
      valor
    )
  ) {
    return valor;
  }

  return "PENDING";
}

function normalizarCategoria(
  category?: string
) {
  const valor =
    (
      category ||
      "MARKETING"
    )
      .trim()
      .toUpperCase();

  if (
    CATEGORIAS_PERMITIDAS.has(
      valor
    )
  ) {
    return valor;
  }

  return "MARKETING";
}

function gerarNomeAmigavel(
  metaName: string
) {
  const texto =
    metaName
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (!texto) {
    return metaName;
  }

  return texto
    .charAt(0)
    .toUpperCase() +
    texto.slice(1);
}

function extrairBody(
  components:
    MetaTemplateComponent[] |
    undefined
) {
  const componenteBody =
    (
      components ||
      []
    ).find(
      (component) =>
        (
          component.type ||
          ""
        )
          .toUpperCase() ===
        "BODY"
    );

  return (
    componenteBody
      ?.text ||
    ""
  ).trim();
}

function extrairVariaveis(
  body: string
) {
  const posicoes =
    new Set<number>();

  const regex =
    /\{\{\s*(\d+)\s*\}\}/g;

  let match:
    RegExpExecArray |
    null;

  while (
    (
      match =
        regex.exec(body)
    )
  ) {
    const position =
      Number(
        match[1]
      );

    if (
      Number.isInteger(
        position
      ) &&
      position > 0
    ) {
      posicoes.add(
        position
      );
    }
  }

  return Array
    .from(posicoes)
    .sort(
      (a, b) =>
        a - b
    )
    .map(
      (position) => ({
        position,
        name:
          position === 1
            ? "nome"
            : `variavel_${position}`,
      })
    );
}

async function buscarTemplatesMeta(
  wabaId: string,
  accessToken: string,
  graphVersion: string
) {
  const templates:
    MetaTemplate[] = [];

  let url:
    string |
    null =
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(
      wabaId
    )}/message_templates?fields=id,name,status,category,language,components&limit=100`;

  let paginas = 0;

  while (url) {
    paginas += 1;

    if (paginas > 100) {
      throw new Error(
        "A sincronização foi interrompida porque a Meta retornou páginas demais."
      );
    }

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          cache: "no-store",
        }
      );

    const data =
      (
        await response
          .json()
      ) as MetaTemplatesResponse;

    if (
      !response.ok ||
      data.error
    ) {
      const mensagem =
        data.error
          ?.message ||
        "A Meta recusou a consulta de templates.";

      const codigo =
        data.error
          ?.code
          ? ` Código Meta: ${data.error.code}.`
          : "";

      throw new Error(
        `${mensagem}${codigo}`
      );
    }

    templates.push(
      ...(
        data.data ||
        []
      )
    );

    url =
      data.paging
        ?.next ||
      null;
  }

  return templates;
}

async function sincronizarConta(
  supabaseAdmin:
    ReturnType<
      typeof getSupabaseAdmin
    >,
  currentUser:
    CurrentUser,
  account:
    WhatsAppAccountRow,
  accessToken:
    string,
  graphVersion:
    string
) {
  if (!account.wabaId) {
    return {
      accountId:
        account.id,

      wabaId:
        null,

      synced:
        0,

      skipped:
        true,

      reason:
        "Conta sem wabaId.",
    };
  }

  const metaTemplates =
    await buscarTemplatesMeta(
      account.wabaId,
      accessToken,
      graphVersion
    );

  const {
    data:
      existentes,
    error:
      existentesError,
  } =
    await supabaseAdmin
      .from(
        "WhatsAppTemplate"
      )
      .select(
        "id, companyId, whatsappAccountId, wabaId, friendlyName, metaName, category, language, status, body, variables, metaTemplateId, rejectionReason, isActive, lastSyncedAt, createdAt, updatedAt"
      )
      .eq(
        "companyId",
        currentUser.companyId
      )
      .eq(
        "wabaId",
        account.wabaId
      );

  if (existentesError) {
    throw new Error(
      `Erro ao carregar templates locais: ${existentesError.message}`
    );
  }

  const existentesRows =
    (
      existentes ||
      []
    ) as WhatsAppTemplateRow[];

  const existenteMap =
    new Map<
      string,
      WhatsAppTemplateRow
    >();

  for (
    const template
    of existentesRows
  ) {
    const chave =
      `${template.metaName}::${template.language}`;

    existenteMap.set(
      chave,
      template
    );
  }

  const agora =
    new Date()
      .toISOString();

  const chavesMeta =
    new Set<string>();

  let sincronizados = 0;

  for (
    const templateMeta
    of metaTemplates
  ) {
    const metaName =
      (
        templateMeta.name ||
        ""
      ).trim();

    const language =
      (
        templateMeta.language ||
        "pt_BR"
      ).trim();

    if (!metaName) {
      continue;
    }

    const chave =
      `${metaName}::${language}`;

    chavesMeta.add(
      chave
    );

    const existente =
      existenteMap.get(
        chave
      );

    const body =
      extrairBody(
        templateMeta.components
      );

    const variables =
      extrairVariaveis(
        body
      );

    const status =
      normalizarStatus(
        templateMeta.status
      );

    const category =
      normalizarCategoria(
        templateMeta.category
      );

    const payload = {
      companyId:
        currentUser.companyId,

      whatsappAccountId:
        account.id,

      wabaId:
        account.wabaId,

      friendlyName:
        existente
          ?.friendlyName ||
        gerarNomeAmigavel(
          metaName
        ),

      metaName,

      category,

      language,

      status,

      body,

      variables,

      metaTemplateId:
        templateMeta.id ||
        existente
          ?.metaTemplateId ||
        null,

      rejectionReason:
        status ===
        "REJECTED"
          ? existente
              ?.rejectionReason ||
            null
          : null,

      isActive:
        status ===
        "APPROVED"
          ? existente
              ?.isActive ??
            true
          : false,

      lastSyncedAt:
        agora,
    };

    if (existente) {
      const {
        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            "WhatsAppTemplate"
          )
          .update(
            payload
          )
          .eq(
            "id",
            existente.id
          )
          .eq(
            "companyId",
            currentUser.companyId
          );

      if (updateError) {
        throw new Error(
          `Erro ao atualizar template ${metaName}: ${updateError.message}`
        );
      }
    } else {
      const {
        error:
          insertError,
      } =
        await supabaseAdmin
          .from(
            "WhatsAppTemplate"
          )
          .insert(
            payload
          );

      if (insertError) {
        throw new Error(
          `Erro ao salvar template ${metaName}: ${insertError.message}`
        );
      }
    }

    sincronizados += 1;
  }

  /*
   * Se um template existia localmente
   * e deixou de aparecer na Meta depois
   * de uma sincronização completa,
   * mantemos o histórico e o marcamos
   * como DELETED/inativo.
   */
  for (
    const existente
    of existentesRows
  ) {
    const chave =
      `${existente.metaName}::${existente.language}`;

    if (
      chavesMeta.has(
        chave
      )
    ) {
      continue;
    }

    const {
      error:
        deletedError,
    } =
      await supabaseAdmin
        .from(
          "WhatsAppTemplate"
        )
        .update({
          status:
            "DELETED",

          isActive:
            false,

          lastSyncedAt:
            agora,
        })
        .eq(
          "id",
          existente.id
        )
        .eq(
          "companyId",
          currentUser.companyId
        );

    if (deletedError) {
      throw new Error(
        `Erro ao atualizar template removido ${existente.metaName}: ${deletedError.message}`
      );
    }
  }

  return {
    accountId:
      account.id,

    wabaId:
      account.wabaId,

    synced:
      sincronizados,

    skipped:
      false,

    totalMeta:
      metaTemplates.length,
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

    const somenteAprovados =
      url.searchParams.get(
        "approved"
      ) === "true";

    const whatsappAccountId =
      url.searchParams
        .get(
          "whatsappAccountId"
        )
        ?.trim() ||
      null;

    let query =
      supabaseAdmin
        .from("WhatsAppTemplate")
        .select(
          "id, companyId, whatsappAccountId, wabaId, friendlyName, metaName, category, language, status, body, variables, metaTemplateId, rejectionReason, isActive, lastSyncedAt, createdAt, updatedAt"
        )
        .eq(
          "companyId",
          currentUser.companyId
        );

    /*
     * Atendentes só precisam
     * enxergar templates que
     * realmente podem ser usados.
     */
    if (
      currentUser.role ===
      "atendente"
    ) {
      query =
        query
          .eq(
            "status",
            "APPROVED"
          )
          .eq(
            "isActive",
            true
          );
    } else if (
      somenteAprovados
    ) {
      query =
        query
          .eq(
            "status",
            "APPROVED"
          )
          .eq(
            "isActive",
            true
          );
    }

    if (
      whatsappAccountId
    ) {
      query =
        query.eq(
          "whatsappAccountId",
          whatsappAccountId
        );
    }

    const {
      data,
      error,
    } =
      await query
        .order(
          "friendlyName",
          {
            ascending: true,
          }
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
      templates:
        (
          data ||
          []
        ) as WhatsAppTemplateRow[],

      currentUser: {
        id:
          currentUser.id,

        role:
          currentUser.role,
      },

      canManage:
        [
          "admin",
          "zion_admin",
        ].includes(
          currentUser.role
        ),
    });
  } catch (error) {
    console.error(
      "Erro na API de templates WhatsApp:",
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

    if (
      ![
        "admin",
        "zion_admin",
      ].includes(
        currentUser.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Você não possui permissão para sincronizar templates.",
        },
        {
          status: 403,
        }
      );
    }

    let body:
      Record<
        string,
        unknown
      > = {};

    try {
      body =
        (
          await request
            .json()
        ) as Record<
          string,
          unknown
        >;
    } catch {
      body = {};
    }

    const whatsappAccountId =
      typeof body
        .whatsappAccountId ===
      "string"
        ? body
            .whatsappAccountId
            .trim()
        : "";

    const accessToken =
      process.env
        .WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
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

    let accountQuery =
      supabaseAdmin
        .from(
          "WhatsAppAccount"
        )
        .select(
          "id, companyId, wabaId, phoneNumberId, displayPhoneNumber, verifiedName, status"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .eq(
          "status",
          "active"
        );

    if (
      whatsappAccountId
    ) {
      accountQuery =
        accountQuery.eq(
          "id",
          whatsappAccountId
        );
    }

    const {
      data:
        accounts,
      error:
        accountsError,
    } =
      await accountQuery;

    if (accountsError) {
      return NextResponse.json(
        {
          error:
            accountsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const accountRows =
      (
        accounts ||
        []
      ) as WhatsAppAccountRow[];

    if (
      accountRows.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Nenhuma conta WhatsApp ativa foi encontrada para esta empresa.",
        },
        {
          status: 404,
        }
      );
    }

    const resultados = [];

    for (
      const account
      of accountRows
    ) {
      const resultado =
        await sincronizarConta(
          supabaseAdmin,
          currentUser,
          account,
          accessToken,
          graphVersion
        );

      resultados.push(
        resultado
      );
    }

    const totalSincronizados =
      resultados.reduce(
        (
          total,
          item
        ) =>
          total +
          (
            item.synced ||
            0
          ),
        0
      );

    return NextResponse.json({
      message:
        "Templates sincronizados com a Meta.",

      synced:
        totalSincronizados,

      accounts:
        resultados,
    });
  } catch (error) {
    console.error(
      "Erro ao sincronizar templates WhatsApp:",
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
