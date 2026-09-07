"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hbqgwyrnpqkoyufznbta.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhicWd3eXJucHFrb3l1ZnpuYnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk1MTMsImV4cCI6MjEwNDE5NTUxM30.WUVI3EPNB8GneKOiM4i2IOefml2r0ccPqG7CfD0kR-M"
);

const COMPANY_ID = "b36f5364-dd05-4e56-9247-8802adc8cd75";

type Contato = {
  id: string;
  name: string;
  phone: string;
};

export default function ContatosPage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarContatos = async () => {
    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from("Contact")
        .select("id, name, phone")
        .eq("companyId", COMPANY_ID);

      if (error) {
        console.log("Erro ao carregar contatos:", error.message);

        alert(
          `Erro ao carregar contatos:

Mensagem: ${error.message}

Código: ${error.code || "sem código"}`
        );

        return;
      }

      setContatos(data || []);
    } catch (erro) {
      console.log("Erro inesperado ao carregar contatos:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarContatos();
  }, []);

  const salvarLeadReal = async () => {
    if (!nome.trim() || !telefone.trim()) {
      alert("Preencha o nome e o WhatsApp!");
      return;
    }

    setSalvando(true);

    try {
      const { error } = await supabase
        .from("Contact")
        .insert([
          {
            name: nome.trim(),
            phone: telefone.trim(),
            companyId: COMPANY_ID,
          },
        ]);

      if (error) {
        console.log("ERRO SUPABASE");
        console.log("Mensagem:", error.message);
        console.log("Código:", error.code);
        console.log("Detalhes:", error.details);
        console.log("Hint:", error.hint);

        alert(
          `Erro ao salvar:

Mensagem: ${error.message}

Código: ${error.code || "sem código"}

Detalhes: ${error.details || "sem detalhes"}

Hint: ${error.hint || "sem hint"}`
        );

        return;
      }

      setNome("");
      setTelefone("");

      await carregarContatos();

      alert("Lead salvo com sucesso no CRM Zion! 🚀");
    } catch (erro) {
      console.log("ERRO INESPERADO:", erro);

      if (erro instanceof Error) {
        alert(`Erro inesperado: ${erro.message}`);
      } else {
        alert("Ocorreu um erro inesperado ao salvar o contato.");
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Contatos
          </h1>

          <p className="text-slate-500 mt-2">
            Gerencie os contatos e leads do CRM Zion.
          </p>
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
                  onChange={(e) => setNome(e.target.value)}
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
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={salvarLeadReal}
                disabled={salvando}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar contato"}
              </button>

            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            <div className="p-6 border-b border-slate-200 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Lista de contatos
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {contatos.length} contato(s)
                </p>
              </div>

              <button
                onClick={carregarContatos}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Atualizar
              </button>

            </div>

            {carregando ? (
              <div className="p-10 text-center text-slate-500">
                Carregando contatos...
              </div>
            ) : contatos.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-500">
                  Nenhum contato cadastrado.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {contatos.map((contato) => (
                  <div
                    key={contato.id}
                    className="p-5 flex items-center justify-between hover:bg-slate-50 transition"
                  >

                    <div className="flex items-center gap-4">

                      <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {contato.name
                          ? contato.name.charAt(0).toUpperCase()
                          : "?"}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {contato.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          {contato.phone}
                        </p>
                      </div>

                    </div>

                    <div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                        Novo contato
                      </span>
                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}