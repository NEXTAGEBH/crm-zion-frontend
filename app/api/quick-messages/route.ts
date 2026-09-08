import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CurrentUser = {
  id: string;
  role: string;
  companyId: string;
  isActive: boolean;
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
        "id, role, companyId, isActive"
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
              "Usuário não encontrado.",
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

  const {
    data: company,
    error: companyError,
  } =
    await supabaseAdmin
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

function podeGerenciar(
  role: string
) {
  return [
    "admin",
    "zion_admin",
  ].includes(role);
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

    const onlyActive =
      url.searchParams.get(
        "active"
      ) === "true";

    let query =
      supabaseAdmin
        .from("QuickMessage")
        .select(
          "id, companyId, title, body, shortcut, isActive, createdAt, updatedAt"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .order(
          "title",
          {
            ascending: true,
          }
        );

    if (onlyActive) {
      query =
        query.eq(
          "isActive",
          true
        );
    }

    const {
      data,
      error,
    } =
      await query;

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
      quickMessages:
        data || [],

      canManage:
        podeGerenciar(
          currentUser.role
        ),
    });
  } catch (error) {
    console.error(
      "Erro ao listar mensagens rápidas:",
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
      !podeGerenciar(
        currentUser.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Você não possui permissão para criar mensagens rápidas.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const title =
      typeof body.title ===
      "string"
        ? body.title.trim()
        : "";

    const messageBody =
      typeof body.body ===
      "string"
        ? body.body.trim()
        : "";

    let shortcut =
      typeof body.shortcut ===
      "string"
        ? body.shortcut.trim()
        : "";

    if (
      !title ||
      !messageBody
    ) {
      return NextResponse.json(
        {
          error:
            "Título e mensagem são obrigatórios.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      shortcut &&
      !shortcut.startsWith("/")
    ) {
      shortcut =
        `/${shortcut}`;
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("QuickMessage")
        .insert({
          companyId:
            currentUser.companyId,

          title,

          body:
            messageBody,

          shortcut:
            shortcut ||
            null,

          isActive:
            true,
        })
        .select(
          "id, companyId, title, body, shortcut, isActive, createdAt, updatedAt"
        )
        .single();

    if (
      error ||
      !data
    ) {
      return NextResponse.json(
        {
          error:
            error
              ?.message ||
            "Não foi possível criar a mensagem rápida.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        quickMessage:
          data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao criar mensagem rápida:",
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
      !podeGerenciar(
        currentUser.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Você não possui permissão para editar mensagens rápidas.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const id =
      typeof body.id ===
      "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const updates:
      Record<
        string,
        unknown
      > = {
        updatedAt:
          new Date()
            .toISOString(),
      };

    if (
      typeof body.title ===
      "string"
    ) {
      const title =
        body.title.trim();

      if (!title) {
        return NextResponse.json(
          {
            error:
              "Título inválido.",
          },
          {
            status: 400,
          }
        );
      }

      updates.title =
        title;
    }

    if (
      typeof body.body ===
      "string"
    ) {
      const messageBody =
        body.body.trim();

      if (!messageBody) {
        return NextResponse.json(
          {
            error:
              "Mensagem inválida.",
          },
          {
            status: 400,
          }
        );
      }

      updates.body =
        messageBody;
    }

    if (
      body.shortcut !==
      undefined
    ) {
      let shortcut =
        typeof body.shortcut ===
        "string"
          ? body.shortcut.trim()
          : "";

      if (
        shortcut &&
        !shortcut.startsWith("/")
      ) {
        shortcut =
          `/${shortcut}`;
      }

      updates.shortcut =
        shortcut ||
        null;
    }

    if (
      typeof body.isActive ===
      "boolean"
    ) {
      updates.isActive =
        body.isActive;
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("QuickMessage")
        .update(
          updates
        )
        .eq(
          "id",
          id
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .select(
          "id, companyId, title, body, shortcut, isActive, createdAt, updatedAt"
        )
        .maybeSingle();

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

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Mensagem rápida não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      quickMessage:
        data,
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar mensagem rápida:",
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
      !podeGerenciar(
        currentUser.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Você não possui permissão para excluir mensagens rápidas.",
        },
        {
          status: 403,
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    const id =
      url.searchParams.get(
        "id"
      );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
      count,
    } =
      await supabaseAdmin
        .from("QuickMessage")
        .delete({
          count:
            "exact",
        })
        .eq(
          "id",
          id
        )
        .eq(
          "companyId",
          currentUser.companyId
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

    if (
      !count
    ) {
      return NextResponse.json(
        {
          error:
            "Mensagem rápida não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      message:
        "Mensagem rápida excluída.",
    });
  } catch (error) {
    console.error(
      "Erro ao excluir mensagem rápida:",
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