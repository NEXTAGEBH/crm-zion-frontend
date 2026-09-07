import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type StageType =
  | "open"
  | "won"
  | "lost";

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
    .replace(
      "Bearer ",
      ""
    )
    .trim();
}

function stageTypeValido(
  value: unknown
): value is StageType {
  return (
    value === "open" ||
    value === "won" ||
    value === "lost"
  );
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
      autorizado:
        false as const,

      response:
        NextResponse.json(
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
      autorizado:
        false as const,

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
    data: crmUser,
    error: crmUserError,
  } = await supabaseAdmin
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
    crmUserError ||
    !crmUser
  ) {
    return {
      autorizado:
        false as const,

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

  if (
    !crmUser.companyId
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Usuário sem empresa vinculada.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  if (!crmUser.isActive) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
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
    crmUser.role !==
      "zion_admin"
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Somente administradores podem gerenciar o funil.",
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
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Empresa não encontrada.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  if (!company.isActive) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
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

  /*
   * A partir daqui usamos
   * company.id validado no banco.
   *
   * Isso evita o problema que
   * gerou companyId = null.
   */
  return {
    autorizado:
      true as const,

    supabaseAdmin,

    currentUser:
      crmUser,

    companyId:
      company.id,
  };
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
        .from("FunnelStep")
        .select(
          "id, name, order, stageType, companyId"
        )
        .eq(
          "companyId",
          verificacao.companyId
        )
        .order(
          "order",
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
      steps: data || [],
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

    const stageType =
      body.stageType;

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Informe o nome da etapa.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      name.length > 60
    ) {
      return NextResponse.json(
        {
          error:
            "O nome da etapa deve possuir no máximo 60 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !stageTypeValido(
        stageType
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Tipo de etapa inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: ultimaEtapa,
      error:
        ultimaEtapaError,
    } =
      await verificacao.supabaseAdmin
        .from("FunnelStep")
        .select("order")
        .eq(
          "companyId",
          verificacao.companyId
        )
        .order(
          "order",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      ultimaEtapaError
    ) {
      return NextResponse.json(
        {
          error:
            ultimaEtapaError.message,
        },
        {
          status: 500,
        }
      );
    }

    const proximaOrdem =
      typeof ultimaEtapa?.order ===
      "number"
        ? ultimaEtapa.order +
          1
        : 0;

    const {
      data,
      error,
    } =
      await verificacao.supabaseAdmin
        .from("FunnelStep")
        .insert({
          name,

          order:
            proximaOrdem,

          stageType,

          companyId:
            verificacao.companyId,
        })
        .select(
          "id, name, order, stageType, companyId"
        )
        .single();

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

    return NextResponse.json(
      {
        message:
          "Etapa criada com sucesso.",

        step:
          data,
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

    const stepId =
      typeof body.stepId ===
      "string"
        ? body.stepId
        : "";

    const action =
      typeof body.action ===
      "string"
        ? body.action
        : "";

    if (!stepId) {
      return NextResponse.json(
        {
          error:
            "Etapa não informada.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: step,
      error: stepError,
    } =
      await verificacao.supabaseAdmin
        .from("FunnelStep")
        .select(
          "id, name, order, stageType, companyId"
        )
        .eq(
          "id",
          stepId
        )
        .eq(
          "companyId",
          verificacao.companyId
        )
        .maybeSingle();

    if (
      stepError ||
      !step
    ) {
      return NextResponse.json(
        {
          error:
            "Etapa não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      action === "update"
    ) {
      const name =
        typeof body.name ===
        "string"
          ? body.name.trim()
          : "";

      const stageType =
        body.stageType;

      if (!name) {
        return NextResponse.json(
          {
            error:
              "Informe o nome da etapa.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !stageTypeValido(
          stageType
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Tipo de etapa inválido.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error,
      } =
        await verificacao.supabaseAdmin
          .from("FunnelStep")
          .update({
            name,
            stageType,
          })
          .eq(
            "id",
            stepId
          )
          .eq(
            "companyId",
            verificacao.companyId
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
          "Etapa atualizada.",
      });
    }

    if (
      action === "move"
    ) {
      const direction =
        body.direction;

      if (
        direction !== "up" &&
        direction !== "down"
      ) {
        return NextResponse.json(
          {
            error:
              "Direção inválida.",
          },
          {
            status: 400,
          }
        );
      }

      let query =
        verificacao.supabaseAdmin
          .from("FunnelStep")
          .select(
            "id, order"
          )
          .eq(
            "companyId",
            verificacao.companyId
          );

      if (
        direction === "up"
      ) {
        query =
          query
            .lt(
              "order",
              step.order
            )
            .order(
              "order",
              {
                ascending: false,
              }
            );
      } else {
        query =
          query
            .gt(
              "order",
              step.order
            )
            .order(
              "order",
              {
                ascending: true,
              }
            );
      }

      const {
        data: neighbor,
        error:
          neighborError,
      } =
        await query
          .limit(1)
          .maybeSingle();

      if (
        neighborError
      ) {
        return NextResponse.json(
          {
            error:
              neighborError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (!neighbor) {
        return NextResponse.json({
          message:
            "A etapa já está no limite.",
        });
      }

      const ordemAtual =
        step.order;

      const ordemVizinha =
        neighbor.order;

      const tempOrder =
        -1000000;

      const primeiro =
        await verificacao.supabaseAdmin
          .from("FunnelStep")
          .update({
            order:
              tempOrder,
          })
          .eq(
            "id",
            step.id
          )
          .eq(
            "companyId",
            verificacao.companyId
          );

      if (
        primeiro.error
      ) {
        return NextResponse.json(
          {
            error:
              primeiro.error.message,
          },
          {
            status: 500,
          }
        );
      }

      const segundo =
        await verificacao.supabaseAdmin
          .from("FunnelStep")
          .update({
            order:
              ordemAtual,
          })
          .eq(
            "id",
            neighbor.id
          )
          .eq(
            "companyId",
            verificacao.companyId
          );

      if (
        segundo.error
      ) {
        await verificacao.supabaseAdmin
          .from("FunnelStep")
          .update({
            order:
              ordemAtual,
          })
          .eq(
            "id",
            step.id
          );

        return NextResponse.json(
          {
            error:
              segundo.error.message,
          },
          {
            status: 500,
          }
        );
      }

      const terceiro =
        await verificacao.supabaseAdmin
          .from("FunnelStep")
          .update({
            order:
              ordemVizinha,
          })
          .eq(
            "id",
            step.id
          )
          .eq(
            "companyId",
            verificacao.companyId
          );

      if (
        terceiro.error
      ) {
        return NextResponse.json(
          {
            error:
              terceiro.error.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        message:
          "Ordem atualizada.",
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

    const stepId =
      typeof body.stepId ===
      "string"
        ? body.stepId
        : "";

    if (!stepId) {
      return NextResponse.json(
        {
          error:
            "Etapa não informada.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: step,
      error: stepError,
    } =
      await verificacao.supabaseAdmin
        .from("FunnelStep")
        .select(
          "id, name"
        )
        .eq(
          "id",
          stepId
        )
        .eq(
          "companyId",
          verificacao.companyId
        )
        .maybeSingle();

    if (
      stepError ||
      !step
    ) {
      return NextResponse.json(
        {
          error:
            "Etapa não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      count:
        totalEtapas,
      error:
        totalError,
    } =
      await verificacao.supabaseAdmin
        .from("FunnelStep")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "companyId",
          verificacao.companyId
        );

    if (totalError) {
      return NextResponse.json(
        {
          error:
            totalError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      (totalEtapas || 0) <=
      1
    ) {
      return NextResponse.json(
        {
          error:
            "O funil precisa possuir pelo menos uma etapa.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      count,
      error:
        contatosError,
    } =
      await verificacao.supabaseAdmin
        .from("Contact")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "companyId",
          verificacao.companyId
        )
        .eq(
          "funnelStepId",
          stepId
        );

    if (
      contatosError
    ) {
      return NextResponse.json(
        {
          error:
            contatosError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      (count || 0) > 0
    ) {
      return NextResponse.json(
        {
          error:
            `A etapa "${step.name}" possui ${
              count || 0
            } lead(s). Mova os leads antes de excluir a etapa.`,
        },
        {
          status: 409,
        }
      );
    }

    const {
      error,
    } =
      await verificacao.supabaseAdmin
        .from("FunnelStep")
        .delete()
        .eq(
          "id",
          stepId
        )
        .eq(
          "companyId",
          verificacao.companyId
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
        "Etapa excluída.",
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