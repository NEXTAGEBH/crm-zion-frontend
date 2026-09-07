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
        "NEXT_PUBLIC_SUPABASE_URL não configurada.",
    };
  }

  if (!serviceRoleKey) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY não configurada.",
    };
  }

  if (!zionCompanyId) {
    return {
      ok: false,
      error:
        "ZION_COMPANY_ID não configurado.",
    };
  }

  if (!zionAdminEmails) {
    return {
      ok: false,
      error:
        "ZION_ADMIN_EMAILS não configurado.",
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

  const token =
    pegarToken(request);

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
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (
    authError ||
    !user
  ) {
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

  if (
    crmUserError ||
    !crmUser
  ) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            crmUserError?.message ||
            "Usuário não encontrado no CRM.",
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
      config.zionCompanyId ||
    !emailsPermitidos.includes(
      emailAtual
    )
  ) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Usuário sem permissão para o Painel Zion.",
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
    adminUser: user,
  };
}

async function existeOutroAdminAtivo(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  companyId: string,
  userId: string
) {
  const {
    count,
    error,
  } = await supabaseAdmin
    .from("User")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "companyId",
      companyId
    )
    .eq(
      "role",
      "admin"
    )
    .eq(
      "isActive",
      true
    )
    .neq(
      "id",
      userId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (count || 0) > 0;
}

export async function GET(
  request: Request
) {
  try {
    const verificacao =
      await verificarAdminZion(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const url =
      new URL(request.url);

    const companyId =
      url.searchParams.get(
        "companyId"
      );

    if (!companyId) {
      return NextResponse.json(
        {
          error:
            "companyId não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data,
      error,
    } =
      await verificacao.supabaseAdmin
        .from("User")
        .select(
          "id, name, email, role, companyId, isActive, deactivatedAt, deactivatedReason"
        )
        .eq(
          "companyId",
          companyId
        )
        .order(
          "name",
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
      users: data || [],
    });
  } catch (error) {
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
      await verificarAdminZion(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
    } = verificacao;

    const body =
      await request.json();

    const companyId =
      typeof body.companyId ===
      "string"
        ? body.companyId
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    const role =
      body.role === "admin"
        ? "admin"
        : "atendente";

    if (
      !companyId ||
      !name ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha todos os campos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length < 8
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

    const {
      data: company,
      error: companyError,
    } = await supabaseAdmin
      .from("Company")
      .select(
        "id, isActive"
      )
      .eq(
        "id",
        companyId
      )
      .maybeSingle();

    if (
      companyError ||
      !company
    ) {
      return NextResponse.json(
        {
          error:
            "Ambiente não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (!company.isActive) {
      return NextResponse.json(
        {
          error:
            "Não é possível adicionar usuários a uma conta suspensa.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,

          user_metadata: {
            name,
            role,
            companyId,
          },
        }
      );

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Não foi possível criar o acesso.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error: userError,
    } = await supabaseAdmin
      .from("User")
      .insert({
        id:
          authData.user.id,

        name,
        email,

        password:
          "SUPABASE_AUTH",

        role,
        companyId,
        isActive: true,
      });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(
        authData.user.id
      );

      return NextResponse.json(
        {
          error:
            "Erro ao criar usuário no CRM: " +
            userError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Usuário criado com sucesso.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
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
      await verificarAdminZion(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
      adminUser,
    } = verificacao;

    const body =
      await request.json();

    const userId =
      typeof body.userId ===
      "string"
        ? body.userId
        : "";

    const action =
      typeof body.action ===
      "string"
        ? body.action
        : "";

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Usuário não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: target,
      error: targetError,
    } = await supabaseAdmin
      .from("User")
      .select(
        "id, name, email, role, companyId, isActive"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (
      targetError ||
      !target
    ) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      Redefinição de senha pelo
      Administrador Zion.
    */
    if (
      action ===
      "reset_password"
    ) {
      if (
        userId ===
        adminUser.id
      ) {
        return NextResponse.json(
          {
            error:
              "Sua própria senha não pode ser redefinida por esta área.",
          },
          {
            status: 403,
          }
        );
      }

      const password =
        typeof body.password ===
        "string"
          ? body.password
          : "";

      if (
        password.length < 8
      ) {
        return NextResponse.json(
          {
            error:
              "A nova senha precisa possuir pelo menos 8 caracteres.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error:
          passwordError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          target.id,
          {
            password,
          }
        );

      if (
        passwordError
      ) {
        return NextResponse.json(
          {
            error:
              passwordError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        message:
          "Senha redefinida com sucesso.",
      });
    }

    if (
      userId ===
        adminUser.id &&
      action ===
        "deactivate"
    ) {
      return NextResponse.json(
        {
          error:
            "Você não pode desativar o seu próprio acesso.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      action === "role"
    ) {
      const role =
        body.role === "admin"
          ? "admin"
          : "atendente";

      if (
        target.role ===
          "admin" &&
        role !== "admin" &&
        target.isActive
      ) {
        const outroAdmin =
          await existeOutroAdminAtivo(
            supabaseAdmin,
            target.companyId,
            target.id
          );

        if (!outroAdmin) {
          return NextResponse.json(
            {
              error:
                "A conta precisa possuir pelo menos um administrador ativo.",
            },
            {
              status: 409,
            }
          );
        }
      }

      const {
        error,
      } = await supabaseAdmin
        .from("User")
        .update({
          role,
        })
        .eq(
          "id",
          userId
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
          "Função atualizada com sucesso.",
      });
    }

    if (
      action ===
      "deactivate"
    ) {
      if (
        target.role ===
          "admin" &&
        target.isActive
      ) {
        const outroAdmin =
          await existeOutroAdminAtivo(
            supabaseAdmin,
            target.companyId,
            target.id
          );

        if (!outroAdmin) {
          return NextResponse.json(
            {
              error:
                "Não é possível desativar o único administrador ativo desta conta.",
            },
            {
              status: 409,
            }
          );
        }
      }

      const reason =
        typeof body.reason ===
        "string"
          ? body.reason.trim()
          : "";

      const {
        error,
      } = await supabaseAdmin
        .from("User")
        .update({
          isActive: false,

          deactivatedAt:
            new Date().toISOString(),

          deactivatedReason:
            reason ||
            "Acesso desativado pelo administrador.",
        })
        .eq(
          "id",
          userId
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
          "Usuário desativado.",
      });
    }

    if (
      action ===
      "activate"
    ) {
      const {
        error,
      } = await supabaseAdmin
        .from("User")
        .update({
          isActive: true,
          deactivatedAt: null,
          deactivatedReason: null,
        })
        .eq(
          "id",
          userId
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
          "Usuário reativado.",
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
      await verificarAdminZion(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const {
      supabaseAdmin,
      adminUser,
    } = verificacao;

    const body =
      await request.json();

    const userId =
      typeof body.userId ===
      "string"
        ? body.userId
        : "";

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Usuário não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      userId ===
      adminUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "Você não pode excluir seu próprio acesso.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: target,
      error: targetError,
    } = await supabaseAdmin
      .from("User")
      .select(
        "id, role, companyId, isActive"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (
      targetError ||
      !target
    ) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      target.role ===
        "admin" &&
      target.isActive
    ) {
      const outroAdmin =
        await existeOutroAdminAtivo(
          supabaseAdmin,
          target.companyId,
          target.id
        );

      if (!outroAdmin) {
        return NextResponse.json(
          {
            error:
              "Não é possível excluir o único administrador ativo desta conta.",
          },
          {
            status: 409,
          }
        );
      }
    }

    const {
      error: contactsError,
    } = await supabaseAdmin
      .from("Contact")
      .update({
        responsibleId: null,
      })
      .eq(
        "responsibleId",
        userId
      );

    if (contactsError) {
      return NextResponse.json(
        {
          error:
            "Erro ao remover atribuições dos contatos: " +
            contactsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error:
        profileDeleteError,
    } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq(
        "id",
        userId
      );

    if (
      profileDeleteError
    ) {
      console.error(
        "Erro ao excluir profile:",
        profileDeleteError.message
      );
    }

    const {
      error:
        userDeleteError,
    } = await supabaseAdmin
      .from("User")
      .delete()
      .eq(
        "id",
        userId
      );

    if (
      userDeleteError
    ) {
      return NextResponse.json(
        {
          error:
            userDeleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error:
        authDeleteError,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

    if (
      authDeleteError
    ) {
      console.error(
        "Erro ao excluir usuário do Supabase Auth:",
        authDeleteError.message
      );
    }

    return NextResponse.json({
      message:
        "Usuário excluído com sucesso.",
    });
  } catch (error) {
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