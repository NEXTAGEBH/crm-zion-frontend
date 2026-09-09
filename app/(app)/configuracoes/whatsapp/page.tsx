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

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
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

  const authCodeRef =
    useRef<
      string | null
    >(null);

  const sessionRef =
    useRef<
      EmbeddedSignupData | null
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

          const receivedWabaId =
            sessionData.waba_id ||
            null;

          const receivedPhoneNumberId =
            sessionData.phone_number_id ||
            null;

          setWabaId(
            receivedWabaId
          );

          setPhoneNumberId(
            receivedPhoneNumberId
          );

          setError(null);

          setSuccess(
            data.event ===
              "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
              ? "Cadastro por coexistência concluído na Meta. O WhatsApp Business foi autorizado."
              : "Cadastro do WhatsApp concluído na Meta."
          );

          setLoading(false);

          return;
        }

        if (
          data.event ===
          "ERROR"
        ) {
          setLoading(false);

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

      sessionRef.current =
        null;

      if (
        !configuracaoPronta
      ) {
        setError(
          "As variáveis NEXT_PUBLIC_META_APP_ID e NEXT_PUBLIC_WHATSAPP_CONFIG_ID não foram encontradas."
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
          const code =
            response
              .authResponse
              ?.code;

          if (code) {
            authCodeRef.current =
              code;

            setAuthorizationReceived(
              true
            );

            /*
             * Não mostramos nem armazenamos
             * o código no navegador.
             *
             * No próximo passo ele será enviado
             * imediatamente para uma rota segura
             * do backend do CRM Zion.
             */
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

          response_type:
            "code",

          override_default_response_type:
            true,

          extras: {
            setup: {},

            /*
             * Ativa o fluxo oficial de
             * WhatsApp Business App Coexistence.
             */
            featureType:
              "whatsapp_business_app_onboarding",
          },
        }
      );
    }, [
      configId,
      configuracaoPronta,
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
                Ao continuar, será aberta a janela oficial da Meta. Para contas elegíveis ao modo de coexistência, o próprio fluxo apresentará as etapas necessárias para vincular o WhatsApp Business existente.
              </p>
            </div>

            <button
              type="button"
              onClick={
                conectarWhatsApp
              }
              disabled={
                loading ||
                !sdkReady ||
                !configuracaoPronta
              }
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Abrindo Meta...
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
                  Etapa da Meta concluída
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
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800">
                Dados do cadastro recebidos
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
                    WABA identificado:
                    {" "}
                    <strong>
                      {wabaId}
                    </strong>
                  </p>
                )}

                {phoneNumberId && (
                  <p>
                    Número identificado:
                    {" "}
                    <strong>
                      {phoneNumberId}
                    </strong>
                  </p>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-blue-600">
                Nesta etapa estamos validando o Cadastro Incorporado e o fluxo de QR Code. A credencial temporária não é exibida nem salva no navegador. No próximo passo vamos finalizar a conexão no backend e gravar a conta no CRM.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
