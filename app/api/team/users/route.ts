import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function verificarAdministrador(
  request: Request
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const token =
    pegarToken(request);

  if (!token) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Token não encontrado.",
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
            "Sessão inválida.",
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
      "id, name, email, role, companyId, isActive"
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
            "Usuário não encontrado no CRM.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (!crmUser.isActive) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Seu acesso está desativado.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (
    crmUser.role !== "admin" &&
    crmUser.role !== "zion_admin"
  ) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Somente administradores podem gerenciar a equipe.",
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
  } = await supabaseAdmin
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
    !company
  ) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Ambiente não encontrado.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (!company.isActive) {
    return {
      autorizado: false as const,

      response: NextResponse.json(
        {
          error:
            "Esta conta está suspensa.",
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

    company,
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
      await verificarAdministrador(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
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
          verificacao.currentUser.companyId
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
      company: {
        id:
          verificacao.company.id,

        name:
          verificacao.company.name,
      },

      currentUserId:
        verificacao.currentUser.id,

      users:
        data || [],
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
      await verificarAdministrador(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const body =
      await request.json();

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
      typeof body.password === "string"
        ? body.password
        : "";

    const role =
      body.role === "admin"
        ? "admin"
        : "atendente";

    if (
      !name ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha nome, email e senha.",
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
      data: authData,
      error: authError,
    } =
      await verificacao.supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,

          email_confirm: true,

          user_metadata: {
            name,

            role,

            companyId:
              verificacao.currentUser.companyId,
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
            "Não foi possível criar o usuário.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error: userError,
    } =
      await verificacao.supabaseAdmin
        .from("User")
        .insert({
          id:
            authData.user.id,

          name,

          email,

          password:
            "SUPABASE_AUTH",

          role,

          companyId:
            verificacao.currentUser.companyId,

          isActive:
            true,
        });

    if (userError) {
      await verificacao.supabaseAdmin.auth.admin.deleteUser(
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
      await verificarAdministrador(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const body =
      await request.json();

    const userId =
      typeof body.userId === "string"
        ? body.userId
        : "";

    const action =
      typeof body.action === "string"
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
    } =
      await verificacao.supabaseAdmin
        .from("User")
        .select(
          "id, name, email, role, companyId, isActive"
        )
        .eq(
          "id",
          userId
        )
        .eq(
          "companyId",
          verificacao.currentUser.companyId
        )
        .maybeSingle();

    if (
      targetError ||
      !target
    ) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado neste ambiente.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      action ===
      "reset_password"
    ) {
      if (
        target.id ===
        verificacao.currentUser.id
      ) {
        return NextResponse.json(
          {
            error:
              "Você não pode redefinir sua própria senha por esta área.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        target.role ===
          "zion_admin" &&
        verificacao.currentUser.role !==
          "zion_admin"
      ) {
        return NextResponse.json(
          {
            error:
              "A senha do Administrador Zion não pode ser alterada por esta área.",
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
        await verificacao.supabaseAdmin.auth.admin.updateUserById(
          target.id,
          {
            password,
          }
        );

      if (passwordError) {
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
      target.id ===
        verificacao.currentUser.id &&
      action === "deactivate"
    ) {
      return NextResponse.json(
        {
          error:
            "Você não pode desativar o próprio acesso.",
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
        target.role === "zion_admin"
      ) {
        return NextResponse.json(
          {
            error:
              "O Administrador Zion não pode ser alterado por esta área.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        target.role === "admin" &&
        role !== "admin" &&
        target.isActive
      ) {
        const outroAdmin =
          await existeOutroAdminAtivo(
            verificacao.supabaseAdmin,
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
      } =
        await verificacao.supabaseAdmin
          .from("User")
          .update({
            role,
          })
          .eq(
            "id",
            target.id
          )
          .eq(
            "companyId",
            verificacao.currentUser.companyId
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
          "Função atualizada.",
      });
    }

    if (
      action === "deactivate"
    ) {
      if (
        target.role === "zion_admin"
      ) {
        return NextResponse.json(
          {
            error:
              "O Administrador Zion não pode ser desativado por esta área.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        target.role === "admin" &&
        target.isActive
      ) {
        const outroAdmin =
          await existeOutroAdminAtivo(
            verificacao.supabaseAdmin,
            target.companyId,
            target.id
          );

        if (!outroAdmin) {
          return NextResponse.json(
            {
              error:
                "Não é possível desativar o único administrador ativo.",
            },
            {
              status: 409,
            }
          );
        }
      }

      const reason =
        typeof body.reason === "string"
          ? body.reason.trim()
          : "";

      const {
        error,
      } =
        await verificacao.supabaseAdmin
          .from("User")
          .update({
            isActive:
              false,

            deactivatedAt:
              new Date().toISOString(),

            deactivatedReason:
              reason ||
              "Acesso desativado pelo administrador.",
          })
          .eq(
            "id",
            target.id
          )
          .eq(
            "companyId",
            verificacao.currentUser.companyId
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
      action === "activate"
    ) {
      const {
        error,
      } =
        await verificacao.supabaseAdmin
          .from("User")
          .update({
            isActive:
              true,

            deactivatedAt:
              null,

            deactivatedReason:
              null,
          })
          .eq(
            "id",
            target.id
          )
          .eq(
            "companyId",
            verificacao.currentUser.companyId
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
      await verificarAdministrador(
        request
      );

    if (
      !verificacao.autorizado
    ) {
      return verificacao.response;
    }

    const body =
      await request.json();

    const userId =
      typeof body.userId === "string"
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
      verificacao.currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "Você não pode excluir o próprio acesso.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: target,
      error: targetError,
    } =
      await verificacao.supabaseAdmin
        .from("User")
        .select(
          "id, role, companyId, isActive"
        )
        .eq(
          "id",
          userId
        )
        .eq(
          "companyId",
          verificacao.currentUser.companyId
        )
        .maybeSingle();

    if (
      targetError ||
      !target
    ) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado neste ambiente.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      target.role ===
      "zion_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "O Administrador Zion não pode ser excluído por esta área.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      target.role === "admin" &&
      target.isActive
    ) {
      const outroAdmin =
        await existeOutroAdminAtivo(
          verificacao.supabaseAdmin,
          target.companyId,
          target.id
        );

      if (!outroAdmin) {
        return NextResponse.json(
          {
            error:
              "Não é possível excluir o único administrador ativo.",
          },
          {
            status: 409,
          }
        );
      }
    }

    const {
      error: contactError,
    } =
      await verificacao.supabaseAdmin
        .from("Contact")
        .update({
          responsibleId:
            null,
        })
        .eq(
          "responsibleId",
          target.id
        )
        .eq(
          "companyId",
          verificacao.currentUser.companyId
        );

    if (contactError) {
      return NextResponse.json(
        {
          error:
            "Erro ao remover responsabilidades dos contatos: " +
            contactError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: profileError,
    } =
      await verificacao.supabaseAdmin
        .from("profiles")
        .delete()
        .eq(
          "id",
          target.id
        );

    if (profileError) {
      console.error(
        "Erro ao excluir profile:",
        profileError.message
      );
    }

    const {
      error: userError,
    } =
      await verificacao.supabaseAdmin
        .from("User")
        .delete()
        .eq(
          "id",
          target.id
        )
        .eq(
          "companyId",
          verificacao.currentUser.companyId
        );

    if (userError) {
      return NextResponse.json(
        {
          error:
            userError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: authDeleteError,
    } =
      await verificacao.supabaseAdmin.auth.admin.deleteUser(
        target.id
      );

    if (authDeleteError) {
      console.error(
        "Erro ao excluir usuário do Auth:",
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