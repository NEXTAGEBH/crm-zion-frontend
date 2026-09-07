"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  UserRound,
  Users,
  RefreshCw,
  GitBranchPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type UserRole =
  | "zion_admin"
  | "admin"
  | "atendente";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

type Contato = {
  id: string;
  name: string;
  phone: string;
  origin?: string | null;
  funnelStepId?: string | null;
  responsibleId?: string | null;
  createdAt?: string;
};

export default function ContatosPage() {
  const [
    nome,
    setNome,
  ] = useState("");

  const [
    telefone,
    setTelefone,
  ] = useState("");

  const [
    origem,
    setOrigem,
  ] = useState("");

  const [
    novoResponsavelId,
    setNovoResponsavelId,
  ] = useState("");

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    contatos,
    setContatos,
  ] = useState<Contato[]>([]);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    companyId,
    setCompanyId,
  ] = useState<string | null>(
    null
  );

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<string | null>(
    null
  );

  const [
    userRole,
    setUserRole,
  ] = useState<UserRole | null>(
    null
  );

  const [
    emailUsuario,
    setEmailUsuario,
  ] = useState("");

  const [
    teamUsers,
    setTeamUsers,
  ] = useState<TeamUser[]>([]);

  const [
    atribuindo,
    setAtribuindo,
  ] = useState<string | null>(
    null
  );

  const inicializacaoExecutada =
    useRef(false);

  const isAdmin =
    userRole === "admin" ||
    userRole === "zion_admin";

  const buscarContextoUsuario =
    async () => {
      const {
        data: { user },
        error: erroUsuario,
      } =
        await supabase.auth.getUser();

      if (
        erroUsuario ||
        !user
      ) {
        alert(
          erroUsuario?.message ||
            "Nenhum usuário autenticado."
        );

        window.location.href =
          "/login";

        return null;
      }

      setEmailUsuario(
        user.email || ""
      );

      const {
        data: usuarioCRM,
        error: erroCRM,
      } = await supabase
        .from("User")
        .select(
          "id, name, email, companyId, role, isActive"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

      if (
        erroCRM ||
        !usuarioCRM
      ) {
        alert(
          erroCRM?.message ||
            "Usuário não encontrado no CRM."
        );

        return null;
      }

      if (
        !usuarioCRM.companyId
      ) {
        alert(
          "Usuário sem ambiente vinculado."
        );

        return null;
      }

      const role =
        String(
          usuarioCRM.role
        )
          .trim()
          .toLowerCase() as UserRole;

      setCompanyId(
        usuarioCRM.companyId
      );

      setCurrentUserId(
        usuarioCRM.id
      );

      setUserRole(role);

      return {
        id:
          usuarioCRM.id,

        companyId:
          usuarioCRM.companyId,

        role,
      };
    };

  const carregarUsuarios =
    async (
      empresaId: string,
      role: UserRole,
      usuarioId: string
    ) => {
      if (
        role === "atendente"
      ) {
        const {
          data,
        } = await supabase
          .from("User")
          .select(
            "id, name, email, role, isActive"
          )
          .eq(
            "id",
            usuarioId
          )
          .maybeSingle();

        setTeamUsers(
          data ? [data] : []
        );

        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("User")
        .select(
          "id, name, email, role, isActive"
        )
        .eq(
          "companyId",
          empresaId
        )
        .order(
          "name",
          {
            ascending: true,
          }
        );

      if (error) {
        console.error(
          "Erro ao carregar usuários:",
          error
        );

        return;
      }

      setTeamUsers(
        data || []
      );
    };

  const carregarContatos =
    async (
      empresaId?: string,
      role?: UserRole,
      usuarioId?: string
    ) => {
      const empresaAtual =
        empresaId ||
        companyId;

      const roleAtual =
        role ||
        userRole;

      const usuarioAtual =
        usuarioId ||
        currentUserId;

      if (!empresaAtual) {
        setContatos([]);
        setCarregando(false);

        return;
      }

      setCarregando(true);

      try {
        let query =
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
                ascending: false,
              }
            );

        if (
          roleAtual ===
            "atendente" &&
          usuarioAtual
        ) {
          query =
            query.eq(
              "responsibleId",
              usuarioAtual
            );
        }

        const {
          data,
          error,
        } = await query;

        if (error) {
          console.error(
            "Erro ao carregar contatos:",
            error
          );

          alert(
            `Erro ao carregar contatos: ${error.message}`
          );

          return;
        }

        setContatos(
          data || []
        );
      } finally {
        setCarregando(false);
      }
    };

  useEffect(() => {
    if (
      inicializacaoExecutada.current
    ) {
      return;
    }

    inicializacaoExecutada.current =
      true;

    const inicializar =
      async () => {
        setCarregando(true);

        const contexto =
          await buscarContextoUsuario();

        if (!contexto) {
          setCarregando(false);

          return;
        }

        await Promise.all([
          carregarUsuarios(
            contexto.companyId,
            contexto.role,
            contexto.id
          ),

          carregarContatos(
            contexto.companyId,
            contexto.role,
            contexto.id
          ),
        ]);
      };

    inicializar();
  }, []);

  const salvarLeadReal =
    async () => {
      if (
        !nome.trim() ||
        !telefone.trim()
      ) {
        alert(
          "Preencha o nome e o WhatsApp!"
        );

        return;
      }

      if (
        !companyId ||
        !currentUserId ||
        !userRole
      ) {
        alert(
          "Não foi possível identificar seu acesso."
        );

        return;
      }

      setSalvando(true);

      try {
        /*
         * Busca automaticamente a primeira
         * etapa configurada no funil.
         *
         * Não dependemos do nome
         * "Novo contato".
         */
        const {
          data: primeiraEtapa,
          error: etapaError,
        } = await supabase
          .from("FunnelStep")
          .select(
            "id, name, order"
          )
          .eq(
            "companyId",
            companyId
          )
          .order(
            "order",
            {
              ascending: true,
            }
          )
          .limit(1)
          .maybeSingle();

        if (etapaError) {
          alert(
            `Erro ao identificar a primeira etapa do funil: ${etapaError.message}`
          );

          return;
        }

        if (!primeiraEtapa) {
          alert(
            "Nenhuma etapa foi configurada para este funil. Configure pelo menos uma etapa antes de cadastrar contatos."
          );

          return;
        }

        const responsibleId =
          userRole ===
          "atendente"
            ? currentUserId
            : novoResponsavelId ||
              null;

        const {
          error,
        } = await supabase
          .from("Contact")
          .insert([
            {
              name:
                nome.trim(),

              phone:
                telefone.trim(),

              origin:
                origem.trim() ||
                "Manual",

              companyId,

              responsibleId,

              funnelStepId:
                primeiraEtapa.id,
            },
          ]);

        if (error) {
          alert(
            `Erro ao salvar: ${error.message}`
          );

          return;
        }

        setNome("");
        setTelefone("");
        setOrigem("");
        setNovoResponsavelId(
          ""
        );

        await carregarContatos();

        alert(
          `Contato salvo com sucesso na etapa "${primeiraEtapa.name}". 🚀`
        );
      } finally {
        setSalvando(false);
      }
    };

  const atribuirResponsavel =
    async (
      contatoId: string,
      responsibleId:
        string | null
    ) => {
      if (!isAdmin) {
        return;
      }

      setAtribuindo(
        contatoId
      );

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session) {
          alert(
            "Sessão não encontrada."
          );

          return;
        }

        const response =
          await fetch(
            "/api/contacts/assign",
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body:
                JSON.stringify({
                  contactId:
                    contatoId,

                  responsibleId,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          alert(
            data.error ||
              "Erro ao atribuir responsável."
          );

          return;
        }

        await carregarContatos();
      } finally {
        setAtribuindo(
          null
        );
      }
    };

  const nomeResponsavel =
    (
      responsibleId:
        string | null | undefined
    ) => {
      if (
        !responsibleId
      ) {
        return "Sem responsável";
      }

      const user =
        teamUsers.find(
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

  const usuariosAtivos =
    teamUsers.filter(
      (user) =>
        user.isActive &&
        user.role !==
          "zion_admin"
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Contatos
          </h1>

          <p className="text-slate-500 mt-2">
            {isAdmin
              ? "Gerencie e distribua os leads entre sua equipe."
              : "Visualize os leads atribuídos a você."}
          </p>

          {emailUsuario && (
            <p className="text-sm text-slate-400 mt-1">
              Usuário conectado:{" "}
              {emailUsuario}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-xl font-bold text-slate-800 mb-5">
              Novo contato
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Nome
                </label>

                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={nome}
                  onChange={(e) =>
                    setNome(
                      e.target.value
                    )
                  }
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  WhatsApp
                </label>

                <input
                  type="text"
                  placeholder="31999999999"
                  value={telefone}
                  onChange={(e) =>
                    setTelefone(
                      e.target.value
                    )
                  }
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Origem
                </label>

                <input
                  type="text"
                  placeholder="Meta Ads, Instagram, Indicação..."
                  value={origem}
                  onChange={(e) =>
                    setOrigem(
                      e.target.value
                    )
                  }
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Responsável
                  </label>

                  <select
                    value={
                      novoResponsavelId
                    }
                    onChange={(e) =>
                      setNovoResponsavelId(
                        e.target.value
                      )
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800"
                  >
                    <option value="">
                      Sem responsável
                    </option>

                    {usuariosAtivos.map(
                      (user) => (
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
              )}

              {!isAdmin && (
                <div className="bg-blue-50 text-blue-700 rounded-xl p-3 text-sm">
                  Contatos criados por você serão atribuídos automaticamente ao seu usuário.
                </div>
              )}

              <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <GitBranchPlus
                  size={16}
                  className="text-slate-500 mt-0.5 flex-shrink-0"
                />

                <p className="text-xs text-slate-500">
                  O novo contato será adicionado automaticamente à primeira etapa do funil.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  salvarLeadReal
                }
                disabled={
                  salvando ||
                  !companyId
                }
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all disabled:bg-slate-400"
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar contato"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {isAdmin
                    ? "Lista de contatos"
                    : "Meus contatos"}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {
                    contatos.length
                  }{" "}
                  contato(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  carregarContatos()
                }
                disabled={
                  !companyId ||
                  carregando
                }
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={
                    carregando
                      ? "animate-spin"
                      : ""
                  }
                />

                Atualizar
              </button>
            </div>

            {carregando ? (
              <div className="p-10 text-center text-slate-500">
                Carregando contatos...
              </div>
            ) : contatos.length ===
              0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-500">
                  {isAdmin
                    ? "Nenhum contato cadastrado."
                    : "Nenhum lead foi atribuído a você."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {contatos.map(
                  (contato) => (
                    <div
                      key={
                        contato.id
                      }
                      className="p-5 hover:bg-slate-50 transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                            {contato.name
                              ?.charAt(
                                0
                              )
                              .toUpperCase() ||
                              "?"}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {
                                contato.name
                              }
                            </p>

                            <p className="text-sm text-slate-500">
                              {
                                contato.phone
                              }
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              Origem:{" "}
                              {contato.origin ||
                                "Não informado"}
                            </p>
                          </div>
                        </div>

                        <div className="md:min-w-[220px]">
                          {isAdmin ? (
                            <div>
                              <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                                <Users
                                  size={
                                    13
                                  }
                                />

                                Responsável
                              </label>

                              <select
                                value={
                                  contato.responsibleId ||
                                  ""
                                }
                                disabled={
                                  atribuindo ===
                                  contato.id
                                }
                                onChange={(e) =>
                                  atribuirResponsavel(
                                    contato.id,
                                    e.target
                                      .value ||
                                      null
                                  )
                                }
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100"
                              >
                                <option value="">
                                  Sem responsável
                                </option>

                                {usuariosAtivos.map(
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
                            <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                              <UserRound
                                size={
                                  15
                                }
                              />

                              {nomeResponsavel(
                                contato.responsibleId
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}