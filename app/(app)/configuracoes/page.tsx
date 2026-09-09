"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Building2,
  Users,
  MessageCircle,
  GitBranchPlus,
  Tag,
  Zap,
  BookOpen,
  Clock,
  Bell,
  Puzzle,
  ChevronRight,
  UserPlus,
  Trash2,
  Ban,
  ShieldCheck,
  X,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  isActive: boolean;
  deactivatedAt?: string | null;
  deactivatedReason?: string | null;
};

type TeamApiResponse = {
  error?: string;
  message?: string;

  company?: {
    id: string;
    name: string;
  };

  currentUserId?: string;

  users?: TeamUser[];
};

const categoriasConfig = [
  {
    icon: Building2,
    titulo: "Empresa",
    desc: "Dados da empresa, logo e informações fiscais.",
  },
  {
    icon: Users,
    titulo: "Usuários e Permissões",
    desc: "Adicione atendentes, gestores e defina o que cada um pode ver.",
    action: "team",
  },
  {
    icon: MessageCircle,
    titulo: "WhatsApp",
    desc: "Conecte e gerencie números pela API Oficial da Meta.",
    action: "whatsapp",
  },
  {
    icon: GitBranchPlus,
    titulo: "Funil de Vendas",
    desc: "Personalize as etapas do funil, crie novas colunas.",
    action: "funnel",
  },
  {
    icon: GitBranchPlus,
    titulo: "Distribuição de Leads",
    desc: "Configure o rodízio automático de novos leads entre os membros da equipe.",
    action: "distribution",
  },
  {
    icon: Tag,
    titulo: "Tags",
    desc: "Crie e gerencie tags para organizar seus contatos.",
  },
  {
    icon: Zap,
    titulo: "Automações",
    desc: "Regras de mensagens automáticas e gatilhos.",
  },
  {
    icon: BookOpen,
    titulo: "Mensagens Rápidas",
    desc: "Atalhos de texto para agilizar o atendimento.",
  },
  {
    icon: Clock,
    titulo: "Horário de Atendimento",
    desc: "Defina horário comercial para automações fora do expediente.",
  },
  {
    icon: Bell,
    titulo: "Notificações",
    desc: "Alertas de nova mensagem, follow-up e leads parados.",
  },
  {
    icon: Puzzle,
    titulo: "Integrações",
    desc: "Conexões com Meta Ads, Google Ads e webhooks.",
  },
];

async function lerResposta(
  response: Response
): Promise<TeamApiResponse> {
  const texto = await response.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(
      texto
    ) as TeamApiResponse;
  } catch {
    return {
      error:
        "A API retornou uma resposta inválida.",
    };
  }
}

export default function ConfiguracoesPage() {
    const router = useRouter();
  const [
    equipeAberta,
    setEquipeAberta,
  ] = useState(false);

  const [
    teamUsers,
    setTeamUsers,
  ] = useState<TeamUser[]>([]);

  const [
    teamLoading,
    setTeamLoading,
  ] = useState(false);

  const [
    teamMessage,
    setTeamMessage,
  ] = useState<string | null>(null);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<string | null>(null);

  const [
    companyName,
    setCompanyName,
  ] = useState("");

  const [
    newUserName,
    setNewUserName,
  ] = useState("");

  const [
    newUserEmail,
    setNewUserEmail,
  ] = useState("");

  const [
    newUserPassword,
    setNewUserPassword,
  ] = useState("");

  const [
    newUserRole,
    setNewUserRole,
  ] = useState<
    "admin" | "atendente"
  >("atendente");

  const [
    creatingUser,
    setCreatingUser,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    string | null
  >(null);

  const [
    passwordUser,
    setPasswordUser,
  ] = useState<TeamUser | null>(
    null
  );

  const [
    resetPassword,
    setResetPassword,
  ] = useState("");

  const [
    confirmResetPassword,
    setConfirmResetPassword,
  ] = useState("");

  const [
    showResetPassword,
    setShowResetPassword,
  ] = useState(false);

  const [
    resettingPassword,
    setResettingPassword,
  ] = useState(false);

  const pegarToken =
    async () => {
      const {
        data: { session },
        error,
      } =
        await supabase.auth.getSession();

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Sua sessão não foi encontrada."
        );
      }

      return session.access_token;
    };

  const carregarEquipe =
    async () => {
      setTeamLoading(true);
      setTeamMessage(null);

      try {
        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/team/users",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache: "no-store",
            }
          );

        const data =
          await lerResposta(
            response
          );

        if (!response.ok) {
          setTeamMessage(
            data.error ||
              "Não foi possível carregar a equipe."
          );

          return;
        }

        setTeamUsers(
          data.users || []
        );

        setCurrentUserId(
          data.currentUserId ||
            null
        );

        setCompanyName(
          data.company?.name ||
            ""
        );
      } catch (error) {
        setTeamMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setTeamLoading(false);
      }
    };

  const abrirEquipe =
    async () => {
      if (equipeAberta) {
        setEquipeAberta(false);
        return;
      }

      setEquipeAberta(true);

      await carregarEquipe();

      setTimeout(() => {
        document
          .getElementById(
            "equipe"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
      }, 100);
    };

  const criarUsuario =
    async () => {
      if (
        !newUserName.trim() ||
        !newUserEmail.trim() ||
        !newUserPassword
      ) {
        setTeamMessage(
          "Preencha nome, email e senha."
        );

        return;
      }

      if (
        newUserPassword.length <
        8
      ) {
        setTeamMessage(
          "A senha precisa possuir pelo menos 8 caracteres."
        );

        return;
      }

      setCreatingUser(true);
      setTeamMessage(null);

      try {
        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/team/users",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  name:
                    newUserName.trim(),

                  email:
                    newUserEmail
                      .trim()
                      .toLowerCase(),

                  password:
                    newUserPassword,

                  role:
                    newUserRole,
                }),
            }
          );

        const data =
          await lerResposta(
            response
          );

        if (!response.ok) {
          setTeamMessage(
            data.error ||
              "Não foi possível criar o usuário."
          );

          return;
        }

        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole(
          "atendente"
        );

        await carregarEquipe();

        setTeamMessage(
          "Usuário criado com sucesso."
        );
      } catch (error) {
        setTeamMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setCreatingUser(false);
      }
    };

  const alterarRole =
    async (
      user: TeamUser,
      role:
        | "admin"
        | "atendente"
    ) => {
      if (
        user.id ===
        currentUserId
      ) {
        setTeamMessage(
          "Você não pode alterar sua própria função por esta tela."
        );

        return;
      }

      setActionLoading(
        user.id
      );

      setTeamMessage(null);

      try {
        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/team/users",
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  userId:
                    user.id,

                  action:
                    "role",

                  role,
                }),
            }
          );

        const data =
          await lerResposta(
            response
          );

        if (!response.ok) {
          setTeamMessage(
            data.error ||
              "Não foi possível alterar a função."
          );

          return;
        }

        await carregarEquipe();

        setTeamMessage(
          "Função atualizada com sucesso."
        );
      } catch (error) {
        setTeamMessage(
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

  const alterarStatusUsuario =
    async (
      user: TeamUser
    ) => {
      if (
        user.id ===
        currentUserId
      ) {
        setTeamMessage(
          "Você não pode desativar seu próprio acesso."
        );

        return;
      }

      let reason = "";

      if (user.isActive) {
        const resposta =
          window.prompt(
            "Informe o motivo da desativação:",
            "Acesso removido pelo administrador"
          );

        if (
          resposta === null
        ) {
          return;
        }

        reason =
          resposta.trim();
      }

      setActionLoading(
        user.id
      );

      setTeamMessage(null);

      try {
        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/team/users",
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  userId:
                    user.id,

                  action:
                    user.isActive
                      ? "deactivate"
                      : "activate",

                  reason,
                }),
            }
          );

        const data =
          await lerResposta(
            response
          );

        if (!response.ok) {
          setTeamMessage(
            data.error ||
              "Não foi possível alterar o acesso."
          );

          return;
        }

        await carregarEquipe();

        setTeamMessage(
          user.isActive
            ? "Usuário desativado."
            : "Usuário reativado."
        );
      } catch (error) {
        setTeamMessage(
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

  const excluirUsuario =
    async (
      user: TeamUser
    ) => {
      if (
        user.id ===
        currentUserId
      ) {
        setTeamMessage(
          "Você não pode excluir seu próprio acesso."
        );

        return;
      }

      const confirmar =
        window.prompt(
          `Para excluir "${user.name}", digite EXCLUIR:`
        );

      if (
        confirmar !==
        "EXCLUIR"
      ) {
        return;
      }

      setActionLoading(
        user.id
      );

      setTeamMessage(null);

      try {
        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/team/users",
            {
              method:
                "DELETE",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  userId:
                    user.id,
                }),
            }
          );

        const data =
          await lerResposta(
            response
          );

        if (!response.ok) {
          setTeamMessage(
            data.error ||
              "Não foi possível excluir o usuário."
          );

          return;
        }

        await carregarEquipe();

        setTeamMessage(
          "Usuário excluído com sucesso."
        );
      } catch (error) {
        setTeamMessage(
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

  const abrirRedefinicaoSenha =
    (
      user: TeamUser
    ) => {
      if (
        user.id ===
        currentUserId
      ) {
        setTeamMessage(
          "Sua própria senha não pode ser redefinida por esta área."
        );

        return;
      }

      setPasswordUser(user);

      setResetPassword("");

      setConfirmResetPassword(
        ""
      );

      setShowResetPassword(
        false
      );
    };

  const fecharRedefinicaoSenha =
    () => {
      if (
        resettingPassword
      ) {
        return;
      }

      setPasswordUser(null);

      setResetPassword("");

      setConfirmResetPassword(
        ""
      );

      setShowResetPassword(
        false
      );
    };

  const redefinirSenha =
    async () => {
      if (!passwordUser) {
        return;
      }

      if (
        !resetPassword ||
        !confirmResetPassword
      ) {
        setTeamMessage(
          "Preencha a nova senha e a confirmação."
        );

        return;
      }

      if (
        resetPassword.length <
        8
      ) {
        setTeamMessage(
          "A nova senha precisa possuir pelo menos 8 caracteres."
        );

        return;
      }

      if (
        resetPassword !==
        confirmResetPassword
      ) {
        setTeamMessage(
          "As senhas não conferem."
        );

        return;
      }

      setResettingPassword(
        true
      );

      setTeamMessage(null);

      try {
        const token =
          await pegarToken();

        const response =
          await fetch(
            "/api/team/users",
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  userId:
                    passwordUser.id,

                  action:
                    "reset_password",

                  password:
                    resetPassword,
                }),
            }
          );

        const data =
          await lerResposta(
            response
          );

        if (!response.ok) {
          setTeamMessage(
            data.error ||
              "Não foi possível redefinir a senha."
          );

          return;
        }

        const nomeUsuario =
          passwordUser.name;

        fecharRedefinicaoSenha();

        setTeamMessage(
          `Senha de ${nomeUsuario} redefinida com sucesso.`
        );
      } catch (error) {
        setTeamMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setResettingPassword(
          false
        );
      }
    };

  const nomeRole = (
    role: string
  ) => {
    if (
      role === "zion_admin"
    ) {
      return "Administrador Zion";
    }

    if (
      role === "admin"
    ) {
      return "Administrador";
    }

    return "Atendente";
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Configurações
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          Ajuste o CRM Zion para a realidade da sua empresa.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50">
            <MessageCircle
              size={24}
              className="text-emerald-600"
            />
          </div>

          <div>
            <h3 className="font-bold text-slate-800">
              Conexão com WhatsApp
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Conecte o WhatsApp Business pela integração oficial da Meta.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/configuracoes/whatsapp"
            )
          }
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Gerenciar WhatsApp
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categoriasConfig.map(
          (
            cat,
            index
          ) => {
            const gerenciaEquipe =
  cat.action ===
  "team";

const gerenciaFunil =
  cat.action ===
  "funnel";

const gerenciaDistribuicao =
  cat.action ===
  "distribution";

const gerenciaWhatsApp =
  cat.action ===
  "whatsapp";

const possuiAcao =
  gerenciaEquipe ||
  gerenciaFunil ||
  gerenciaDistribuicao ||
  gerenciaWhatsApp;

            return (
              <div
                key={index}
                onClick={
  gerenciaEquipe
    ? abrirEquipe
    : gerenciaFunil
    ? () =>
        router.push(
          "/configuracoes/funil"
        )
    : gerenciaDistribuicao
    ? () =>
        router.push(
          "/configuracoes/distribuicao"
        )
    : gerenciaWhatsApp
    ? () =>
        router.push(
          "/configuracoes/whatsapp"
        )
    : undefined
                }
                className={`bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 transition-all group ${
                  possuiAcao
  ? "cursor-pointer hover:shadow-md hover:border-blue-300"
  : "border-slate-200"
                } ${
                  equipeAberta &&
                  gerenciaEquipe
                    ? "border-blue-400 ring-2 ring-blue-50"
                    : "border-slate-200"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg transition-colors ${
  possuiAcao
    ? "bg-blue-50"
    : "bg-slate-100"
                  }`}
                >
                  <cat.icon
                    size={20}
                    className={
  possuiAcao
    ? "text-blue-600"
    : "text-slate-500"
                    }
                  />
                </div>

                <div className="flex-1">
                  <h3
                    className={`font-semibold text-sm ${
                      possuiAcao
  ? "text-blue-700"
  : "text-slate-800"

                    }`}
                  >
                    {cat.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {cat.desc}
                  </p>
                </div>

                {possuiAcao && (
  <ChevronRight
    size={18}
    className={`text-blue-500 transition-transform ${
      equipeAberta &&
      gerenciaEquipe
        ? "rotate-90"
        : ""
    }`}
  />
)}
              </div>
            );
          }
        )}
      </div>

      {equipeAberta && (
        <div
          id="equipe"
          className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-8"
        >
          <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users
                  size={22}
                  className="text-blue-600"
                />

                <h2 className="text-xl font-bold text-slate-800">
                  Equipe
                </h2>
              </div>

              <p className="text-sm text-slate-500 mt-2">
                Gerencie os usuários que possuem acesso a
                {companyName
                  ? ` ${companyName}.`
                  : " este ambiente."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setEquipeAberta(
                  false
                )
              }
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X
                size={20}
              />
            </button>
          </div>

          {teamMessage && (
            <div className="mx-6 mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
              {teamMessage}
            </div>
          )}

          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus
                size={19}
                className="text-blue-600"
              />

              <h3 className="font-semibold text-slate-800">
                Adicionar usuário
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Nome"
                value={
                  newUserName
                }
                onChange={(e) =>
                  setNewUserName(
                    e.target.value
                  )
                }
                className="border border-slate-300 rounded-xl px-3 py-3 text-sm"
              />

              <input
                type="email"
                placeholder="Email"
                value={
                  newUserEmail
                }
                onChange={(e) =>
                  setNewUserEmail(
                    e.target.value
                  )
                }
                className="border border-slate-300 rounded-xl px-3 py-3 text-sm"
              />

              <input
                type="password"
                placeholder="Senha provisória"
                value={
                  newUserPassword
                }
                onChange={(e) =>
                  setNewUserPassword(
                    e.target.value
                  )
                }
                className="border border-slate-300 rounded-xl px-3 py-3 text-sm"
              />

              <select
                value={
                  newUserRole
                }
                onChange={(e) =>
                  setNewUserRole(
                    e.target.value as
                      | "admin"
                      | "atendente"
                  )
                }
                className="border border-slate-300 rounded-xl px-3 py-3 text-sm bg-white"
              >
                <option value="atendente">
                  Atendente
                </option>

                <option value="admin">
                  Administrador
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={
                criarUsuario
              }
              disabled={
                creatingUser
              }
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:bg-slate-400"
            >
              {creatingUser
                ? "Criando usuário..."
                : "Adicionar usuário"}
            </button>
          </div>

          <div className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              Usuários
            </h3>

            {teamLoading &&
            teamUsers.length ===
              0 ? (
              <div className="py-8 text-sm text-slate-500 text-center">
                Carregando equipe...
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {teamUsers.map(
                  (user) => {
                    const isCurrentUser =
                      user.id ===
                      currentUserId;

                    const isZionAdmin =
                      user.role ===
                      "zion_admin";

                    return (
                      <div
                        key={
                          user.id
                        }
                        className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">
                              {
                                user.name
                              }
                            </p>

                            {isCurrentUser && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                Você
                              </span>
                            )}

                            {user.isActive ? (
                              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                                Ativo
                              </span>
                            ) : (
                              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                                Desativado
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-500 mt-1">
                            {
                              user.email
                            }
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            {nomeRole(
                              user.role
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={
                              user.role
                            }
                            disabled={
                              isCurrentUser ||
                              isZionAdmin ||
                              actionLoading ===
                                user.id
                            }
                            onChange={(e) =>
                              alterarRole(
                                user,
                                e
                                  .target
                                  .value as
                                  | "admin"
                                  | "atendente"
                              )
                            }
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100"
                          >
                            {isZionAdmin && (
                              <option value="zion_admin">
                                Administrador Zion
                              </option>
                            )}

                            <option value="admin">
                              Administrador
                            </option>

                            <option value="atendente">
                              Atendente
                            </option>
                          </select>

                          {!isCurrentUser &&
                            !isZionAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirRedefinicaoSenha(
                                    user
                                  )
                                }
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700"
                              >
                                <KeyRound
                                  size={
                                    15
                                  }
                                />

                                Redefinir senha
                              </button>
                            )}

                          {!isCurrentUser &&
                            !isZionAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  alterarStatusUsuario(
                                    user
                                  )
                                }
                                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                                  user.isActive
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {user.isActive
                                  ? "Desativar"
                                  : "Reativar"}
                              </button>
                            )}

                          {!isCurrentUser &&
                            !isZionAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  excluirUsuario(
                                    user
                                  )
                                }
                                className="p-2 rounded-lg bg-red-50 text-red-600"
                              >
                                <Trash2
                                  size={
                                    16
                                  }
                                />
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {passwordUser && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound
                    size={21}
                    className="text-blue-600"
                  />

                  <h2 className="text-xl font-bold text-slate-800">
                    Redefinir senha
                  </h2>
                </div>

                <p className="text-sm text-slate-500 mt-2">
                  Defina uma nova senha para{" "}
                  <strong>
                    {
                      passwordUser.name
                    }
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={
                  fecharRedefinicaoSenha
                }
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Nova senha
                </label>

                <div className="relative mt-1.5">
                  <input
                    type={
                      showResetPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      resetPassword
                    }
                    onChange={(e) =>
                      setResetPassword(
                        e.target.value
                      )
                    }
                    placeholder="Mínimo de 8 caracteres"
                    className="w-full border border-slate-300 rounded-xl px-3 py-3 pr-11 text-sm"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowResetPassword(
                        !showResetPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showResetPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Confirmar senha
                </label>

                <input
                  type="password"
                  value={
                    confirmResetPassword
                  }
                  onChange={(e) =>
                    setConfirmResetPassword(
                      e.target.value
                    )
                  }
                  placeholder="Repita a nova senha"
                  className="w-full border border-slate-300 rounded-xl px-3 py-3 mt-1.5 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    fecharRedefinicaoSenha
                  }
                  disabled={
                    resettingPassword
                  }
                  className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-xl text-sm font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    redefinirSenha
                  }
                  disabled={
                    resettingPassword
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold disabled:bg-slate-400"
                >
                  {resettingPassword
                    ? "Salvando..."
                    : "Salvar nova senha"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}