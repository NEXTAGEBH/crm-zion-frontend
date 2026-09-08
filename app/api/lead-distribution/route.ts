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

type DistributionUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
};

type DistributionMember = {
  id: string;
  companyId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
};

type DistributionSetting = {
  companyId: string;
  enabled: boolean;
  strategy: string;
  lastAssignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
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
    .replace(
      "Bearer ",
      ""
    )
    .trim();
}

function podeGerenciar(
  role: string
) {
  return [
    "admin",
    "zion_admin",
  ].includes(role);
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
      autorizado:
        false as const,

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

  const crmUser =
    currentUser as CurrentUser;

  if (!crmUser.isActive) {
    return {
      autorizado:
        false as const,

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
    !podeGerenciar(
      crmUser.role
    )
  ) {
    return {
      autorizado:
        false as const,

      response:
        NextResponse.json(
          {
            error:
              "Você não possui permissão para gerenciar a distribuição de leads.",
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
      autorizado:
        false as const,

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
    autorizado:
      true as const,

    supabaseAdmin,

    currentUser:
      crmUser,

    company,
  };
}

function calcularProximoUsuario(
  users: DistributionUser[],
  activeMemberIds: string[],
  lastAssignedUserId:
    string | null
) {
  /*
   * O trigger do banco ordena
   * os usuários pelo UUID.
   *
   * Mantemos exatamente a mesma
   * regra aqui para que a previsão
   * do próximo usuário seja correta.
   */
  const participantes =
    users
      .filter(
        (user) =>
          activeMemberIds.includes(
            user.id
          )
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id
          )
      );

  if (
    participantes.length ===
    0
  ) {
    return null;
  }

  if (
    !lastAssignedUserId
  ) {
    return participantes[0];
  }

  const indiceAtual =
    participantes.findIndex(
      (user) =>
        user.id ===
        lastAssignedUserId
    );

  if (
    indiceAtual === -1 ||
    indiceAtual ===
      participantes.length - 1
  ) {
    return participantes[0];
  }

  return participantes[
    indiceAtual + 1
  ];
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

    const [
      settingResult,
      membersResult,
      usersResult,
    ] =
      await Promise.all([
        supabaseAdmin
          .from(
            "LeadDistributionSetting"
          )
          .select(
            "companyId, enabled, strategy, lastAssignedUserId, createdAt, updatedAt"
          )
          .eq(
            "companyId",
            currentUser.companyId
          )
          .maybeSingle(),

        supabaseAdmin
          .from(
            "LeadDistributionMember"
          )
          .select(
            "id, companyId, userId, isActive, createdAt"
          )
          .eq(
            "companyId",
            currentUser.companyId
          ),

        supabaseAdmin
          .from("User")
          .select(
            "id, name, email, role, isActive"
          )
          .eq(
            "companyId",
            currentUser.companyId
          )
          .eq(
            "isActive",
            true
          )
          .in(
            "role",
            [
              "admin",
              "atendente",
            ]
          )
          .order(
            "name",
            {
              ascending: true,
            }
          ),
      ]);

    if (
      settingResult.error
    ) {
      return NextResponse.json(
        {
          error:
            settingResult.error
              .message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      membersResult.error
    ) {
      return NextResponse.json(
        {
          error:
            membersResult.error
              .message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      usersResult.error
    ) {
      return NextResponse.json(
        {
          error:
            usersResult.error
              .message,
        },
        {
          status: 500,
        }
      );
    }

    const setting =
      settingResult.data as
        | DistributionSetting
        | null;

    const members =
      (
        membersResult.data ||
        []
      ) as DistributionMember[];

    const users =
      (
        usersResult.data ||
        []
      ) as DistributionUser[];

    const activeMemberIds =
      members
        .filter(
          (member) =>
            member.isActive
        )
        .map(
          (member) =>
            member.userId
        );

    const nextUser =
      calcularProximoUsuario(
        users,
        activeMemberIds,
        setting
          ?.lastAssignedUserId ||
          null
      );

    return NextResponse.json({
      setting: {
        enabled:
          setting?.enabled ??
          false,

        strategy:
          setting?.strategy ||
          "round_robin",

        lastAssignedUserId:
          setting
            ?.lastAssignedUserId ||
          null,
      },

      members:
        activeMemberIds,

      users,

      nextUser,

      canManage:
        true,
    });
  } catch (error) {
    console.error(
      "Erro ao carregar distribuição de leads:",
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

    const body =
      await request.json();

    if (
      typeof body.enabled !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "O campo enabled é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const strategy =
      typeof body.strategy ===
      "string"
        ? body.strategy.trim()
        : "round_robin";

    if (
      strategy !==
      "round_robin"
    ) {
      return NextResponse.json(
        {
          error:
            "Estratégia de distribuição inválida.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        body.memberIds
      )
    ) {
      return NextResponse.json(
        {
          error:
            "memberIds deve ser uma lista.",
        },
        {
          status: 400,
        }
      );
    }

    const memberIds =
      Array.from(
        new Set(
          body.memberIds.filter(
            (
              value: unknown
            ) =>
              typeof value ===
                "string" &&
              value.trim()
          )
        )
      ) as string[];

    /*
     * Busca os usuários realmente
     * elegíveis dentro da empresa.
     */
    const {
      data: eligibleUsers,
      error:
        eligibleUsersError,
    } =
      await supabaseAdmin
        .from("User")
        .select(
          "id, name, email, role, isActive"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .eq(
          "isActive",
          true
        )
        .in(
          "role",
          [
            "admin",
            "atendente",
          ]
        );

    if (
      eligibleUsersError
    ) {
      return NextResponse.json(
        {
          error:
            eligibleUsersError.message,
        },
        {
          status: 500,
        }
      );
    }

    const users =
      (
        eligibleUsers ||
        []
      ) as DistributionUser[];

    const eligibleIds =
      new Set(
        users.map(
          (user) =>
            user.id
        )
      );

    /*
     * Impede enviar IDs de outra
     * empresa ou usuários inativos.
     */
    const membroInvalido =
      memberIds.find(
        (id) =>
          !eligibleIds.has(id)
      );

    if (
      membroInvalido
    ) {
      return NextResponse.json(
        {
          error:
            "Um dos usuários selecionados é inválido, inativo ou pertence a outra empresa.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Não faz sentido ativar a
     * distribuição sem participantes.
     */
    if (
      body.enabled &&
      memberIds.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Selecione pelo menos um participante antes de ativar a distribuição automática.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: currentSetting,
      error:
        currentSettingError,
    } =
      await supabaseAdmin
        .from(
          "LeadDistributionSetting"
        )
        .select(
          "companyId, enabled, strategy, lastAssignedUserId, createdAt, updatedAt"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .maybeSingle();

    if (
      currentSettingError
    ) {
      return NextResponse.json(
        {
          error:
            currentSettingError
              .message,
        },
        {
          status: 500,
        }
      );
    }

    const lastAssignedUserId =
      currentSetting
        ?.lastAssignedUserId ||
      null;

    const manterUltimoUsuario =
      lastAssignedUserId &&
      memberIds.includes(
        lastAssignedUserId
      );

    /*
     * Cria ou atualiza a
     * configuração principal.
     */
    const {
      error: settingError,
    } =
      await supabaseAdmin
        .from(
          "LeadDistributionSetting"
        )
        .upsert(
          {
            companyId:
              currentUser.companyId,

            enabled:
              body.enabled,

            strategy:
              "round_robin",

            lastAssignedUserId:
              manterUltimoUsuario
                ? lastAssignedUserId
                : null,

            updatedAt:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "companyId",
          }
        );

    if (
      settingError
    ) {
      return NextResponse.json(
        {
          error:
            settingError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Primeiro desativa todos.
     *
     * Depois reativa apenas
     * os selecionados.
     *
     * Isso mantém histórico sem
     * precisar apagar registros.
     */
    const {
      error:
        deactivateError,
    } =
      await supabaseAdmin
        .from(
          "LeadDistributionMember"
        )
        .update({
          isActive:
            false,
        })
        .eq(
          "companyId",
          currentUser.companyId
        );

    if (
      deactivateError
    ) {
      return NextResponse.json(
        {
          error:
            deactivateError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      memberIds.length > 0
    ) {
      const registros =
        memberIds.map(
          (userId) => ({
            companyId:
              currentUser.companyId,

            userId,

            isActive:
              true,
          })
        );

      const {
        error:
          membersError,
      } =
        await supabaseAdmin
          .from(
            "LeadDistributionMember"
          )
          .upsert(
            registros,
            {
              onConflict:
                "companyId,userId",
            }
          );

      if (
        membersError
      ) {
        return NextResponse.json(
          {
            error:
              membersError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

    /*
     * Busca novamente a configuração
     * para devolver o estado final.
     */
    const {
      data: finalSetting,
      error:
        finalSettingError,
    } =
      await supabaseAdmin
        .from(
          "LeadDistributionSetting"
        )
        .select(
          "companyId, enabled, strategy, lastAssignedUserId, createdAt, updatedAt"
        )
        .eq(
          "companyId",
          currentUser.companyId
        )
        .single();

    if (
      finalSettingError
    ) {
      return NextResponse.json(
        {
          error:
            finalSettingError.message,
        },
        {
          status: 500,
        }
      );
    }

    const nextUser =
      body.enabled
        ? calcularProximoUsuario(
            users,
            memberIds,
            finalSetting
              .lastAssignedUserId ||
              null
          )
        : null;

    return NextResponse.json({
      message:
        body.enabled
          ? "Distribuição automática ativada."
          : "Distribuição automática desativada.",

      setting: {
        enabled:
          finalSetting.enabled,

        strategy:
          finalSetting.strategy,

        lastAssignedUserId:
          finalSetting
            .lastAssignedUserId ||
          null,
      },

      members:
        memberIds,

      users,

      nextUser,
    });
  } catch (error) {
    console.error(
      "Erro ao salvar distribuição de leads:",
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