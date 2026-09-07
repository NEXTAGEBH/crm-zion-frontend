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

function dataSaoPaulo(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Sao_Paulo",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

export async function GET(
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
        "id, name, email, role, companyId, isActive"
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

    if (
      !crmUser.isActive
    ) {
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
      !crmUser.companyId
    ) {
      return NextResponse.json(
        {
          error:
            "Usuário sem ambiente vinculado.",
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
      return NextResponse.json(
        {
          error:
            "Empresa não encontrada.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      !company.isActive
    ) {
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

    let contactQuery =
      supabaseAdmin
        .from("Contact")
        .select(
          "id, name, phone, origin, funnelStepId, responsibleId, createdAt"
        )
        .eq(
          "companyId",
          crmUser.companyId
        )
        .order(
          "createdAt",
          {
            ascending: false,
          }
        );

    /*
     * Atendente visualiza apenas
     * os leads atribuídos a ele.
     */
    if (
      crmUser.role ===
      "atendente"
    ) {
      contactQuery =
        contactQuery.eq(
          "responsibleId",
          crmUser.id
        );
    }

    const [
      contactsResult,
      stepsResult,
      usersResult,
    ] =
      await Promise.all([
        contactQuery,

        supabaseAdmin
          .from(
            "FunnelStep"
          )
          .select(
            "id, name, order, stageType"
          )
          .eq(
            "companyId",
            crmUser.companyId
          )
          .order(
            "order",
            {
              ascending: true,
            }
          ),

        supabaseAdmin
          .from("User")
          .select(
            "id, name, email, role, isActive"
          )
          .eq(
            "companyId",
            crmUser.companyId
          ),
      ]);

    if (
      contactsResult.error
    ) {
      return NextResponse.json(
        {
          error:
            contactsResult.error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      stepsResult.error
    ) {
      return NextResponse.json(
        {
          error:
            stepsResult.error.message,
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
            usersResult.error.message,
        },
        {
          status: 500,
        }
      );
    }

    const contacts =
      contactsResult.data || [];

    const steps =
      stepsResult.data || [];

    const users =
      usersResult.data || [];

    const stepMap =
      new Map<
        string,
        {
          id: string;
          name: string;
          order: number;
          stageType: StageType;
        }
      >();

    for (
      const step of steps
    ) {
      stepMap.set(
        step.id,
        {
          ...step,

          stageType:
            (step.stageType ||
              "open") as StageType,
        }
      );
    }

    const userMap =
      new Map<
        string,
        string
      >();

    for (
      const teamUser of users
    ) {
      userMap.set(
        teamUser.id,
        teamUser.name
      );
    }

    const tipoContato = (
      funnelStepId:
        string | null
    ): StageType => {
      if (!funnelStepId) {
        return "open";
      }

      return (
        stepMap.get(
          funnelStepId
        )?.stageType ||
        "open"
      );
    };

    const totalContacts =
      contacts.length;

    const openContacts =
      contacts.filter(
        (contact) =>
          tipoContato(
            contact.funnelStepId
          ) === "open"
      ).length;

    const wonContacts =
      contacts.filter(
        (contact) =>
          tipoContato(
            contact.funnelStepId
          ) === "won"
      ).length;

    const lostContacts =
      contacts.filter(
        (contact) =>
          tipoContato(
            contact.funnelStepId
          ) === "lost"
      ).length;

    const conversionRate =
      totalContacts > 0
        ? Number(
            (
              (wonContacts /
                totalContacts) *
              100
            ).toFixed(1)
          )
        : 0;

    const hoje =
      dataSaoPaulo(
        new Date()
      );

    const newToday =
      contacts.filter(
        (contact) => {
          if (
            !contact.createdAt
          ) {
            return false;
          }

          return (
            dataSaoPaulo(
              new Date(
                contact.createdAt
              )
            ) === hoje
          );
        }
      ).length;

    const agora =
      Date.now();

    const seteDias =
      7 *
      24 *
      60 *
      60 *
      1000;

    const trintaDias =
      30 *
      24 *
      60 *
      60 *
      1000;

    const last7Days =
      contacts.filter(
        (contact) => {
          if (
            !contact.createdAt
          ) {
            return false;
          }

          return (
            agora -
              new Date(
                contact.createdAt
              ).getTime() <=
            seteDias
          );
        }
      ).length;

    const last30Days =
      contacts.filter(
        (contact) => {
          if (
            !contact.createdAt
          ) {
            return false;
          }

          return (
            agora -
              new Date(
                contact.createdAt
              ).getTime() <=
            trintaDias
          );
        }
      ).length;

    const funnel =
      steps.map(
        (step) => ({
          id:
            step.id,

          name:
            step.name,

          order:
            step.order,

          stageType:
            (step.stageType ||
              "open") as StageType,

          total:
            contacts.filter(
              (contact) =>
                contact.funnelStepId ===
                step.id
            ).length,
        })
      );

    const semEtapa =
      contacts.filter(
        (contact) =>
          !contact.funnelStepId
      ).length;

    if (
      semEtapa > 0
    ) {
      funnel.unshift({
        id:
          "__sem_etapa__",

        name:
          "Sem etapa",

        order:
          -1,

        stageType:
          "open",

        total:
          semEtapa,
      });
    }

    const originMap =
      new Map<
        string,
        number
      >();

    for (
      const contact of contacts
    ) {
      const origin =
        contact.origin?.trim() ||
        "Não informado";

      originMap.set(
        origin,
        (originMap.get(
          origin
        ) || 0) + 1
      );
    }

    const origins =
      Array.from(
        originMap.entries()
      )
        .map(
          ([
            name,
            total,
          ]) => ({
            name,
            total,
          })
        )
        .sort(
          (a, b) =>
            b.total -
            a.total
        );

    const responsibleMap =
      new Map<
        string,
        number
      >();

    for (
      const contact of contacts
    ) {
      const key =
        contact.responsibleId ||
        "__sem_responsavel__";

      responsibleMap.set(
        key,
        (responsibleMap.get(
          key
        ) || 0) + 1
      );
    }

    const responsibles =
      Array.from(
        responsibleMap.entries()
      )
        .map(
          ([
            id,
            total,
          ]) => {
            if (
              id ===
              "__sem_responsavel__"
            ) {
              return {
                id: null,
                name:
                  "Sem responsável",
                total,
              };
            }

            return {
              id,
              name:
                userMap.get(
                  id
                ) ||
                "Usuário",

              total,
            };
          }
        )
        .sort(
          (a, b) =>
            b.total -
            a.total
        );

    const recentContacts =
      contacts
        .slice(
          0,
          8
        )
        .map(
          (contact) => {
            const step =
              contact.funnelStepId
                ? stepMap.get(
                    contact.funnelStepId
                  )
                : null;

            return {
              id:
                contact.id,

              name:
                contact.name,

              phone:
                contact.phone,

              origin:
                contact.origin ||
                "Não informado",

              createdAt:
                contact.createdAt,

              responsibleId:
                contact.responsibleId,

              responsibleName:
                contact.responsibleId
                  ? userMap.get(
                      contact.responsibleId
                    ) ||
                    "Responsável"
                  : "Sem responsável",

              funnelStepId:
                contact.funnelStepId,

              funnelStepName:
                step?.name ||
                "Sem etapa",

              stageType:
                step?.stageType ||
                "open",
            };
          }
        );

    return NextResponse.json({
      company: {
        id:
          company.id,

        name:
          company.name,
      },

      currentUser: {
        id:
          crmUser.id,

        name:
          crmUser.name,

        role:
          crmUser.role,
      },

      metrics: {
        totalContacts,
        openContacts,
        wonContacts,
        lostContacts,
        conversionRate,
        newToday,
        last7Days,
        last30Days,
      },

      funnel,
      origins,
      responsibles,
      recentContacts,
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