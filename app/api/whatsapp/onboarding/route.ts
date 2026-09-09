import { NextResponse } from "next/server";
import { createCipheriv, randomBytes } from "node:crypto";
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

type MetaError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: MetaError;
};

type MetaDebugResponse = {
  data?: {
    app_id?: string;
    type?: string;
    application?: string;
    data_access_expires_at?: number;
    expires_at?: number;
    is_valid?: boolean;
    scopes?: string[];
    granular_scopes?: Array<{
      scope?: string;
      target_ids?: string[];
    }>;
    user_id?: string;
  };
  error?: MetaError;
};

type MetaPhoneNumber = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  is_on_biz_app?: boolean;
  platform_type?: string;
};

type MetaPhoneNumbersResponse = {
  data?: MetaPhoneNumber[];
  error?: MetaError;
};

type MetaSubscriptionResponse = {
  success?: boolean | string;
  error?: MetaError;
};

type WhatsAppAccountRow = {
  id: string;
  companyId: string;
  wabaId: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: string;
  businessId?: string | null;
  connectedVia?: string | null;
  connectedAt?: string | null;
  tokenExpiresAt?: string | null;
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

function pegarBearerToken(
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
    pegarBearerToken(request);

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

function metaErrorMessage(
  error:
    MetaError |
    undefined,
  fallback: string
) {
  const message =
    error?.message ||
    fallback;

  const code =
    error?.code
      ? ` Código Meta: ${error.code}.`
      : "";

  return `${message}${code}`;
}

function criptografarToken(
  token: string
) {
  const secret =
    process.env
      .WHATSAPP_TOKEN_ENCRYPTION_KEY
      ?.trim();

  if (!secret) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY não configurada."
    );
  }

  const key =
    Buffer.from(
      secret,
      "base64"
    );

  if (
    key.length !==
    32
  ) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY precisa representar exatamente 32 bytes em Base64."
    );
  }

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        token,
        "utf8"
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

function calcularExpiracao(
  tokenResponse:
    MetaTokenResponse,
  debugResponse:
    MetaDebugResponse
) {
  const expiresAt =
    debugResponse.data
      ?.expires_at;

  if (
    typeof expiresAt ===
      "number" &&
    expiresAt > 0
  ) {
    return new Date(
      expiresAt * 1000
    ).toISOString();
  }

  const expiresIn =
    tokenResponse
      .expires_in;

  if (
    typeof expiresIn ===
      "number" &&
    expiresIn > 0
  ) {
    return new Date(
      Date.now() +
        expiresIn * 1000
    ).toISOString();
  }

  return null;
}

async function trocarCodigoPorToken(
  code: string,
  appId: string,
  appSecret: string,
  graphVersion: string
) {
  const url =
    new URL(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token`
    );

  url.searchParams.set(
    "client_id",
    appId
  );

  url.searchParams.set(
    "client_secret",
    appSecret
  );

  url.searchParams.set(
    "code",
    code
  );

  const response =
    await fetch(
      url,
      {
        method: "GET",
        cache: "no-store",
      }
    );

  const data =
    (
      await response
        .json()
    ) as MetaTokenResponse;

  if (
    !response.ok ||
    data.error ||
    !data.access_token
  ) {
    throw new Error(
      metaErrorMessage(
        data.error,
        "Não foi possível trocar o código do Cadastro Incorporado por uma credencial da Meta."
      )
    );
  }

  return data;
}

async function depurarToken(
  accessToken: string,
  appId: string,
  appSecret: string,
  graphVersion: string
) {
  const url =
    new URL(
      `https://graph.facebook.com/${graphVersion}/debug_token`
    );

  url.searchParams.set(
    "input_token",
    accessToken
  );

  /*
   * O App Access Token permanece somente
   * no backend. Nunca é enviado ao navegador.
   */
  const appAccessToken =
    `${appId}|${appSecret}`;

  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${appAccessToken}`,
        },
        cache: "no-store",
      }
    );

  const data =
    (
      await response
        .json()
    ) as MetaDebugResponse;

  if (
    !response.ok ||
    data.error
  ) {
    throw new Error(
      metaErrorMessage(
        data.error,
        "Não foi possível validar a credencial retornada pela Meta."
      )
    );
  }

  if (
    data.data
      ?.is_valid !==
    true
  ) {
    throw new Error(
      "A Meta retornou uma credencial inválida para o Cadastro Incorporado."
    );
  }

  if (
    data.data
      ?.app_id &&
    data.data.app_id !==
      appId
  ) {
    throw new Error(
      "A credencial retornada pertence a outro aplicativo Meta."
    );
  }

  return data;
}

function extrairWabaIds(
  debugResponse:
    MetaDebugResponse
) {
  const result =
    new Set<string>();

  for (
    const scope
    of debugResponse.data
      ?.granular_scopes ||
    []
  ) {
    if (
      ![
        "whatsapp_business_management",
        "whatsapp_business_messaging",
      ].includes(
        scope.scope ||
        ""
      )
    ) {
      continue;
    }

    for (
      const targetId
      of scope.target_ids ||
      []
    ) {
      if (targetId) {
        result.add(
          targetId
        );
      }
    }
  }

  return Array.from(
    result
  );
}

async function buscarTelefonesWaba(
  wabaId: string,
  accessToken: string,
  graphVersion: string
) {
  const url =
    new URL(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(
        wabaId
      )}/phone_numbers`
    );

  url.searchParams.set(
    "fields",
    "id,display_phone_number,verified_name,quality_rating"
  );

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
    ) as MetaPhoneNumbersResponse;

  if (
    !response.ok ||
    data.error
  ) {
    throw new Error(
      metaErrorMessage(
        data.error,
        `Não foi possível consultar os números do WABA ${wabaId}.`
      )
    );
  }

  return (
    data.data ||
    []
  );
}

async function buscarDetalheTelefone(
  phoneNumberId: string,
  accessToken: string,
  graphVersion: string
) {
  const url =
    new URL(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(
        phoneNumberId
      )}`
    );

  url.searchParams.set(
    "fields",
    "id,display_phone_number,verified_name,is_on_biz_app,platform_type"
  );

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
    ) as
      MetaPhoneNumber & {
        error?: MetaError;
      };

  if (
    !response.ok ||
    data.error
  ) {
    return null;
  }

  return data;
}

async function assinarWaba(
  wabaId: string,
  accessToken: string,
  graphVersion: string
) {
  const endpoint =
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(
      wabaId
    )}/subscribed_apps`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",
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
    ) as MetaSubscriptionResponse;

  if (
    !response.ok ||
    data.error
  ) {
    throw new Error(
      metaErrorMessage(
        data.error,
        "A conta foi autorizada, mas não foi possível assinar o WABA no webhook do CRM Zion."
      )
    );
  }

  if (
    data.success !==
      true &&
    data.success !==
      "true"
  ) {
    throw new Error(
      "A Meta não confirmou a assinatura do WABA no webhook do CRM Zion."
    );
  }
}

async function resolverTelefone(
  explicitWabaId:
    string | null,
  explicitPhoneNumberId:
    string | null,
  wabaIds:
    string[],
  accessToken:
    string,
  graphVersion:
    string
) {
  const candidatosWaba =
    explicitWabaId
      ? [explicitWabaId]
      : wabaIds;

  if (
    candidatosWaba.length ===
    0
  ) {
    throw new Error(
      "A Meta não informou nenhum WABA autorizado para esta conexão."
    );
  }

  const candidatos:
    Array<{
      wabaId: string;
      phone:
        MetaPhoneNumber;
    }> = [];

  for (
    const wabaId
    of candidatosWaba
  ) {
    const phones =
      await buscarTelefonesWaba(
        wabaId,
        accessToken,
        graphVersion
      );

    for (
      const phone
      of phones
    ) {
      candidatos.push({
        wabaId,
        phone,
      });
    }
  }

  if (
    explicitPhoneNumberId
  ) {
    const encontrado =
      candidatos.find(
        (item) =>
          item.phone.id ===
          explicitPhoneNumberId
      );

    if (!encontrado) {
      throw new Error(
        "O número retornado pelo Cadastro Incorporado não foi encontrado entre os ativos autorizados pela Meta."
      );
    }

    return encontrado;
  }

  if (
    candidatos.length ===
    1
  ) {
    return candidatos[0];
  }

  /*
   * No Coexistence a Meta pode concluir
   * o fluxo sem incluir phone_number_id
   * no postMessage. Tentamos identificar
   * de forma segura o único número que
   * continua no WhatsApp Business App.
   */
  const bizAppPhones:
    Array<{
      wabaId: string;
      phone:
        MetaPhoneNumber;
    }> = [];

  for (
    const candidato
    of candidatos
  ) {
    const detail =
      await buscarDetalheTelefone(
        candidato.phone.id,
        accessToken,
        graphVersion
      );

    if (
      detail
        ?.is_on_biz_app ===
      true
    ) {
      bizAppPhones.push({
        wabaId:
          candidato.wabaId,
        phone: {
          ...candidato.phone,
          ...detail,
        },
      });
    }
  }

  if (
    bizAppPhones.length ===
    1
  ) {
    return bizAppPhones[0];
  }

  const erro =
    new Error(
      "A Meta autorizou mais de um número e não foi possível identificar com segurança qual deles foi escolhido para o CRM."
    ) as Error & {
      candidates?: Array<{
        wabaId: string;
        phoneNumberId: string;
        displayPhoneNumber: string | null;
        verifiedName: string | null;
      }>;
      code?: string;
    };

  erro.code =
    "MULTIPLE_WHATSAPP_NUMBERS";

  erro.candidates =
    candidatos.map(
      (item) => ({
        wabaId:
          item.wabaId,
        phoneNumberId:
          item.phone.id,
        displayPhoneNumber:
          item.phone
            .display_phone_number ||
          null,
        verifiedName:
          item.phone
            .verified_name ||
          null,
      })
    );

  throw erro;
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

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "WhatsAppAccount"
        )
        .select(
          "id, companyId, wabaId, phoneNumberId, displayPhoneNumber, verifiedName, status, businessId, connectedVia, connectedAt, tokenExpiresAt"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .order(
          "createdAt",
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
      accounts:
        (
          data ||
          []
        ) as WhatsAppAccountRow[],

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
      "Erro ao carregar contas WhatsApp:",
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
            "Somente administradores podem conectar uma conta do WhatsApp.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (
        await request
          .json()
      ) as Record<
        string,
        unknown
      >;

    const code =
      typeof body.code ===
      "string"
        ? body.code.trim()
        : "";

    const receivedWabaId =
      typeof body.wabaId ===
      "string"
        ? body.wabaId.trim()
        : "";

    const receivedPhoneNumberId =
      typeof body
        .phoneNumberId ===
      "string"
        ? body
            .phoneNumberId
            .trim()
        : "";

    const businessId =
      typeof body.businessId ===
      "string"
        ? body
            .businessId
            .trim()
        : "";

    const onboardingEvent =
      typeof body
        .onboardingEvent ===
      "string"
        ? body
            .onboardingEvent
            .trim()
        : "";

    if (!code) {
      return NextResponse.json(
        {
          error:
            "Código do Cadastro Incorporado não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const appId =
      (
        process.env
          .META_APP_ID ||
        process.env
          .NEXT_PUBLIC_META_APP_ID ||
        ""
      ).trim();

    const appSecret =
      process.env
        .META_APP_SECRET
        ?.trim() ||
      "";

    const graphVersion =
      (
        process.env
          .WHATSAPP_GRAPH_VERSION ||
        "v26.0"
      ).trim();

    if (
      !appId ||
      !appSecret
    ) {
      return NextResponse.json(
        {
          error:
            "META_APP_ID/NEXT_PUBLIC_META_APP_ID ou META_APP_SECRET não configurados no servidor.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Fazemos a troca imediatamente.
     * O code é curto, de uso único,
     * e nunca é salvo no banco.
     */
    const tokenResponse =
      await trocarCodigoPorToken(
        code,
        appId,
        appSecret,
        graphVersion
      );

    const accessToken =
      tokenResponse
        .access_token as string;

    const debugResponse =
      await depurarToken(
        accessToken,
        appId,
        appSecret,
        graphVersion
      );

    const debugWabaIds =
      extrairWabaIds(
        debugResponse
      );

    if (
      receivedWabaId &&
      debugWabaIds.length > 0 &&
      !debugWabaIds.includes(
        receivedWabaId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "O WABA retornado pelo cadastro não pertence aos ativos autorizados pela Meta.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      wabaId,
      phone,
    } =
      await resolverTelefone(
        receivedWabaId ||
          null,
        receivedPhoneNumberId ||
          null,
        debugWabaIds,
        accessToken,
        graphVersion
      );

    /*
     * Impede que um número já pertencente
     * a outro tenant seja tomado por uma
     * nova conexão.
     */
    const {
      data:
        accountExisting,
      error:
        accountExistingError,
    } =
      await supabaseAdmin
        .from(
          "WhatsAppAccount"
        )
        .select(
          "id, companyId, phoneNumberId"
        )
        .eq(
          "phoneNumberId",
          phone.id
        )
        .maybeSingle();

    if (
      accountExistingError
    ) {
      return NextResponse.json(
        {
          error:
            accountExistingError
              .message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      accountExisting &&
      accountExisting
        .companyId !==
        currentUser.companyId
    ) {
      return NextResponse.json(
        {
          error:
            "Este número do WhatsApp já está conectado a outro ambiente do CRM Zion.",
        },
        {
          status: 409,
        }
      );
    }

    await assinarWaba(
      wabaId,
      accessToken,
      graphVersion
    );

    const encryptedToken =
      criptografarToken(
        accessToken
      );

    const tokenExpiresAt =
      calcularExpiracao(
        tokenResponse,
        debugResponse
      );

    const agora =
      new Date()
        .toISOString();

    const connectedVia =
      onboardingEvent ===
      "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
        ? "embedded_signup_coexistence"
        : "embedded_signup";

    const payload = {
      companyId:
        currentUser.companyId,

      wabaId,

      phoneNumberId:
        phone.id,

      displayPhoneNumber:
        phone
          .display_phone_number ||
        null,

      verifiedName:
        phone
          .verified_name ||
        null,

      status:
        "active",

      businessId:
        businessId ||
        null,

      accessTokenEncrypted:
        encryptedToken,

      tokenExpiresAt,

      connectedVia,

      connectedAt:
        agora,

      updatedAt:
        agora,
    };

    let account:
      WhatsAppAccountRow |
      null = null;

    if (accountExisting) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "WhatsAppAccount"
          )
          .update(
            payload
          )
          .eq(
            "id",
            accountExisting.id
          )
          .eq(
            "companyId",
            currentUser.companyId
          )
          .select(
            "id, companyId, wabaId, phoneNumberId, displayPhoneNumber, verifiedName, status, businessId, connectedVia, connectedAt, tokenExpiresAt"
          )
          .single();

      if (
        error ||
        !data
      ) {
        return NextResponse.json(
          {
            error:
              error?.message ||
              "Não foi possível atualizar a conta do WhatsApp no CRM.",
          },
          {
            status: 500,
          }
        );
      }

      account =
        data as WhatsAppAccountRow;
    } else {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "WhatsAppAccount"
          )
          .insert(
            payload
          )
          .select(
            "id, companyId, wabaId, phoneNumberId, displayPhoneNumber, verifiedName, status, businessId, connectedVia, connectedAt, tokenExpiresAt"
          )
          .single();

      if (
        error ||
        !data
      ) {
        return NextResponse.json(
          {
            error:
              error?.message ||
              "Não foi possível salvar a conta do WhatsApp no CRM.",
          },
          {
            status: 500,
          }
        );
      }

      account =
        data as WhatsAppAccountRow;
    }

    return NextResponse.json({
      message:
        "WhatsApp conectado ao CRM Zion com sucesso.",

      account,
    });
  } catch (error) {
    console.error(
      "Erro ao finalizar Cadastro Incorporado do WhatsApp:",
      error
    );

    const typedError =
      error as Error & {
        code?: string;
        candidates?: unknown;
      };

    if (
      typedError.code ===
      "MULTIPLE_WHATSAPP_NUMBERS"
    ) {
      return NextResponse.json(
        {
          error:
            typedError.message,
          code:
            typedError.code,
          candidates:
            typedError.candidates ||
            [],
        },
        {
          status: 409,
        }
      );
    }

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
