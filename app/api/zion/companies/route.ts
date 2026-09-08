import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ConfigResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      supabaseUrl: string;
      serviceRoleKey: string;
      zionCompanyId: string;
      zionAdminEmails: string;
    };

function getConfig(): ConfigResult {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const zionCompanyId =
    process.env.ZION_COMPANY_ID;

  const zionAdminEmails =
    process.env.ZION_ADMIN_EMAILS;

  if (!supabaseUrl) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL não está configurada.",
    };
  }

  if (!serviceRoleKey) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY não está configurada.",
    };
  }

  if (!zionCompanyId) {
    return {
      ok: false,
      error:
        "ZION_COMPANY_ID não está configurado.",
    };
  }

  if (!zionAdminEmails) {
    return {
      ok: false,
      error:
        "ZION_ADMIN_EMAILS não está configurado.",
    };
  }

  return {
    ok: true,
    supabaseUrl,
    serviceRoleKey,
    zionCompanyId,
    zionAdminEmails,
  };
}

function criarSupabaseAdmin(
  supabaseUrl: string,
  serviceRoleKey: string
) {
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

function pegarToken(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return null;
  }

  return authorization
    .replace("Bearer ", "")
    .trim();
}

async function verificarAdminZion(
  request: Request
) {
  const config = getConfig();

  if (!config.ok) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error: config.error,
        },
        {
          status: 500,
        }
      ),
    };
  }

  const supabaseAdmin =
    criarSupabaseAdmin(
      config.supabaseUrl,
      config.serviceRoleKey
    );

  const token = pegarToken(request);

  if (!token) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Token de autenticação não encontrado.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            authError?.message ||
            "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: crmUser,
    error: crmUserError,
  } = await supabaseAdmin
    .from("User")
    .select(
      "id, name, email, role, companyId"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (crmUserError) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Erro ao buscar usuário no CRM: " +
            crmUserError.message,
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!crmUser) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Usuário não encontrado na tabela User.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  const emailsPermitidos =
    config.zionAdminEmails
      .split(",")
      .map((email) =>
        email.trim().toLowerCase()
      )
      .filter(Boolean);

  const emailAtual =
    (user.email || "").toLowerCase();

  if (
    crmUser.companyId !==
    config.zionCompanyId
  ) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Este usuário não pertence à Zion.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (
    !emailsPermitidos.includes(emailAtual)
  ) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Este usuário não possui acesso ao Painel Zion.",
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
    config,
    user,
  };
}

function slugify(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gerarSlugUnico(
  supabaseAdmin: ReturnType<typeof criarSupabaseAdmin>,
  base: string
) {
  const slugBase = slugify(base);

  let slug = slugBase;
  let contador = 2;

  while (true) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("Company")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(
        "Erro ao verificar slug: " +
          error.message
      );
    }

    if (!data) {
      return slug;
    }

    slug = `${slugBase}-${contador}`;

    contador += 1;
  }
}

export async function GET(
  request: Request
) {
  try {
    const verificacao =
      await verificarAdminZion(request);

    if (!verificacao.autorizado) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
      config,
    } = verificacao;

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("Company")
      .select(
        "id, name, slug, createdAt, isActive, suspendedAt, suspendedReason"
      )
      .order("createdAt", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const companies =
      (data || []).map((company) => ({
        ...company,

        isZionCore:
          company.id ===
          config.zionCompanyId,
      }));

    return NextResponse.json({
      companies,
    });
  } catch (error) {
    console.error(
      "Erro ao listar clientes:",
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
      await verificarAdminZion(request);

    if (!verificacao.autorizado) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
    } = verificacao;

    const body =
      await request.json();

    const clientName =
      typeof body.clientName === "string"
        ? body.clientName.trim()
        : "";

    const brandName =
      typeof body.brandName === "string"
        ? body.brandName.trim()
        : "";

    const adminName =
      typeof body.adminName === "string"
        ? body.adminName.trim()
        : "";

    const adminEmail =
      typeof body.adminEmail === "string"
        ? body.adminEmail
            .trim()
            .toLowerCase()
        : "";

    const adminPassword =
      typeof body.adminPassword === "string"
        ? body.adminPassword
        : "";

    if (
      !clientName ||
      !brandName ||
      !adminName ||
      !adminEmail ||
      !adminPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha todos os campos obrigatórios.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      adminPassword.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "A senha precisa possuir pelo menos 8 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    const workspaceName =
      `${clientName} | ${brandName}`;

    const slug =
      await gerarSlugUnico(
        supabaseAdmin,
        `${brandName}-${clientName}`
      );

    const {
      data: empresaCriada,
      error: erroEmpresa,
    } = await supabaseAdmin
      .from("Company")
      .insert({
        name: workspaceName,
        slug,
        isActive: true,
      })
      .select("*")
      .single();

    if (
      erroEmpresa ||
      !empresaCriada
    ) {
      return NextResponse.json(
        {
          error:
            erroEmpresa?.message ||
            "Não foi possível criar o ambiente.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,

          user_metadata: {
            name: adminName,
            clientName,
            brandName,
            companyId:
              empresaCriada.id,
          },
        }
      );

    if (
      authError ||
      !authData.user
    ) {
      await supabaseAdmin
        .from("Company")
        .delete()
        .eq(
          "id",
          empresaCriada.id
        );

      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Não foi possível criar o acesso do cliente.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: erroUser,
    } = await supabaseAdmin
      .from("User")
      .insert({
        id:
          authData.user.id,

        name:
          adminName,

        email:
          adminEmail,

        password:
          "SUPABASE_AUTH",

        role:
          "admin",

        companyId:
          empresaCriada.id,
      });

    if (erroUser) {
      await supabaseAdmin.auth.admin.deleteUser(
        authData.user.id
      );

      await supabaseAdmin
        .from("Company")
        .delete()
        .eq(
          "id",
          empresaCriada.id
        );

      return NextResponse.json(
        {
          error:
            "Erro ao criar usuário no CRM: " +
            erroUser.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Cliente criado com sucesso.",

        company:
          empresaCriada,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao criar cliente:",
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
      await verificarAdminZion(request);

    if (!verificacao.autorizado) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
      config,
    } = verificacao;

    const body =
      await request.json();

    const companyId =
      typeof body.companyId === "string"
        ? body.companyId
        : "";

    const action =
      typeof body.action === "string"
        ? body.action
        : "";

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (!companyId) {
      return NextResponse.json(
        {
          error:
            "ID da conta não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      companyId ===
      config.zionCompanyId
    ) {
      return NextResponse.json(
        {
          error:
            "A conta principal da Zion não pode ser suspensa.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      action !== "activate" &&
      action !== "suspend"
    ) {
      return NextResponse.json(
        {
          error:
            "Ação inválida.",
        },
        {
          status: 400,
        }
      );
    }

    const payload =
      action === "activate"
        ? {
            isActive: true,
            suspendedAt: null,
            suspendedReason: null,
          }
        : {
            isActive: false,

            suspendedAt:
              new Date().toISOString(),

            suspendedReason:
              reason ||
              "Conta suspensa pelo administrador.",
          };

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("Company")
      .update(payload)
      .eq("id", companyId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      message:
        action === "activate"
          ? "Conta reativada com sucesso."
          : "Conta suspensa com sucesso.",

      company: data,
    });
  } catch (error) {
    console.error(
      "Erro ao alterar status:",
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

export async function DELETE(
  request: Request
) {
  try {
    const verificacao =
      await verificarAdminZion(request);

    if (!verificacao.autorizado) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
      config,
    } = verificacao;

    const body =
      await request.json();

    const companyId =
      typeof body.companyId === "string"
        ? body.companyId
        : "";

    if (!companyId) {
      return NextResponse.json(
        {
          error:
            "ID da conta não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      companyId ===
      config.zionCompanyId
    ) {
      return NextResponse.json(
        {
          error:
            "A conta principal da Zion não pode ser excluída.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: users,
      error: usersError,
    } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq(
        "companyId",
        companyId
      );

    if (usersError) {
      return NextResponse.json(
        {
          error:
            "Erro ao localizar usuários do CRM: " +
            usersError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: profiles,
      error: profilesError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq(
        "company_id",
        companyId
      );

    if (profilesError) {
      return NextResponse.json(
        {
          error:
            "Erro ao localizar perfis: " +
            profilesError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: contactError,
    } = await supabaseAdmin
      .from("Contact")
      .delete()
      .eq(
        "companyId",
        companyId
      );

    if (contactError) {
      return NextResponse.json(
        {
          error:
            "Erro ao excluir contatos: " +
            contactError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: stepError,
    } = await supabaseAdmin
      .from("FunnelStep")
      .delete()
      .eq(
        "companyId",
        companyId
      );

    if (stepError) {
      return NextResponse.json(
        {
          error:
            "Erro ao excluir etapas do funil: " +
            stepError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: profileDeleteError,
    } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq(
        "company_id",
        companyId
      );

    if (profileDeleteError) {
      return NextResponse.json(
        {
          error:
            "Erro ao excluir profiles: " +
            profileDeleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: userDeleteError,
    } = await supabaseAdmin
      .from("User")
      .delete()
      .eq(
        "companyId",
        companyId
      );

    if (userDeleteError) {
      return NextResponse.json(
        {
          error:
            "Erro ao excluir usuários do CRM: " +
            userDeleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    const authIds = new Set<string>();

    for (
      const user of users || []
    ) {
      if (user.id) {
        authIds.add(
          user.id
        );
      }
    }

    for (
      const profile of
      profiles || []
    ) {
      if (profile.id) {
        authIds.add(
          profile.id
        );
      }
    }

    for (
      const authUserId of
      authIds
    ) {
      const {
        error: authDeleteError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          authUserId
        );

      if (
        authDeleteError
      ) {
        console.error(
          "Erro ao excluir usuário do Supabase Auth:",
          authUserId,
          authDeleteError.message
        );
      }
    }

    const {
      error: companyError,
    } = await supabaseAdmin
      .from("Company")
      .delete()
      .eq(
        "id",
        companyId
      );

    if (companyError) {
      return NextResponse.json(
        {
          error:
            "Erro ao excluir ambiente: " +
            companyError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      message:
        "Conta, usuários e dados excluídos definitivamente.",
    });
  } catch (error) {
    console.error(
      "Erro fatal ao excluir conta:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao excluir conta.",
      },
      {
        status: 500,
      }
    );
  }
}