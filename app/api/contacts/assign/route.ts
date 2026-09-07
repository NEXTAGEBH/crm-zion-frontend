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

export async function PATCH(
  request: Request
) {
  try {
    const supabaseAdmin =
      getSupabaseAdmin();

    const token =
      pegarToken(request);

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Token não encontrado.",
        },
        {
          status: 401,
        }
      );
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
      return NextResponse.json(
        {
          error:
            "Sessão inválida.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: crmUser,
      error: crmUserError,
    } = await supabaseAdmin
      .from("User")
      .select(
        "id, role, companyId, isActive"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      crmUserError ||
      !crmUser
    ) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado no CRM.",
        },
        {
          status: 403,
        }
      );
    }

    if (!crmUser.isActive) {
      return NextResponse.json(
        {
          error:
            "Seu acesso está desativado.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      crmUser.role !== "admin" &&
      crmUser.role !== "zion_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Somente administradores podem atribuir responsáveis.",
        },
        {
          status: 403,
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
        crmUser.companyId
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
          status: 403,
        }
      );
    }

    if (!company.isActive) {
      return NextResponse.json(
        {
          error:
            "Esta conta está suspensa.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const contactId =
      typeof body.contactId === "string"
        ? body.contactId
        : "";

    const responsibleId =
      typeof body.responsibleId === "string" &&
      body.responsibleId.trim()
        ? body.responsibleId.trim()
        : null;

    if (!contactId) {
      return NextResponse.json(
        {
          error:
            "Contato não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: contact,
      error: contactError,
    } = await supabaseAdmin
      .from("Contact")
      .select(
        "id, companyId"
      )
      .eq(
        "id",
        contactId
      )
      .maybeSingle();

    if (
      contactError ||
      !contact
    ) {
      return NextResponse.json(
        {
          error:
            "Contato não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      contact.companyId !==
      crmUser.companyId
    ) {
      return NextResponse.json(
        {
          error:
            "Este contato não pertence ao seu ambiente.",
        },
        {
          status: 403,
        }
      );
    }

    let responsible = null;

    if (responsibleId) {
      const {
        data: targetUser,
        error: targetUserError,
      } = await supabaseAdmin
        .from("User")
        .select(
          "id, name, email, role, companyId, isActive"
        )
        .eq(
          "id",
          responsibleId
        )
        .maybeSingle();

      if (
        targetUserError ||
        !targetUser
      ) {
        return NextResponse.json(
          {
            error:
              "Responsável não encontrado.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        targetUser.companyId !==
        crmUser.companyId
      ) {
        return NextResponse.json(
          {
            error:
              "Este usuário pertence a outro ambiente.",
          },
          {
            status: 403,
          }
        );
      }

      if (!targetUser.isActive) {
        return NextResponse.json(
          {
            error:
              "Não é possível atribuir um lead a um usuário desativado.",
          },
          {
            status: 409,
          }
        );
      }

      responsible =
        targetUser;
    }

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("Contact")
      .update({
        responsibleId,
      })
      .eq(
        "id",
        contactId
      )
      .eq(
        "companyId",
        crmUser.companyId
      );

    if (updateError) {
      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      message:
        responsibleId
          ? "Responsável atribuído com sucesso."
          : "Responsável removido com sucesso.",

      responsible:
        responsible
          ? {
              id:
                responsible.id,

              name:
                responsible.name,

              email:
                responsible.email,
            }
          : null,
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