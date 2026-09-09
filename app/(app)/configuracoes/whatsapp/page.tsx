"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
  };
  status?: string;
};

type FacebookSDK = {
  init: (options: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;

  login: (
    callback: (
      response: FacebookLoginResponse
    ) => void,
    options: Record<
      string,
      unknown
    >
  ) => void;
};

type EmbeddedSignupData = {
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
  businessId?: string;
  current_step?: string;
  error_message?: string;
};

type EmbeddedSignupEvent = {
  type?: string;
  event?: string;
  version?: number;
  data?: EmbeddedSignupData;
};

type FacebookWindow =
  Window & {
    FB?: FacebookSDK;
    fbAsyncInit?: () => void;
  };

type WhatsAppAccount = {
  id: string;
  companyId: string;
  wabaId: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: string;
  businessId?: string | null;
  connectedVia?: string | null;
  connectedAt?: string | null;
  tokenExpiresAt?: string | null;
};

type OnboardingApiResponse = {
  error?: string;
  code?: string;
  message?: string;
  accounts?: WhatsAppAccount[];
  account?: WhatsAppAccount;
  canManage?: boolean;
};

const META_GRAPH_VERSION =
  "v26.0";

function getFacebookWindow() {
  return window as FacebookWindow;
}

function parseEmbeddedEvent(
  value: unknown
): EmbeddedSignupEvent | null {
  if (
    typeof value ===
    "string"
  ) {
    try {
      return JSON.parse(
        value
      ) as EmbeddedSignupEvent;
    } catch {
      return null;
    }
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return value as EmbeddedSignupEvent;
  }

  return null;
}

function formatarNumero(
  value:
    string |
    null
) {
  if (!value) {
    return "Número não informado";
  }

  return value;
}

function nomeTipoConexao(
  value:
    string |
    null |
    undefined
) {
  if (
    value ===
    "embedded_signup_coexistence"
  ) {
    return "API Oficial + aplicativo";
  }

  if (
    value ===
    "embedded_signup"
  ) {
    return "Cadastro Incorporado";
  }

  return "API Oficial";
}

export default function WhatsAppConfiguracaoPage() {
  const router =
    useRouter();

  const [
    sdkReady,
    setSdkReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    finalizing,
    setFinalizing,
  ] = useState(false);

  const [
    loadingAccounts,
    setLoadingAccounts,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    success,
    setSuccess,
  ] = useState<
    string | null
  >(null);

  const [
    authorizationReceived,
    setAuthorizationReceived,
  ] = useState(false);

  const [
    wabaId,
    setWabaId,
  ] = useState<
    string | null
  >(null);

  const [
    phoneNumberId,
    setPhoneNumberId,
  ] = useState<
    string | null
  >(null);

  const [
    accounts,
    setAccounts,
  ] = useState<
    WhatsAppAccount[]
  >([]);

  const [
    canManage,
    setCanManage,
  ] = useState(true);

  const authCodeRef =
    useRef<
      string | null
    >(null);

  const metaAccessTokenRef =
    useRef<
      string | null
    >(null);

  const sessionRef =
    useRef<
      EmbeddedSignupData | null
    >(null);

  const onboardingEventRef =
    useRef<
      string | null
    >(null);

  const finalizingRef =
    useRef(false);

  const fallbackTimerRef =
    useRef<
      number | null
    >(null);

  const appId =
    process.env
      .NEXT_PUBLIC_META_APP_ID
      ?.trim() ||
    "";

  const configId =
    process.env
      .NEXT_PUBLIC_WHATSAPP_CONFIG_ID
      ?.trim() ||
    "";

  const configuracaoPronta =
    Boolean(
      appId &&
      configId
    );

  const pegarToken =
    useCallback(
      async () => {
        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase
            .auth
            .getSession();

        if (sessionError) {
          throw new Error(
            sessionError.message
          );
        }

        if (
          !session
            ?.access_token
        ) {
          throw new Error(
            "Sua sessão do CRM expirou. Entre novamente."
          );
        }

        return session
          .access_token;
      },
      []
    );

  const carregarContas =
    useCallback(
      async () => {
        try {
          setLoadingAccounts(
            true
          );

          const token =
            await pegarToken();

          const response =
            await fetch(
              "/api/whatsapp/onboarding",
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
            (
              await response
                .json()
            ) as OnboardingApiResponse;

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Não foi possível carregar as contas do WhatsApp."
            );
          }

          setAccounts(
            data.accounts ||
              []
          );

          setCanManage(
            data.canManage !==
              false
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar contas do WhatsApp."
          );
        } finally {
          setLoadingAccounts(
            false
          );
        }
      },
      [pegarToken]
    );

  const inicializarSdk =
    useCallback(() => {
      const fbWindow =
        getFacebookWindow();

      if (
        !fbWindow.FB ||
        !appId
      ) {
        return;
      }

      fbWindow.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version:
          META_GRAPH_VERSION,
      });

      setSdkReady(true);
    }, [appId]);

  useEffect(() => {
    void carregarContas();
  }, [carregarContas]);

  useEffect(() => {
    if (!appId) {
      setSdkReady(false);
      return;
    }

    const fbWindow =
      getFacebookWindow();

    fbWindow.fbAsyncInit =
      inicializarSdk;

    if (fbWindow.FB) {
      inicializarSdk();
      return;
    }

    const existingScript =
      document.getElementById(
        "facebook-jssdk"
      ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        inicializarSdk
      );

      return () => {
        existingScript.removeEventListener(
          "load",
          inicializarSdk
        );
      };
    }

    const script =
      document.createElement(
        "script"
      );

    script.id =
      "facebook-jssdk";

    script.async =
      true;

    script.defer =
      true;

    script.crossOrigin =
      "anonymous";

    script.src =
      "https://connect.facebook.net/pt_BR/sdk.js";

    script.addEventListener(
      "load",
      inicializarSdk
    );

    document.body.appendChild(
      script
    );

    return () => {
      script.removeEventListener(
        "load",
        inicializarSdk
      );
    };
  }, [
    appId,
    inicializarSdk,
  ]);

  const finalizarCadastro =
    useCallback(
      async (
        credential: {
          accessToken?:
            string | null;
          code?:
            string | null;
        },
        sessionData:
          EmbeddedSignupData |
          null,
        onboardingEvent:
          string |
          null
      ) => {
        if (
          finalizingRef.current
        ) {
          return;
        }

        finalizingRef.current =
          true;

        setFinalizing(true);
        setLoading(true);
        setError(null);

        if (
          fallbackTimerRef.current
        ) {
          window.clearTimeout(
            fallbackTimerRef.current
          );

          fallbackTimerRef.current =
            null;
        }

        try {
          const token =
            await pegarToken();

          const response =
            await fetch(
              "/api/whatsapp/onboarding",
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
                    accessToken:
                      credential
                        .accessToken ||
                      null,

                    code:
                      credential
                        .code ||
                      null,

                    wabaId:
                      sessionData
                        ?.waba_id ||
                      null,

                    phoneNumberId:
                      sessionData
                        ?.phone_number_id ||
                      null,

                    businessId:
                      sessionData
                        ?.business_id ||
                      sessionData
                        ?.businessId ||
                      null,

                    onboardingEvent,
                  }),
              }
            );

          const data =
            (
              await response
                .json()
            ) as OnboardingApiResponse;

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Não foi possível finalizar a conexão do WhatsApp."
            );
          }

          if (data.account) {
            setWabaId(
              data.account
                .wabaId ||
                null
            );

            setPhoneNumberId(
              data.account
                .phoneNumberId ||
                null
            );
          }

          setSuccess(
            data.message ||
              "WhatsApp conectado ao CRM Zion com sucesso."
          );

          await carregarContas();
        } catch (err) {
          setSuccess(null);

          setError(
            err instanceof Error
              ? err.message
              : "Erro ao finalizar a conexão do WhatsApp."
          );
        } finally {
          finalizingRef.current =
            false;

          setFinalizing(false);
          setLoading(false);
        }
      },
      [
        carregarContas,
        pegarToken,
      ]
    );

  useEffect(() => {
    const sessionInfoListener =
      (
        event:
          MessageEvent
      ) => {
        if (
          !event.origin ||
          !event.origin.endsWith(
            "facebook.com"
          )
        ) {
          return;
        }

        const data =
          parseEmbeddedEvent(
            event.data
          );

        if (
          !data ||
          data.type !==
            "WA_EMBEDDED_SIGNUP"
        ) {
          return;
        }

        if (
          data.event ===
            "FINISH" ||
          data.event ===
            "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
        ) {
          const sessionData =
            data.data ||
            {};

          sessionRef.current =
            sessionData;

          onboardingEventRef.current =
            data.event ||
            null;

          setWabaId(
            sessionData
              .waba_id ||
              null
          );

          setPhoneNumberId(
            sessionData
              .phone_number_id ||
              null
          );

          setError(null);

          const accessToken =
            metaAccessTokenRef.current;

          const code =
            authCodeRef.current;

          if (
            accessToken ||
            code
          ) {
            void finalizarCadastro(
              {
                accessToken,
                code,
              },
              sessionData,
              data.event ||
                null
            );
          } else {
            setSuccess(
              "A Meta concluiu o cadastro. Aguardando a autorização para finalizar a conexão."
            );
          }

          return;
        }

        if (
          data.event ===
          "ERROR"
        ) {
          setLoading(false);
          setFinalizing(false);

          setSuccess(null);

          setError(
            data.data
              ?.error_message ||
              "A Meta informou um erro durante o cadastro do WhatsApp."
          );

          return;
        }

        if (
          data.event ===
          "CANCEL"
        ) {
          setLoading(false);
          setFinalizing(false);

          setSuccess(null);

          const currentStep =
            data.data
              ?.current_step;

          setError(
            currentStep
              ? `Cadastro cancelado na etapa ${currentStep}.`
              : "Cadastro do WhatsApp cancelado."
          );
        }
      };

    window.addEventListener(
      "message",
      sessionInfoListener
    );

    return () => {
      window.removeEventListener(
        "message",
        sessionInfoListener
      );
    };
  }, [finalizarCadastro]);

  useEffect(() => {
    return () => {
      if (
        fallbackTimerRef.current
      ) {
        window.clearTimeout(
          fallbackTimerRef.current
        );
      }
    };
  }, []);

  const conectarWhatsApp =
    useCallback(() => {
      setError(null);
      setSuccess(null);

      setAuthorizationReceived(
        false
      );

      setWabaId(null);
      setPhoneNumberId(null);

      authCodeRef.current =
        null;

      metaAccessTokenRef.current =
        null;

      sessionRef.current =
        null;

      onboardingEventRef.current =
        null;

      finalizingRef.current =
        false;

      if (
        fallbackTimerRef.current
      ) {
        window.clearTimeout(
          fallbackTimerRef.current
        );

        fallbackTimerRef.current =
          null;
      }

      if (
        !configuracaoPronta
      ) {
        setError(
          "As variáveis NEXT_PUBLIC_META_APP_ID e NEXT_PUBLIC_WHATSAPP_CONFIG_ID não foram encontradas."
        );

        return;
      }

      if (!canManage) {
        setError(
          "Somente administradores podem conectar uma conta do WhatsApp."
        );

        return;
      }

      const fb =
        getFacebookWindow()
          .FB;

      if (
        !fb ||
        !sdkReady
      ) {
        setError(
          "O SDK da Meta ainda não terminou de carregar. Aguarde alguns segundos e tente novamente."
        );

        return;
      }

      setLoading(true);

      fb.login(
        (
          response
        ) => {
          const accessToken =
            response
              .authResponse
              ?.accessToken;

          const code =
            response
              .authResponse
              ?.code;

          if (
            accessToken ||
            code
          ) {
            metaAccessTokenRef.current =
              accessToken ||
              null;

            authCodeRef.current =
              code ||
              null;

            setAuthorizationReceived(
              true
            );

            setSuccess(
              "Autorização da Meta recebida. Finalizando a conexão do WhatsApp..."
            );

            /*
             * Não salvamos nem exibimos a credencial no navegador.
             * Ela é enviada imediatamente ao backend por HTTPS.
             * Se o SDK devolver accessToken, ele tem prioridade.
             * O code fica apenas como compatibilidade.
             */
            const sessionData =
              sessionRef.current;

            const credential = {
              accessToken:
                accessToken ||
                null,

              code:
                code ||
                null,
            };

            if (sessionData) {
              void finalizarCadastro(
                credential,
                sessionData,
                onboardingEventRef
                  .current
              );

              return;
            }

            fallbackTimerRef.current =
              window.setTimeout(
                () => {
                  fallbackTimerRef.current =
                    null;

                  if (
                    !finalizingRef.current
                  ) {
                    void finalizarCadastro(
                      {
                        accessToken:
                          metaAccessTokenRef
                            .current,

                        code:
                          authCodeRef
                            .current,
                      },
                      sessionRef.current,
                      onboardingEventRef
                        .current
                    );
                  }
                },
                1800
              );

            return;
          }

          setLoading(false);

          if (
            !sessionRef.current
          ) {
            setError(
              "O cadastro não foi autorizado ou a janela da Meta foi fechada."
            );
          }
        },
        {
          config_id:
            configId,

          auth_type:
            "rerequest",

          extras: {
            setup: {},

            featureType:
              "whatsapp_business_app_onboarding",
          },
        }
      );
    }, [
      canManage,
      configId,
      configuracaoPronta,
      finalizarCadastro,
      sdkReady,
    ]);

  return (
    <div className="max-w-5xl">
      <button
        type="button"
        onClick={() =>
          router.push(
            "/configuracoes"
          )
        }
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft
          size={17}
        />
        Voltar para configurações
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <MessageCircle
              size={25}
              className="text-emerald-600"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              WhatsApp
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Conecte o WhatsApp Business ao CRM Zion pela integração oficial da Meta.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck
              size={18}
              className="text-blue-600"
            />

            <p className="text-sm font-semibold text-slate-800">
              API Oficial
            </p>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            O cadastro é realizado dentro do ambiente oficial da Meta.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <QrCode
              size={18}
              className="text-blue-600"
            />

            <p className="text-sm font-semibold text-slate-800">
              Mesmo WhatsApp
            </p>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            O fluxo de coexistência permite vincular um WhatsApp Business já utilizado pela empresa.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle
              size={18}
              className="text-blue-600"
            />

            <p className="text-sm font-semibold text-slate-800">
              CRM + aplicativo
            </p>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            O objetivo é manter o uso no aplicativo e também receber os atendimentos no Zion.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Conectar WhatsApp Business
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                A Meta solicitará uma autorização única para conectar a conta empresarial. Depois, você poderá vincular o WhatsApp Business escolhido ao CRM.
              </p>
            </div>

            <button
              type="button"
              onClick={
                conectarWhatsApp
              }
              disabled={
                loading ||
                finalizing ||
                !sdkReady ||
                !configuracaoPronta ||
                !canManage
              }
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ||
              finalizing ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  {finalizing
                    ? "Conectando..."
                    : "Abrindo Meta..."}
                </>
              ) : (
                <>
                  <QrCode
                    size={18}
                  />
                  Conectar WhatsApp
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Integração Meta
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {configuracaoPronta
                  ? sdkReady
                    ? "Configuração encontrada e SDK pronto para iniciar."
                    : "Configuração encontrada. Carregando o SDK da Meta..."
                  : "Configuração incompleta no ambiente do projeto."}
              </p>
            </div>

            {configuracaoPronta &&
            sdkReady ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2
                  size={15}
                />
                Pronto
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                <Loader2
                  size={15}
                  className={
                    configuracaoPronta
                      ? "animate-spin"
                      : ""
                  }
                />
                Aguardando
              </div>
            )}
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <XCircle
                size={19}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-sm font-semibold text-red-700">
                  Não foi possível concluir
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {error}
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-emerald-600"
              />

              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Conexão WhatsApp
                </p>

                <p className="mt-1 text-sm text-emerald-600">
                  {success}
                </p>
              </div>
            </div>
          )}

          {(authorizationReceived ||
            wabaId ||
            phoneNumberId) && (
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800">
                Dados do cadastro
              </p>

              <div className="mt-3 space-y-2 text-xs text-blue-700">
                <p>
                  Autorização:
                  {" "}
                  <strong>
                    {authorizationReceived
                      ? "recebida"
                      : "aguardando"}
                  </strong>
                </p>

                {wabaId && (
                  <p>
                    Conta WhatsApp:
                    {" "}
                    <strong>
                      identificada
                    </strong>
                  </p>
                )}

                {phoneNumberId && (
                  <p>
                    Número:
                    {" "}
                    <strong>
                      identificado
                    </strong>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Números conectados
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Contas do WhatsApp vinculadas a este ambiente do CRM.
                </p>
              </div>

              {loadingAccounts && (
                <Loader2
                  size={18}
                  className="animate-spin text-slate-400"
                />
              )}
            </div>

            {!loadingAccounts &&
            accounts.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Nenhum WhatsApp conectado por enquanto.
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map(
                  (account) => (
                    <div
                      key={
                        account.id
                      }
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {account
                            .verifiedName ||
                            "WhatsApp Business"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatarNumero(
                            account
                              .displayPhoneNumber
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {nomeTipoConexao(
                            account
                              .connectedVia
                          )}
                        </p>
                      </div>

                      <div
                        className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          account.status ===
                          "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {account.status ===
                        "active" ? (
                          <CheckCircle2
                            size={14}
                          />
                        ) : (
                          <XCircle
                            size={14}
                          />
                        )}

                        {account.status ===
                        "active"
                          ? "Conectado"
                          : "Inativo"}
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
