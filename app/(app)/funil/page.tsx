"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock,
  RefreshCw,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type UserRole =
  | "zion_admin"
  | "admin"
  | "atendente";

type StageType =
  | "open"
  | "won"
  | "lost";

type FunnelStep = {
  id: string;
  name: string;
  order: number;
  stageType: StageType;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  origin?: string | null;
  funnelStepId?: string | null;
  responsibleId?: string | null;
  createdAt?: string;
};

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

const coresOpen = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-rose-500",
];

const SEM_ETAPA =
  "__sem_etapa__";

export default function FunilPage() {
  const [
    steps,
    setSteps,
  ] = useState<
    FunnelStep[]
  >([]);

  const [
    leads,
    setLeads,
  ] = useState<
    Lead[]
  >([]);

  const [
    users,
    setUsers,
  ] = useState<
    TeamUser[]
  >([]);

  const [
    companyId,
    setCompanyId,
  ] = useState<
    string | null
  >(null);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<
    string | null
  >(null);

  const [
    role,
    setRole,
  ] = useState<
    UserRole | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    moving,
    setMoving,
  ] = useState<
    string | null
  >(null);

  const [
    assigning,
    setAssigning,
  ] = useState<
    string | null
  >(null);

  const [
    draggedLead,
    setDraggedLead,
  ] = useState<
    Lead | null
  >(null);

  const iniciado =
    useRef(false);

  const isAdmin =
    role === "admin" ||
    role === "zion_admin";

  const pegarToken =
    async () => {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Sessão não encontrada."
        );
      }

      return session.access_token;
    };

  const carregarDados =
    async () => {
      setLoading(true);

      try {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          window.location.href =
            "/login";

          return;
        }

        const {
          data: crmUser,
          error:
            crmUserError,
        } = await supabase
          .from("User")
          .select(
            "id, companyId, role"
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
          alert(
            crmUserError?.message ||
              "Usuário não encontrado."
          );

          return;
        }

        const empresaAtual =
          crmUser.companyId;

        const usuarioAtual =
          crmUser.id;

        const roleAtual =
          String(
            crmUser.role
          )
            .trim()
            .toLowerCase() as UserRole;

        setCompanyId(
          empresaAtual
        );

        setCurrentUserId(
          usuarioAtual
        );

        setRole(
          roleAtual
        );

        let contactQuery =
          supabase
            .from("Contact")
            .select(
              "id, name, phone, origin, funnelStepId, responsibleId, createdAt"
            )
            .eq(
              "companyId",
              empresaAtual
            )
            .order(
              "createdAt",
              {
                ascending:
                  false,
              }
            );

        if (
          roleAtual ===
          "atendente"
        ) {
          contactQuery =
            contactQuery.eq(
              "responsibleId",
              usuarioAtual
            );
        }

        const [
          stepsResult,
          contactsResult,
          usersResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "FunnelStep"
              )
              .select(
                "id, name, order, stageType"
              )
              .eq(
                "companyId",
                empresaAtual
              )
              .order(
                "order",
                {
                  ascending:
                    true,
                }
              ),

            contactQuery,

            supabase
              .from("User")
              .select(
                "id, name, email, role, isActive"
              )
              .eq(
                "companyId",
                empresaAtual
              )
              .order(
                "name",
                {
                  ascending:
                    true,
                }
              ),
          ]);

        if (
          stepsResult.error
        ) {
          alert(
            stepsResult.error.message
          );

          return;
        }

        if (
          contactsResult.error
        ) {
          alert(
            contactsResult.error.message
          );

          return;
        }

        if (
          usersResult.error
        ) {
          alert(
            usersResult.error.message
          );

          return;
        }

        setSteps(
          (
            stepsResult.data ||
            []
          ).map(
            (step) => ({
              ...step,

              stageType:
                (step.stageType ||
                  "open") as StageType,
            })
          )
        );

        setLeads(
          contactsResult.data ||
            []
        );

        setUsers(
          usersResult.data ||
            []
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (
      iniciado.current
    ) {
      return;
    }

    iniciado.current =
      true;

    carregarDados();
  }, []);

  const handleDragStart =
    (
      lead: Lead
    ) => {
      setDraggedLead(
        lead
      );
    };

  const handleDrop =
    async (
      toStepId: string
    ) => {
      if (
        !draggedLead ||
        moving ||
        !companyId
      ) {
        return;
      }

      const novoStepId =
        toStepId ===
        SEM_ETAPA
          ? null
          : toStepId;

      if (
        novoStepId &&
        !steps.some(
          (step) =>
            step.id ===
            novoStepId
        )
      ) {
        alert(
          "Etapa inválida."
        );

        setDraggedLead(
          null
        );

        return;
      }

      if (
        draggedLead.funnelStepId ===
        novoStepId
      ) {
        setDraggedLead(
          null
        );

        return;
      }

      const leadId =
        draggedLead.id;

      const etapaAnterior =
        draggedLead.funnelStepId;

      setMoving(
        leadId
      );

      setLeads(
        (atual) =>
          atual.map(
            (lead) =>
              lead.id ===
              leadId
                ? {
                    ...lead,
                    funnelStepId:
                      novoStepId,
                  }
                : lead
          )
      );

      let query =
        supabase
          .from("Contact")
          .update({
            funnelStepId:
              novoStepId,
          })
          .eq(
            "id",
            leadId
          )
          .eq(
            "companyId",
            companyId
          );

      if (
        role ===
          "atendente" &&
        currentUserId
      ) {
        query =
          query.eq(
            "responsibleId",
            currentUserId
          );
      }

      const {
        error,
      } = await query;

      if (error) {
        setLeads(
          (atual) =>
            atual.map(
              (lead) =>
                lead.id ===
                leadId
                  ? {
                      ...lead,
                      funnelStepId:
                        etapaAnterior,
                    }
                  : lead
            )
        );

        alert(
          `Erro ao mover lead: ${error.message}`
        );
      }

      setMoving(null);

      setDraggedLead(
        null
      );
    };

  const atribuirResponsavel =
    async (
      leadId: string,
      responsibleId:
        string | null
    ) => {
      if (!isAdmin) {
        return;
      }

      setAssigning(
        leadId
      );

      try {
        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/contacts/assign",
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  contactId:
                    leadId,

                  responsibleId,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          alert(
            data.error ||
              "Erro ao atribuir responsável."
          );

          return;
        }

        setLeads(
          (atual) =>
            atual.map(
              (lead) =>
                lead.id ===
                leadId
                  ? {
                      ...lead,
                      responsibleId,
                    }
                  : lead
            )
        );
      } finally {
        setAssigning(
          null
        );
      }
    };

  const nomeResponsavel =
    (
      responsibleId:
        string |
        null |
        undefined
    ) => {
      if (
        !responsibleId
      ) {
        return "Sem responsável";
      }

      const user =
        users.find(
          (item) =>
            item.id ===
            responsibleId
        );

      if (
        responsibleId ===
        currentUserId
      ) {
        return user?.name
          ? `${user.name} (Você)`
          : "Você";
      }

      return (
        user?.name ||
        "Responsável"
      );
    };

  const tempoDesde =
    (
      createdAt?: string
    ) => {
      if (!createdAt) {
        return "";
      }

      const diferenca =
        Date.now() -
        new Date(
          createdAt
        ).getTime();

      const minutos =
        Math.floor(
          diferenca /
            60000
        );

      if (
        minutos < 1
      ) {
        return "agora";
      }

      if (
        minutos < 60
      ) {
        return `${minutos} min`;
      }

      const horas =
        Math.floor(
          minutos / 60
        );

      if (
        horas < 24
      ) {
        return `${horas}h`;
      }

      const dias =
        Math.floor(
          horas / 24
        );

      return `${dias}d`;
    };

  const corStageType =
    (
      stageType:
        StageType,
      index: number
    ) => {
      if (
        stageType ===
        "won"
      ) {
        return "bg-emerald-500";
      }

      if (
        stageType ===
        "lost"
      ) {
        return "bg-red-500";
      }

      return coresOpen[
        index %
          coresOpen.length
      ];
    };

  const activeUsers =
    users.filter(
      (user) =>
        user.isActive &&
        user.role !==
          "zion_admin"
    );

  const temSemEtapa =
    leads.some(
      (lead) =>
        !lead.funnelStepId
    );

  const columns: FunnelStep[] =
    [
      ...(temSemEtapa
        ? [
            {
              id:
                SEM_ETAPA,

              name:
                "Sem etapa",

              order:
                -1,

              stageType:
                "open" as StageType,
            },
          ]
        : []),

      ...steps,
    ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-sm text-slate-500">
        Carregando funil...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Funil de Vendas
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? "Acompanhe, distribua e movimente os leads da sua operação."
              : "Acompanhe e movimente os leads atribuídos a você."}
          </p>
        </div>

        <button
          type="button"
          onClick={
            carregarDados
          }
          disabled={
            loading
          }
          className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 rounded-lg text-sm text-slate-600"
        >
          <RefreshCw
            size={15}
          />

          Atualizar
        </button>
      </div>

      {columns.length ===
      0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600 font-medium">
            Nenhuma etapa do funil foi configurada.
          </p>

          {isAdmin && (
            <p className="text-sm text-slate-400 mt-2">
              Configure o funil em Configurações → Funil de Vendas.
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          {columns.map(
            (
              step,
              index
            ) => {
              const stepLeads =
                leads.filter(
                  (lead) =>
                    step.id ===
                    SEM_ETAPA
                      ? !lead.funnelStepId
                      : lead.funnelStepId ===
                        step.id
                );

              return (
                <div
                  key={
                    step.id
                  }
                  className="w-80 flex-shrink-0 bg-slate-100 rounded-xl p-3 flex flex-col"
                  onDragOver={(
                    event
                  ) =>
                    event.preventDefault()
                  }
                  onDrop={() =>
                    handleDrop(
                      step.id
                    )
                  }
                >
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        step.id ===
                        SEM_ETAPA
                          ? "bg-slate-400"
                          : corStageType(
                              step.stageType,
                              index
                            )
                      }`}
                    />

                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-700 text-sm truncate">
                        {
                          step.name
                        }
                      </h3>

                      {step.stageType ===
                        "won" && (
                        <p className="flex items-center gap-1 text-[10px] text-emerald-600 mt-0.5">
                          <CheckCircle2
                            size={10}
                          />

                          Venda concluída
                        </p>
                      )}

                      {step.stageType ===
                        "lost" && (
                        <p className="flex items-center gap-1 text-[10px] text-red-500 mt-0.5">
                          <XCircle
                            size={10}
                          />

                          Perdido
                        </p>
                      )}
                    </div>

                    <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {
                        stepLeads.length
                      }
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {stepLeads.map(
                      (lead) => (
                        <div
                          key={
                            lead.id
                          }
                          draggable={
                            moving !==
                            lead.id
                          }
                          onDragStart={() =>
                            handleDragStart(
                              lead
                            )
                          }
                          className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm cursor-grab active:shadow-md hover:border-blue-300 transition-all"
                        >
                          <h4 className="font-semibold text-slate-800 text-sm">
                            {
                              lead.name
                            }
                          </h4>

                          <p className="text-xs text-slate-500 mt-1">
                            {
                              lead.phone
                            }
                          </p>

                          <div className="mt-3 pt-3 border-t border-slate-100">
                            {isAdmin ? (
                              <div>
                                <label className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                                  <Users
                                    size={
                                      11
                                    }
                                  />

                                  Responsável
                                </label>

                                <select
                                  draggable={
                                    false
                                  }
                                  value={
                                    lead.responsibleId ||
                                    ""
                                  }
                                  disabled={
                                    assigning ===
                                    lead.id
                                  }
                                  onPointerDown={(
                                    event
                                  ) =>
                                    event.stopPropagation()
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    atribuirResponsavel(
                                      lead.id,
                                      event
                                        .target
                                        .value ||
                                        null
                                    )
                                  }
                                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                                >
                                  <option value="">
                                    Sem responsável
                                  </option>

                                  {activeUsers.map(
                                    (
                                      user
                                    ) => (
                                      <option
                                        key={
                                          user.id
                                        }
                                        value={
                                          user.id
                                        }
                                      >
                                        {
                                          user.name
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-blue-700">
                                <UserRound
                                  size={
                                    13
                                  }
                                />

                                {nomeResponsavel(
                                  lead.responsibleId
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3">
                              <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                {lead.origin ||
                                  "Não informado"}
                              </span>

                              <div className="flex items-center text-slate-400 text-[10px] gap-1">
                                <Clock
                                  size={
                                    10
                                  }
                                />

                                <span>
                                  {tempoDesde(
                                    lead.createdAt
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {stepLeads.length ===
                      0 && (
                      <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-400">
                        Arraste leads aqui
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}