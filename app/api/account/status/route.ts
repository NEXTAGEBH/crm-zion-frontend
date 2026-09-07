import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request
) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          error:
            "Configuração administrativa não encontrada.",
        },
        {
          status: 500,
        }
      );
    }

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
      return NextResponse.json(
        {
          error:
            "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authorization
        .replace("Bearer ", "")
        .trim();

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      );

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
      error: userError,
    } = await supabaseAdmin
      .from("User")
      .select(
        "id, name, email, role, companyId, isActive, deactivatedReason"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      userError ||
      !crmUser
    ) {
      return NextResponse.json(
        {
          error:
            userError?.message ||
            "Usuário não encontrado no CRM.",
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
        "id, name, isActive, suspendedReason"
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
            companyError?.message ||
            "Ambiente não encontrado.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json({
      user: {
        id:
          crmUser.id,

        name:
          crmUser.name,

        email:
          crmUser.email,

        role:
          crmUser.role,

        isActive:
          crmUser.isActive,

        deactivatedReason:
          crmUser.deactivatedReason,
      },

      company: {
        id:
          company.id,

        name:
          company.name,

        isActive:
          company.isActive,

        suspendedReason:
          company.suspendedReason,
      },
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