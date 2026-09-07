"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  isActive: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  isZionCore?: boolean;
};

type CrmUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  isActive: boolean;
  deactivatedAt?: string | null;
  deactivatedReason?: string | null;
};

type ApiResponse = {
  error?: string;
  message?: string;
  companies?: Company[];
  company?: Company;
  users?: CrmUser[];
};

async function lerResposta(
  response: Response
): Promise<ApiResponse> {
  const texto =
    await response.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(
      texto
    ) as ApiResponse;
  } catch {
    return {
      error:
        "A API retornou uma resposta inválida.",
    };
  }
}

export default function AdminZionPage() {
  const [
    companies,
    setCompanies,
  ] = useState<Company[]>([]);

  const [
    usersByCompany,
    setUsersByCompany,
  ] = useState<
    Record<string, CrmUser[]>
  >({});

  const [
    msg,
    setMsg,
  ] = useState<
    string | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    string | null
  >(null);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState<
    string | null
  >(null);

  const [
    openCompanyId,
    setOpenCompanyId,
  ] = useState<
    string | null
  >(null);

  const [
    clientName,
    setClientName,
  ] = useState("");

  const [
    brandName,
    setBrandName,
  ] = useState("");

  const [
    adminName,
    setAdminName,
  ] = useState("");

  const [
    adminEmail,
    setAdminEmail,
  ] = useState("");

  const [
    adminPassword,
    setAdminPassword,
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
    "atendente" | "admin"
  >("atendente");

  const [
    creatingUser,
    setCreatingUser,
  ] = useState(false);

  const [
    passwordUser,
    setPasswordUser,
  ] = useState<
    CrmUser | null
  >(null);

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

  const iniciou =
    useRef(false);

  const pegarToken =
    async () => {
      const {
        data: {
          session,
        },
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

  const loadCompanies =
    async () => {
      setLoading(true);

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/companies",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache:
                "no-store",
            }
          );

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao listar clientes (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        setCompanies(
          json.companies ||
            []
        );
      } catch (error) {
        setMsg(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (iniciou.current) {
      return;
    }

    iniciou.current =
      true;

    loadCompanies();
  }, []);

  const createCompany =
    async () => {
      if (
        !clientName.trim() ||
        !brandName.trim() ||
        !adminName.trim() ||
        !adminEmail.trim() ||
        !adminPassword
      ) {
        setMsg(
          "Preencha todos os campos obrigatórios."
        );

        return;
      }

      if (
        adminPassword.length <
        8
      ) {
        setMsg(
          "A senha precisa possuir pelo menos 8 caracteres."
        );

        return;
      }

      setCreating(true);

      setMsg(
        "Criando ambiente..."
      );

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/companies",
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
                  clientName:
                    clientName.trim(),

                  brandName:
                    brandName.trim(),

                  adminName:
                    adminName.trim(),

                  adminEmail:
                    adminEmail
                      .trim()
                      .toLowerCase(),

                  adminPassword,
                }),
            }
          );

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao criar cliente (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        setClientName("");
        setBrandName("");
        setAdminName("");
        setAdminEmail("");
        setAdminPassword("");

        await loadCompanies();

        setMsg(
          "✅ Cliente criado com sucesso!"
        );
      } catch (error) {
        setMsg(
          error instanceof Error
            ? error.message
            : "Erro inesperado."
        );
      } finally {
        setCreating(false);
      }
    };

  const alterarStatus =
    async (
      company: Company
    ) => {
      const suspender =
        company.isActive;

      let reason = "";

      if (suspender) {
        const resposta =
          window.prompt(
            "Informe o motivo da suspensão:",
            "Pagamento pendente"
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
        company.id
      );

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/companies",
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
                  companyId:
                    company.id,

                  action:
                    suspender
                      ? "suspend"
                      : "activate",

                  reason,
                }),
            }
          );

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        await loadCompanies();

        setMsg(
          suspender
            ? "Conta suspensa com sucesso."
            : "Conta reativada com sucesso."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const excluirConta =
    async (
      company: Company
    ) => {
      const confirmar =
        window.prompt(
          `Para excluir definitivamente "${company.name}", digite EXCLUIR:`
        );

      if (
        confirmar !==
        "EXCLUIR"
      ) {
        return;
      }

      setActionLoading(
        company.id
      );

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/companies",
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
                  companyId:
                    company.id,
                }),
            }
          );

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao excluir (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        if (
          openCompanyId ===
          company.id
        ) {
          setOpenCompanyId(
            null
          );
        }

        setUsersByCompany(
          (atual) => {
            const copia = {
              ...atual,
            };

            delete copia[
              company.id
            ];

            return copia;
          }
        );

        await loadCompanies();

        setMsg(
          "Conta excluída definitivamente."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const loadUsers =
    async (
      companyId: string
    ) => {
      setLoadingUsers(
        companyId
      );

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            `/api/zion/users?companyId=${encodeURIComponent(
              companyId
            )}`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache:
                "no-store",
            }
          );

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao carregar usuários (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        setUsersByCompany(
          (atual) => ({
            ...atual,

            [companyId]:
              json.users ||
              [],
          })
        );
      } finally {
        setLoadingUsers(
          null
        );
      }
    };

  const toggleUsers =
    async (
      company: Company
    ) => {
      if (
        openCompanyId ===
        company.id
      ) {
        setOpenCompanyId(
          null
        );

        return;
      }

      setOpenCompanyId(
        company.id
      );

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole(
        "atendente"
      );

      await loadUsers(
        company.id
      );
    };

  const criarUsuario =
    async (
      company: Company
    ) => {
      if (
        !newUserName.trim() ||
        !newUserEmail.trim() ||
        !newUserPassword
      ) {
        setMsg(
          "Preencha nome, email e senha do novo usuário."
        );

        return;
      }

      if (
        newUserPassword.length <
        8
      ) {
        setMsg(
          "A senha precisa possuir pelo menos 8 caracteres."
        );

        return;
      }

      setCreatingUser(true);

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/users",
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
                  companyId:
                    company.id,

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

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao criar usuário (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole(
          "atendente"
        );

        await loadUsers(
          company.id
        );

        setMsg(
          "✅ Usuário criado com sucesso!"
        );
      } finally {
        setCreatingUser(false);
      }
    };

  const alterarRole =
    async (
      companyId: string,
      user: CrmUser,
      role:
        | "admin"
        | "atendente"
    ) => {
      setActionLoading(
        user.id
      );

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/users",
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

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao alterar função (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        await loadUsers(
          companyId
        );

        setMsg(
          "Função atualizada com sucesso."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const alterarStatusUsuario =
    async (
      companyId: string,
      user: CrmUser
    ) => {
      let reason = "";

      if (
        user.isActive
      ) {
        const resposta =
          window.prompt(
            "Informe o motivo da desativação:",
            "Acesso removido"
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

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/users",
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

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        await loadUsers(
          companyId
        );

        setMsg(
          user.isActive
            ? "Usuário desativado."
            : "Usuário reativado."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const excluirUsuario =
    async (
      companyId: string,
      user: CrmUser
    ) => {
      const confirmar =
        window.prompt(
          `Para excluir o acesso de "${user.name}", digite EXCLUIR:`
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

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/users",
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

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao excluir usuário (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        await loadUsers(
          companyId
        );

        setMsg(
          "Usuário excluído com sucesso."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  const abrirRedefinicaoSenha =
    (
      user: CrmUser
    ) => {
      setPasswordUser(
        user
      );

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

      setPasswordUser(
        null
      );

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
      if (
        !passwordUser
      ) {
        return;
      }

      if (
        !resetPassword ||
        !confirmResetPassword
      ) {
        setMsg(
          "Preencha a nova senha e a confirmação."
        );

        return;
      }

      if (
        resetPassword.length <
        8
      ) {
        setMsg(
          "A nova senha precisa possuir pelo menos 8 caracteres."
        );

        return;
      }

      if (
        resetPassword !==
        confirmResetPassword
      ) {
        setMsg(
          "As senhas não conferem."
        );

        return;
      }

      setResettingPassword(
        true
      );

      try {
        const token =
          await pegarToken();

        const res =
          await fetch(
            "/api/zion/users",
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

        const json =
          await lerResposta(
            res
          );

        if (!res.ok) {
          setMsg(
            `Erro ao redefinir senha (${res.status}): ${
              json.error ||
              "erro desconhecido"
            }`
          );

          return;
        }

        const nome =
          passwordUser.name;

        setPasswordUser(
          null
        );

        setResetPassword("");

        setConfirmResetPassword(
          ""
        );

        setMsg(
          `Senha de ${nome} redefinida com sucesso.`
        );
      } finally {
        setResettingPassword(
          false
        );
      }
    };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Painel Zion
        </h1>

        <p className="text-slate-500 mt-2">
          Gerencie clientes,
          acessos e usuários do CRM.
        </p>
      </div>

      {msg && (
        <div className="mb-6 p-4 rounded-xl border bg-white text-sm font-medium text-slate-800">
          {msg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">
          Cadastrar novo cliente
        </h2>

        <p className="text-sm text-slate-500 mt-1 mb-6">
          Crie um ambiente exclusivo para o cliente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border border-slate-300 rounded-xl px-3 py-3"
            placeholder="Nome do cliente"
            value={
              clientName
            }
            onChange={(e) =>
              setClientName(
                e.target.value
              )
            }
          />

          <input
            className="border border-slate-300 rounded-xl px-3 py-3"
            placeholder="Empresa ou marca"
            value={
              brandName
            }
            onChange={(e) =>
              setBrandName(
                e.target.value
              )
            }
          />

          <input
            className="border border-slate-300 rounded-xl px-3 py-3"
            placeholder="Nome do administrador"
            value={
              adminName
            }
            onChange={(e) =>
              setAdminName(
                e.target.value
              )
            }
          />

          <input
            type="email"
            className="border border-slate-300 rounded-xl px-3 py-3"
            placeholder="Email de acesso"
            value={
              adminEmail
            }
            onChange={(e) =>
              setAdminEmail(
                e.target.value
              )
            }
          />

          <input
            type="password"
            className="border border-slate-300 rounded-xl px-3 py-3"
            placeholder="Senha provisória"
            value={
              adminPassword
            }
            onChange={(e) =>
              setAdminPassword(
                e.target.value
              )
            }
          />
        </div>

        <button
          type="button"
          onClick={
            createCompany
          }
          disabled={
            creating
          }
          className="mt-6 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold disabled:bg-slate-400"
        >
          {creating
            ? "Criando..."
            : "Criar cliente"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Clientes
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              {
                companies.length
              }{" "}
              ambiente(s)
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadCompanies
            }
            disabled={
              loading
            }
            className="border border-slate-300 px-4 py-2 rounded-lg text-sm"
          >
            {loading
              ? "Atualizando..."
              : "Atualizar"}
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {companies.map(
            (company) => {
              const users =
                usersByCompany[
                  company.id
                ] || [];

              const aberto =
                openCompanyId ===
                company.id;

              return (
                <div
                  key={
                    company.id
                  }
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-semibold text-slate-800">
                            {
                              company.name
                            }
                          </p>

                          {company.isZionCore ? (
                            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                              <ShieldCheck
                                size={
                                  13
                                }
                              />
                              Zion
                            </span>
                          ) : company.isActive ? (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                              Ativo
                            </span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">
                              Suspenso
                            </span>
                          )}
                        </div>

                        {!company.isActive &&
                          company.suspendedReason && (
                            <p className="text-sm text-red-500 mt-2">
                              Motivo:{" "}
                              {
                                company.suspendedReason
                              }
                            </p>
                          )}

                        <p className="text-xs text-slate-400 mt-2">
                          {
                            company.slug
                          }
                        </p>
                      </div>

                      {!company.isZionCore && (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              toggleUsers(
                                company
                              )
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700"
                          >
                            <Users
                              size={
                                16
                              }
                            />

                            Gerenciar usuários

                            {aberto ? (
                              <ChevronUp
                                size={
                                  15
                                }
                              />
                            ) : (
                              <ChevronDown
                                size={
                                  15
                                }
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              alterarStatus(
                                company
                              )
                            }
                            disabled={
                              actionLoading ===
                              company.id
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                              company.isActive
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {company.isActive ? (
                              <>
                                <Ban
                                  size={
                                    16
                                  }
                                />
                                Suspender
                              </>
                            ) : (
                              <>
                                <CheckCircle2
                                  size={
                                    16
                                  }
                                />
                                Reativar
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              excluirConta(
                                company
                              )
                            }
                            disabled={
                              actionLoading ===
                              company.id
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600"
                          >
                            <Trash2
                              size={
                                16
                              }
                            />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {aberto &&
                    !company.isZionCore && (
                      <div className="border-t border-slate-100 bg-slate-50 p-5">
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-4">
                            <UserPlus
                              size={
                                18
                              }
                              className="text-blue-600"
                            />

                            <h3 className="font-semibold text-slate-800">
                              Adicionar usuário
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                            <input
                              className="bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                              placeholder="Nome"
                              value={
                                newUserName
                              }
                              onChange={(
                                e
                              ) =>
                                setNewUserName(
                                  e.target.value
                                )
                              }
                            />

                            <input
                              type="email"
                              className="bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                              placeholder="Email"
                              value={
                                newUserEmail
                              }
                              onChange={(
                                e
                              ) =>
                                setNewUserEmail(
                                  e.target.value
                                )
                              }
                            />

                            <input
                              type="password"
                              className="bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                              placeholder="Senha provisória"
                              value={
                                newUserPassword
                              }
                              onChange={(
                                e
                              ) =>
                                setNewUserPassword(
                                  e.target.value
                                )
                              }
                            />

                            <select
                              className="bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                              value={
                                newUserRole
                              }
                              onChange={(
                                e
                              ) =>
                                setNewUserRole(
                                  e.target.value as
                                    | "admin"
                                    | "atendente"
                                )
                              }
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
                            onClick={() =>
                              criarUsuario(
                                company
                              )
                            }
                            disabled={
                              creatingUser ||
                              !company.isActive
                            }
                            className="mt-3 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:bg-slate-400"
                          >
                            {creatingUser
                              ? "Criando usuário..."
                              : "Adicionar usuário"}
                          </button>
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-800 mb-3">
                            Usuários deste ambiente
                          </h3>

                          {loadingUsers ===
                          company.id ? (
                            <div className="text-sm text-slate-500 py-5">
                              Carregando usuários...
                            </div>
                          ) : (
                            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                              {users.map(
                                (
                                  user
                                ) => (
                                  <div
                                    key={
                                      user.id
                                    }
                                    className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-slate-800">
                                          {
                                            user.name
                                          }
                                        </p>

                                        {user.isActive ? (
                                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                                            Ativo
                                          </span>
                                        ) : (
                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                                            Desativado
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-sm text-slate-500 mt-1">
                                        {
                                          user.email
                                        }
                                      </p>

                                      {!user.isActive &&
                                        user.deactivatedReason && (
                                          <p className="text-xs text-red-500 mt-1">
                                            {
                                              user.deactivatedReason
                                            }
                                          </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                      <select
                                        value={
                                          user.role
                                        }
                                        disabled={
                                          actionLoading ===
                                          user.id
                                        }
                                        onChange={(
                                          e
                                        ) =>
                                          alterarRole(
                                            company.id,
                                            user,
                                            e.target.value as
                                              | "admin"
                                              | "atendente"
                                          )
                                        }
                                        className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                                      >
                                        <option value="atendente">
                                          Atendente
                                        </option>

                                        <option value="admin">
                                          Administrador
                                        </option>
                                      </select>

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

                                      <button
                                        type="button"
                                        onClick={() =>
                                          alterarStatusUsuario(
                                            company.id,
                                            user
                                          )
                                        }
                                        disabled={
                                          actionLoading ===
                                          user.id
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

                                      <button
                                        type="button"
                                        onClick={() =>
                                          excluirUsuario(
                                            company.id,
                                            user
                                          )
                                        }
                                        disabled={
                                          actionLoading ===
                                          user.id
                                        }
                                        className="p-2 rounded-lg bg-red-50 text-red-600"
                                      >
                                        <Trash2
                                          size={
                                            16
                                          }
                                        />
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              );
            }
          )}
        </div>
      </div>

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

                <p className="text-xs text-slate-400 mt-1">
                  {
                    passwordUser.email
                  }
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