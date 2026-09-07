"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

type StageType =
  | "open"
  | "won"
  | "lost";

type FunnelStep = {
  id: string;
  name: string;
  order: number;
  stageType: StageType;
  companyId?: string;
};

type ApiResponse = {
  error?: string;
  message?: string;
  steps?: FunnelStep[];
};

export default function ConfiguracaoFunilPage() {
  const router =
    useRouter();

  const [
    steps,
    setSteps,
  ] = useState<
    FunnelStep[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    string | null
  >(null);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    newName,
    setNewName,
  ] = useState("");

  const [
    newType,
    setNewType,
  ] =
    useState<StageType>(
      "open"
    );

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

  const requestApi =
    async (
      method:
        | "GET"
        | "POST"
        | "PATCH"
        | "DELETE",

      body?: object
    ) => {
      const token =
        await pegarToken();

      const response =
        await fetch(
          "/api/funnel/steps",
          {
            method,

            headers: {
              Authorization:
                `Bearer ${token}`,

              ...(body
                ? {
                    "Content-Type":
                      "application/json",
                  }
                : {}),
            },

            ...(body
              ? {
                  body:
                    JSON.stringify(
                      body
                    ),
                }
              : {}),

            cache:
              "no-store",
          }
        );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível processar a solicitação."
        );
      }

      return data;
    };

  const carregar =
    async () => {
      setLoading(true);
      setMessage(null);

      try {
        const data =
          await requestApi(
            "GET"
          );

        setSteps(
          (data.steps || []).map(
            (step) => ({
              ...step,

              stageType:
                (step.stageType ||
                  "open") as StageType,
            })
          )
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    carregar();
  }, []);

  const atualizarLocal =
    (
      id: string,
      changes:
        Partial<FunnelStep>
    ) => {
      setSteps(
        (current) =>
          current.map(
            (step) =>
              step.id === id
                ? {
                    ...step,
                    ...changes,
                  }
                : step
          )
      );
    };

  const criar =
    async () => {
      if (
        !newName.trim()
      ) {
        setMessage(
          "Informe o nome da etapa."
        );

        return;
      }

      setCreating(true);
      setMessage(null);

      try {
        await requestApi(
          "POST",
          {
            name:
              newName.trim(),

            stageType:
              newType,
          }
        );

        setNewName("");

        setNewType(
          "open"
        );

        await carregar();

        setMessage(
          "Etapa criada com sucesso."
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setCreating(false);
      }
    };

  const salvar =
    async (
      step: FunnelStep
    ) => {
      if (
        !step.name.trim()
      ) {
        setMessage(
          "A etapa precisa possuir um nome."
        );

        return;
      }

      setActionLoading(
        step.id
      );

      setMessage(null);

      try {
        await requestApi(
          "PATCH",
          {
            action:
              "update",

            stepId:
              step.id,

            name:
              step.name.trim(),

            stageType:
              step.stageType,
          }
        );

        await carregar();

        setMessage(
          "Etapa atualizada com sucesso."
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );

        await carregar();
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const mover =
    async (
      stepId: string,
      direction:
        | "up"
        | "down"
    ) => {
      setActionLoading(
        stepId
      );

      setMessage(null);

      try {
        await requestApi(
          "PATCH",
          {
            action:
              "move",

            stepId,

            direction,
          }
        );

        await carregar();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const excluir =
    async (
      step: FunnelStep
    ) => {
      const confirmar =
        window.confirm(
          `Deseja excluir a etapa "${step.name}"?`
        );

      if (!confirmar) {
        return;
      }

      setActionLoading(
        step.id
      );

      setMessage(null);

      try {
        await requestApi(
          "DELETE",
          {
            stepId:
              step.id,
          }
        );

        await carregar();

        setMessage(
          "Etapa excluída com sucesso."
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const nomeTipo =
    (
      type: StageType
    ) => {
      if (
        type === "won"
      ) {
        return "Venda concluída";
      }

      if (
        type === "lost"
      ) {
        return "Perdido";
      }

      return "Em andamento";
    };

  const iconeTipo =
    (
      type: StageType
    ) => {
      if (
        type === "won"
      ) {
        return (
          <CheckCircle2
            size={16}
            className="text-emerald-600"
          />
        );
      }

      if (
        type === "lost"
      ) {
        return (
          <XCircle
            size={16}
            className="text-red-500"
          />
        );
      }

      return (
        <Clock3
          size={16}
          className="text-blue-600"
        />
      );
    };

  return (
    <div className="max-w-5xl">
      <button
        type="button"
        onClick={() =>
          router.push(
            "/configuracoes"
          )
        }
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para configurações
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Funil de Vendas
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Personalize o processo comercial de acordo com a operação da sua equipe.
          </p>
        </div>

        <button
          type="button"
          onClick={
            carregar
          }
          disabled={
            loading
          }
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-600 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Atualizar
        </button>
      </div>

      {message && (
        <div className="mb-6 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">
            Etapas do funil
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            O nome pode ser personalizado livremente. O tipo é utilizado pelo CRM para identificar oportunidades, vendas e perdas.
          </p>
        </div>

        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-bold text-slate-500 mb-3">
            ADICIONAR NOVA ETAPA
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
            <input
              type="text"
              value={
                newName
              }
              onChange={(e) =>
                setNewName(
                  e.target.value
                )
              }
              placeholder="Ex: Follow up"
              className="border border-slate-300 bg-white rounded-xl px-3 py-3 text-sm"
            />

            <select
              value={
                newType
              }
              onChange={(e) =>
                setNewType(
                  e.target
                    .value as StageType
                )
              }
              className="border border-slate-300 bg-white rounded-xl px-3 py-3 text-sm"
            >
              <option value="open">
                Em andamento
              </option>

              <option value="won">
                Venda concluída
              </option>

              <option value="lost">
                Perdido
              </option>
            </select>

            <button
              type="button"
              onClick={
                criar
              }
              disabled={
                creating
              }
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:bg-slate-400"
            >
              <Plus
                size={17}
              />

              {creating
                ? "Criando..."
                : "Adicionar"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Carregando etapas...
          </div>
        ) : steps.length ===
          0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma etapa configurada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {steps.map(
              (
                step,
                index
              ) => (
                <div
                  key={
                    step.id
                  }
                  className="p-5"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[42px_1fr_220px_auto] items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                      {index +
                        1}
                    </div>

                    <input
                      value={
                        step.name
                      }
                      onChange={(e) =>
                        atualizarLocal(
                          step.id,
                          {
                            name:
                              e.target
                                .value,
                          }
                        )
                      }
                      className="border border-slate-300 rounded-xl px-3 py-3 text-sm"
                    />

                    <select
                      value={
                        step.stageType
                      }
                      onChange={(e) =>
                        atualizarLocal(
                          step.id,
                          {
                            stageType:
                              e.target
                                .value as StageType,
                          }
                        )
                      }
                      className="border border-slate-300 rounded-xl px-3 py-3 text-sm bg-white"
                    >
                      <option value="open">
                        Em andamento
                      </option>

                      <option value="won">
                        Venda concluída
                      </option>

                      <option value="lost">
                        Perdido
                      </option>
                    </select>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        title="Mover para cima"
                        onClick={() =>
                          mover(
                            step.id,
                            "up"
                          )
                        }
                        disabled={
                          index ===
                            0 ||
                          actionLoading ===
                            step.id
                        }
                        className="p-2.5 border border-slate-300 rounded-lg text-slate-600 disabled:opacity-30"
                      >
                        <ArrowUp
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        title="Mover para baixo"
                        onClick={() =>
                          mover(
                            step.id,
                            "down"
                          )
                        }
                        disabled={
                          index ===
                            steps.length -
                              1 ||
                          actionLoading ===
                            step.id
                        }
                        className="p-2.5 border border-slate-300 rounded-lg text-slate-600 disabled:opacity-30"
                      >
                        <ArrowDown
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          salvar(
                            step
                          )
                        }
                        disabled={
                          actionLoading ===
                          step.id
                        }
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2.5 rounded-lg text-sm font-semibold"
                      >
                        <Save
                          size={15}
                        />

                        Salvar
                      </button>

                      <button
                        type="button"
                        title="Excluir etapa"
                        onClick={() =>
                          excluir(
                            step
                          )
                        }
                        disabled={
                          actionLoading ===
                          step.id
                        }
                        className="p-2.5 bg-red-50 text-red-600 rounded-lg"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 ml-0 lg:ml-[55px] flex items-center gap-2 text-xs text-slate-500">
                    {iconeTipo(
                      step.stageType
                    )}

                    {nomeTipo(
                      step.stageType
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        Etapas que já possuem leads não podem ser excluídas. Primeiro mova os contatos para outra etapa do funil.
      </div>
    </div>
  );
}