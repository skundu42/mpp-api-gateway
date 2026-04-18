"use client";

import {
  ApiOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  CopyOutlined,
  LinkOutlined,
  LockOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Input,
  Result,
  Space,
  Spin,
  Tag,
} from "antd";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { AppShell } from "@/components/ui/app-shell";
import { formatStatusLabel, formatUsdAmount, getStatusColor } from "@/lib/ui";
import type { ApiInvocationResult, PublicApiRoute } from "@/lib/types";

const BODYLESS_METHODS = new Set(["GET"]);
const AGENT_FUND_AMOUNT = "0.10";

type RouteContractPayload = {
  route: PublicApiRoute;
  gatewayUrl: string;
  payment: {
    method: string;
    network: string;
    chainId: number;
    currencyContract: string;
    explorerBaseUrl: string;
    rpcUrl: string;
  };
  examples: {
    curl: string;
    mppx: string;
    sampleBody: string;
  };
};

type AgentWalletPayload = {
  id: string;
  address: string;
  routeSlug: string;
  balance: {
    raw: string;
    formatted: string;
    symbol: string;
  };
  lastFundingTxHash?: string;
  lastFundingExplorerUrl?: string | null;
  lastPaymentReference?: string;
  lastPaymentExplorerUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgentCreateResponse = {
  agent: AgentWalletPayload;
};

type AgentFundResponse = {
  agent: AgentWalletPayload;
  fundedAmount: string;
};

type AgentInvokeResponse = {
  agent: AgentWalletPayload;
  invocationId: string;
  paymentReference: string;
  paymentExplorerUrl?: string | null;
  result: ApiInvocationResult;
};

type JourneyStepId = "boot" | "fund" | "prepare" | "invoke" | "response";
type JourneyStepState = "pending" | "active" | "completed" | "error";

type JourneyStepDefinition = {
  id: JourneyStepId;
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
};

type RequestBodyState = {
  parsed?: Record<string, unknown>;
  error: string | null;
  isValid: boolean;
};

const JOURNEY_STEPS: JourneyStepDefinition[] = [
  {
    id: "boot",
    label: "Step 1",
    title: "Boot demo agent",
    description: "Load the route contract and create a dedicated Tempo testnet wallet.",
    icon: <RobotOutlined />,
  },
  {
    id: "fund",
    label: "Step 2",
    title: "Fund wallet",
    description: "Top up the demo agent so it can satisfy the MPP payment challenge.",
    icon: <WalletOutlined />,
  },
  {
    id: "prepare",
    label: "Step 3",
    title: "Prepare request",
    description: "Validate the payload the agent will submit to the paid endpoint.",
    icon: <ApiOutlined />,
  },
  {
    id: "invoke",
    label: "Step 4",
    title: "Pay and invoke",
    description: "Send the paid request through the gateway and collect the proof.",
    icon: <ThunderboltOutlined />,
  },
  {
    id: "response",
    label: "Step 5",
    title: "View proof and response",
    description: "Inspect the transaction trail and the unlocked API output.",
    icon: <LinkOutlined />,
  },
];

async function parseOrThrow<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed.");
  }

  return body as T;
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function prettyResult(result: ApiInvocationResult | null) {
  if (!result) {
    return "";
  }

  if (result.kind === "proxy") {
    return formatJson({
      upstreamStatus: result.upstreamStatus,
      upstreamHeaders: result.upstreamHeaders,
      responseBody: result.responseBody,
    });
  }

  return formatJson(result);
}

function getUpstreamFailureDetails(result: ApiInvocationResult | null, method?: string) {
  if (!result || result.kind !== "proxy" || result.upstreamStatus < 400) {
    return null;
  }

  const routeMethod = method ?? "POST";

  if (
    result.upstreamStatus === 404 &&
    typeof result.responseBody === "string" &&
    result.responseBody.includes(`Cannot ${routeMethod} `)
  ) {
    return {
      title: "Payment succeeded, but the upstream endpoint rejected this HTTP method.",
      description: `Your paid route is sending ${routeMethod} to the upstream API, and that upstream path does not accept ${routeMethod}. Point the route at the correct upstream path or recreate it with the method the upstream actually supports.`,
      type: "warning" as const,
    };
  }

  if (result.upstreamStatus === 404) {
    return {
      title: "Payment succeeded, but the upstream endpoint was not found.",
      description:
        "The paid route executed, but the upstream URL returned 404. Check the upstream path and base URL.",
      type: "warning" as const,
    };
  }

  if (result.upstreamStatus === 405) {
    return {
      title: "Payment succeeded, but the upstream API does not allow this method.",
      description: `The upstream returned 405 for ${routeMethod}. Recreate the route with the correct method or point it to the upstream endpoint that accepts ${routeMethod}.`,
      type: "warning" as const,
    };
  }

  return {
    title: "Payment succeeded, but the upstream API returned an error.",
    description: `The gateway paid and invoked the route correctly, but the upstream responded with status ${result.upstreamStatus}.`,
    type: "error" as const,
  };
}

function getJourneyStatusTone(state: JourneyStepState) {
  switch (state) {
    case "completed":
      return "success";
    case "active":
      return "processing";
    case "error":
      return "error";
    default:
      return "default";
  }
}

function getJourneyStatusLabel(state: JourneyStepState) {
  switch (state) {
    case "completed":
      return "Completed";
    case "active":
      return "In progress";
    case "error":
      return "Needs attention";
    default:
      return "Locked";
  }
}

function getRouteKindLabel(routeKind: PublicApiRoute["routeKind"]) {
  switch (routeKind) {
    case "external_proxy":
      return "External proxy";
    case "internal_demo":
      return "Internal demo";
  }
}

function shortenValue(value?: string | null, leading = 10, trailing = 6) {
  if (!value) {
    return "Not available";
  }

  if (value.length <= leading + trailing + 3) {
    return value;
  }

  return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
}

export function RouteDemoApp({ slug }: { slug: string }) {
  const { message } = AntApp.useApp();
  const [details, setDetails] = useState<RouteContractPayload | null>(null);
  const [agent, setAgent] = useState<AgentWalletPayload | null>(null);
  const [requestBodyText, setRequestBodyText] = useState(
    '{\n  "prompt": "Summarize the billing event"\n}',
  );
  const [result, setResult] = useState<ApiInvocationResult | null>(null);
  const [invocationId, setInvocationId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentExplorerUrl, setPaymentExplorerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<JourneyStepId | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [busyAction, setBusyAction] = useState<"fund" | "invoke" | null>(null);

  const isBodylessMethod = BODYLESS_METHODS.has(details?.route.httpMethod ?? "POST");
  const formattedResponse = useMemo(() => prettyResult(result), [result]);
  const upstreamFailure = useMemo(
    () => getUpstreamFailureDetails(result, details?.route.httpMethod),
    [details?.route.httpMethod, result],
  );
  const requestBodyState = useMemo<RequestBodyState>(() => {
    if (isBodylessMethod) {
      return {
        parsed: undefined,
        error: null,
        isValid: true,
      };
    }

    const trimmed = requestBodyText.trim();
    if (!trimmed) {
      return {
        parsed: undefined,
        error: null,
        isValid: true,
      };
    }

    try {
      return {
        parsed: JSON.parse(trimmed) as Record<string, unknown>,
        error: null,
        isValid: true,
      };
    } catch {
      return {
        parsed: undefined,
        error: "Request body must be valid JSON.",
        isValid: false,
      };
    }
  }, [isBodylessMethod, requestBodyText]);
  const agentBalance = Number(agent?.balance.formatted ?? "0");
  const routePrice = Number(details?.route.priceAmount ?? "0");
  const bootComplete = Boolean(details && agent);
  const fundingComplete = Boolean(
    agent &&
      details &&
      (agentBalance >= routePrice || Boolean(agent.lastFundingTxHash)),
  );
  const requestReady = requestBodyState.isValid;
  const invokeComplete = Boolean(invocationId && paymentReference && result);
  const canInvoke = Boolean(agent && details && agentBalance >= routePrice && requestReady);

  const activeStepId = useMemo<JourneyStepId>(() => {
    if (!bootComplete) {
      return "boot";
    }

    if (!fundingComplete) {
      return "fund";
    }

    if (!requestReady) {
      return "prepare";
    }

    if (!invokeComplete) {
      return "invoke";
    }

    return "response";
  }, [bootComplete, fundingComplete, invokeComplete, requestReady]);

  const validationErrorStep = bootComplete && fundingComplete && !requestReady ? "prepare" : null;
  const effectiveErrorStep = errorStep ?? validationErrorStep;
  const activeStepIndex = JOURNEY_STEPS.findIndex((step) => step.id === activeStepId);
  const requestPreview = isBodylessMethod
    ? `${details?.route.httpMethod ?? "GET"} request. No JSON body is sent.`
    : requestBodyText.trim() || "{}";

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied.`);
    } catch {
      message.error(`Unable to copy ${label.toLowerCase()}.`);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const routePayload = await parseOrThrow<RouteContractPayload>(
          await fetch(`/api/routes/${slug}`, { cache: "no-store" }),
        );

        if (cancelled) {
          return;
        }

        setDetails(routePayload);
        if (!BODYLESS_METHODS.has(routePayload.route.httpMethod ?? "POST")) {
          setRequestBodyText(routePayload.examples.sampleBody);
        }

        const agentPayload = await parseOrThrow<AgentCreateResponse>(
          await fetch(`/api/demo/routes/${slug}/agent`, {
            method: "POST",
          }),
        );

        if (!cancelled) {
          setAgent(agentPayload.agent);
          setError(null);
          setErrorStep(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load the route.");
          setErrorStep("boot");
        }
      } finally {
        if (!cancelled) {
          setLoadingPage(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function fundAgent() {
    if (!agent) {
      return;
    }

    setBusyAction("fund");
    setError(null);
    setErrorStep(null);

    try {
      const payload = await parseOrThrow<AgentFundResponse>(
        await fetch(`/api/demo/routes/${slug}/agent/fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
          }),
        }),
      );

      setAgent(payload.agent);
      message.success(`Agent funded with ${formatUsdAmount(payload.fundedAmount)}.`);
    } catch (fundError) {
      setError(fundError instanceof Error ? fundError.message : "Unable to fund the agent.");
      setErrorStep("fund");
    } finally {
      setBusyAction(null);
    }
  }

  async function invokeRoute() {
    if (!agent) {
      return;
    }

    if (requestBodyState.error) {
      setError(requestBodyState.error);
      setErrorStep("prepare");
      return;
    }

    setBusyAction("invoke");
    setError(null);
    setErrorStep(null);

    try {
      const payload = await parseOrThrow<AgentInvokeResponse>(
        await fetch(`/api/demo/routes/${slug}/agent/invoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            requestBody: requestBodyState.parsed,
          }),
        }),
      );

      setAgent(payload.agent);
      setInvocationId(payload.invocationId);
      setPaymentReference(payload.paymentReference);
      setPaymentExplorerUrl(payload.paymentExplorerUrl ?? null);
      setResult(payload.result);
      message.success("Agent paid the endpoint and received the response.");
    } catch (invokeError) {
      const nextError =
        invokeError instanceof Error ? invokeError.message : "Unable to call the paid endpoint.";
      setError(nextError);
      setErrorStep("invoke");

      if (/agent not found/i.test(nextError)) {
        try {
          const refreshed = await parseOrThrow<AgentCreateResponse>(
            await fetch(`/api/demo/routes/${slug}/agent`, {
              method: "POST",
            }),
          );
          setAgent(refreshed.agent);
          setError(
            "The demo agent was reset by the server. A fresh agent has been created; fund it again and retry.",
          );
          setErrorStep("fund");
        } catch {
          setError(nextError);
          setErrorStep("invoke");
        }
      }
    } finally {
      setBusyAction(null);
    }
  }

  function getStepState(stepId: JourneyStepId): JourneyStepState {
    const stepIndex = JOURNEY_STEPS.findIndex((step) => step.id === stepId);

    if (effectiveErrorStep === stepId) {
      return "error";
    }

    if (stepId === "response" && invokeComplete) {
      return "completed";
    }

    if (stepIndex < activeStepIndex) {
      return "completed";
    }

    if (stepId === activeStepId) {
      return "active";
    }

    return "pending";
  }

  function renderLockedBody(messageText: string) {
    return (
      <div className="journey-card__locked">
        <LockOutlined />
        <span>{messageText}</span>
      </div>
    );
  }

  function renderStepBody(stepId: JourneyStepId, stepState: JourneyStepState) {
    const isLocked = stepState === "pending";

    switch (stepId) {
      case "boot":
        if (isLocked) {
          return renderLockedBody("The route needs to load before the journey can begin.");
        }

        return (
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <div className="agent-badge">
              <div className="agent-badge__icon">
                <RobotOutlined />
              </div>
              <div className="agent-badge__body">
                <div className="agent-badge__label">Agent wallet</div>
                <div className="agent-badge__value">{agent?.address}</div>
              </div>
            </div>

            <Descriptions
              column={1}
              items={[
                {
                  key: "endpoint",
                  label: "Paid endpoint",
                  children: <span className="inline-code">{details?.gatewayUrl}</span>,
                },
                {
                  key: "network",
                  label: "Tempo network",
                  children: `${details?.payment.network} · chain ${details?.payment.chainId}`,
                },
                {
                  key: "price",
                  label: "Price to pay",
                  children: `${details?.route.priceAmount} ${details?.route.currency}`,
                },
              ]}
            />

            <div className="card-actions">
              <Button
                icon={<CopyOutlined />}
                onClick={() => agent && void copy(agent.address, "Agent wallet")}
              >
                Copy agent wallet
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => details && void copy(details.gatewayUrl, "Paid endpoint")}
              >
                Copy paid endpoint
              </Button>
            </div>
          </Space>
        );
      case "fund":
        if (isLocked) {
          return renderLockedBody("Finish booting the demo agent before funding the wallet.");
        }

        return (
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <Descriptions
              column={1}
              items={[
                {
                  key: "balance",
                  label: "Current balance",
                  children: (
                    <Tag color={agentBalance > 0 ? "success" : "default"}>
                      {formatUsdAmount(agent?.balance.formatted ?? 0)}
                    </Tag>
                  ),
                },
                {
                  key: "threshold",
                  label: "Funding target",
                  children: formatUsdAmount(AGENT_FUND_AMOUNT),
                },
                {
                  key: "funding",
                  label: "Funding transaction",
                  children: agent?.lastFundingTxHash ? (
                    <Space>
                      <span className="inline-code">{agent.lastFundingTxHash}</span>
                      <Tag color="success">{formatStatusLabel("funded")}</Tag>
                    </Space>
                  ) : (
                    <Tag color="default">Not funded</Tag>
                  ),
                },
              ]}
            />

            {stepState === "completed" ? (
              <Alert
                type="success"
                showIcon
                title="Wallet funded"
                description="The demo agent has enough balance to move on to the paid request."
              />
            ) : (
              <Alert
                type="info"
                showIcon
                title="Fund the wallet before the agent can pay."
                description={`The agent needs Tempo testnet funds before it can spend ${details?.route.priceAmount} ${details?.route.currency} on the endpoint.`}
              />
            )}

            <div className="card-actions">
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={busyAction === "fund"}
                disabled={busyAction !== null || fundingComplete}
                onClick={() => void fundAgent()}
              >
                Fund agent with {formatUsdAmount(AGENT_FUND_AMOUNT)}
              </Button>
              {agent?.lastFundingExplorerUrl ? (
                <Button
                  icon={<LinkOutlined />}
                  href={agent.lastFundingExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open funding tx
                </Button>
              ) : null}
            </div>
          </Space>
        );
      case "prepare":
        if (isLocked) {
          return renderLockedBody("Fund the wallet first to unlock request preparation.");
        }

        return (
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            {isBodylessMethod ? null : (
              <div>
                <div className="muted" style={{ marginBottom: 8 }}>
                  JSON request body
                </div>
                <Input.TextArea
                  rows={stepState === "completed" ? 6 : 12}
                  value={requestBodyText}
                  onChange={(event) => {
                    setRequestBodyText(event.target.value);
                    if (errorStep === "prepare") {
                      setError(null);
                      setErrorStep(null);
                    }
                  }}
                  spellCheck={false}
                />
              </div>
            )}

            {requestBodyState.error ? (
              <Alert type="error" showIcon title={requestBodyState.error} />
            ) : (
              <Alert
                type="success"
                showIcon
                title={isBodylessMethod ? "Request is ready" : "Payload is valid"}
                description={
                  isBodylessMethod
                    ? "This route can move straight to the paid invocation step."
                    : "The request body is ready for the paid invocation step."
                }
              />
            )}

            {!isBodylessMethod ? (
              <div className="card-actions">
                <Button
                  icon={<CopyOutlined />}
                  onClick={() =>
                    details && void copy(details.examples.sampleBody, "Sample request body")
                  }
                >
                  Copy sample body
                </Button>
              </div>
            ) : null}
          </Space>
        );
      case "invoke":
        if (isLocked) {
          return renderLockedBody("Prepare a valid request before the agent can pay and invoke.");
        }

        return (
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            {!isBodylessMethod ? (
              <div className="journey-preview">
                <div className="journey-preview__label">Final request payload</div>
                <pre className="code-block">{requestPreview}</pre>
              </div>
            ) : null}

            {!canInvoke ? (
              <Alert
                type="warning"
                showIcon
                title="The agent still needs enough balance to pay."
                description={`Fund the wallet until it can cover ${details?.route.priceAmount} ${details?.route.currency}, then trigger the paid request.`}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                title="Ready to trigger the paid invocation."
                description="This action spends testnet funds, satisfies the MPP challenge, and calls the upstream API."
              />
            )}

            <Descriptions
              column={1}
              items={[
                {
                  key: "price",
                  label: "Charge",
                  children: `${details?.route.priceAmount} ${details?.route.currency}`,
                },
                {
                  key: "method",
                  label: "HTTP method",
                  children: details?.route.httpMethod ?? "POST",
                },
                {
                  key: "mppx",
                  label: "MPP example",
                  children: <span className="inline-code">{details?.examples.mppx}</span>,
                },
              ]}
            />

            <div className="card-actions">
              <Button
                type="primary"
                size="large"
                icon={<RobotOutlined />}
                loading={busyAction === "invoke"}
                disabled={!canInvoke || busyAction !== null}
                onClick={() => void invokeRoute()}
              >
                Pay endpoint and call API
              </Button>
            </div>

            {stepState === "completed" && paymentReference ? (
              <Alert
                type="success"
                showIcon
                title="Paid request sent"
                description={`Payment reference: ${paymentReference}`}
              />
            ) : null}
          </Space>
        );
      case "response":
        if (isLocked) {
          return renderLockedBody("The response stays locked until the paid request completes.");
        }

        return (
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <Descriptions
              column={1}
              items={[
                {
                  key: "payment",
                  label: "Payment reference",
                  children: paymentReference ? (
                    <Space>
                      <span className="inline-code">{paymentReference}</span>
                      <Tag color={getStatusColor("paid")}>{formatStatusLabel("paid")}</Tag>
                    </Space>
                  ) : (
                    <Tag color="default">No payment yet</Tag>
                  ),
                },
                {
                  key: "invocation",
                  label: "Invocation",
                  children: invocationId ? (
                    <span className="inline-code">{invocationId}</span>
                  ) : (
                    "Not called yet"
                  ),
                },
              ]}
            />

            {result ? (
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <Alert
                  type={upstreamFailure?.type ?? "success"}
                  showIcon
                  title={
                    upstreamFailure?.title ??
                    "Agent payment succeeded and the endpoint response is unlocked."
                  }
                  description={
                    upstreamFailure?.description ??
                    (paymentReference
                      ? `Payment reference: ${paymentReference}`
                      : "The paid request completed successfully.")
                  }
                />

                <div className="card-actions">
                  {agent?.lastFundingExplorerUrl ? (
                    <Button
                      icon={<LinkOutlined />}
                      href={agent.lastFundingExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open funding tx
                    </Button>
                  ) : null}
                  {paymentExplorerUrl ? (
                    <Button
                      icon={<LinkOutlined />}
                      href={paymentExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open payment tx
                    </Button>
                  ) : null}
                </div>

                <div className="response-shell">
                  <pre className="code-block">{formattedResponse}</pre>
                </div>
              </Space>
            ) : (
              <Result
                status="info"
                title="Response is still locked"
                subTitle="Complete the paid invocation step to reveal the API output here."
              />
            )}
          </Space>
        );
    }
  }

  if (loadingPage) {
    return (
      <AppShell current="demo">
        <Result icon={<Spin size="large" />} title="Booting the live Tempo agent flow..." />
      </AppShell>
    );
  }

  if (!details || !agent) {
    return (
      <AppShell current="demo">
        <Result status="error" title={error ?? "Route not found."} />
      </AppShell>
    );
  }

  const routeKindLabel = getRouteKindLabel(details.route.routeKind);
  const completedStepCount = JOURNEY_STEPS.filter(
    (step) => getStepState(step.id) === "completed",
  ).length;
  const progressPercent = Math.round((completedStepCount / JOURNEY_STEPS.length) * 100);
  const stageTone = effectiveErrorStep
    ? "error"
    : invokeComplete
      ? upstreamFailure
        ? "warning"
        : "complete"
      : busyAction === "invoke"
        ? "execute"
        : busyAction === "fund"
          ? "fund"
          : "standby";
  const stageTitle = effectiveErrorStep
    ? "Run paused for operator input"
    : invokeComplete
      ? upstreamFailure
        ? "Payment cleared, upstream needs attention"
        : "Premium response unlocked"
      : busyAction === "invoke"
        ? "Agent is clearing the payment challenge"
        : busyAction === "fund"
          ? "Funding wallet on Tempo testnet"
          : activeStepId === "prepare"
            ? "Payload is validated and ready"
            : activeStepId === "fund"
              ? "Agent is waiting for just-in-time capital"
              : "Provisioned wallet is standing by";
  const stageCopy = effectiveErrorStep
    ? error ?? "The live run needs attention before it can continue."
    : invokeComplete
      ? upstreamFailure?.description ??
        "The agent satisfied the MPP challenge, retried the call, and revealed the paid response."
      : busyAction === "invoke"
        ? "The wallet is spending testnet funds, satisfying the gateway challenge, and invoking the protected route."
        : busyAction === "fund"
          ? `The demo wallet is receiving ${formatUsdAmount(AGENT_FUND_AMOUNT)} so it can pay the route on demand.`
          : activeStepId === "prepare"
            ? "The contract is loaded, the wallet is funded, and the request body is ready for the paid invocation."
            : activeStepId === "fund"
              ? "This flow shows just-in-time wallet funding before the agent spends against the gateway contract."
              : "Each run provisions a dedicated wallet, fetches the contract, and keeps the premium response locked until payment succeeds.";
  const proofStatusLabel = paymentReference
    ? "Payment proof captured"
    : busyAction === "invoke"
      ? "Awaiting settlement"
      : "No proof yet";

  return (
    <AppShell
      current="demo"
      headerExtra={
        <Button href="/" icon={<ArrowLeftOutlined />}>
          Create another paid endpoint
        </Button>
      }
    >
      <div className="page-stack">
        <section className="hero-surface demo-command-surface">
          <div className="page-stack surface-pad demo-command-stack">
            <div className="page-stack demo-command-copy">
              <div className="section-heading demo-fade-up">
                <span className="section-kicker">Agentic capability walkthrough</span>
                <h1 className="section-title">
                  Watch an agent budget, pay, and unlock a premium API in one run.
                </h1>
                <p className="section-copy">
                  This live flow provisions a dedicated Tempo testnet wallet, loads the paid route
                  contract, funds the agent just in time, satisfies the MPP challenge, and reveals
                  the final response only after settlement succeeds.
                </p>
              </div>

              <div className="demo-command-pills demo-fade-up">
                <Tag color="blue">{routeKindLabel}</Tag>
                <Tag color="cyan">{details.route.httpMethod ?? "POST"} route</Tag>
                <Tag color="gold">Tempo testnet</Tag>
                <Tag color="geekblue">MPP-protected gateway</Tag>
              </div>

              {details.route.description ? (
                <div className="demo-command-note demo-fade-up">{details.route.description}</div>
              ) : null}
            </div>

            <div className="journey-rail" aria-label="Demo journey">
              {JOURNEY_STEPS.map((step, index) => {
                const stepState = getStepState(step.id);

                return (
                  <div
                    key={step.id}
                    className={`journey-rail__step journey-rail__step--${stepState}`}
                    style={{ "--step-index": index } as CSSProperties}
                  >
                    <div className="journey-rail__icon">{step.icon}</div>
                    <div className="journey-rail__body">
                      <div className="journey-step__eyebrow">{step.label}</div>
                      <div className="journey-step__title">{step.title}</div>
                      <div className="journey-rail__status">
                        <Tag color={getJourneyStatusTone(stepState)}>
                          {getJourneyStatusLabel(stepState)}
                        </Tag>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="journey-metrics">
              <div className="journey-metric">
                <div className="journey-metric__label">Endpoint</div>
                <div className="journey-metric__value">{details.route.routeName}</div>
              </div>
              <div className="journey-metric">
                <div className="journey-metric__label">Gateway slug</div>
                <div className="journey-metric__value">{details.route.slug}</div>
              </div>
              <div className="journey-metric">
                <div className="journey-metric__label">Agent balance</div>
                <div className="journey-metric__value">
                  {formatUsdAmount(agent.balance.formatted)}
                </div>
              </div>
              <div className="journey-metric">
                <div className="journey-metric__label">Price to pay</div>
                <div className="journey-metric__value">
                  {details.route.priceAmount} {details.route.currency}
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? <Alert type="error" title={error} showIcon /> : null}

        <div className="journey-layout">
          <aside className="journey-sidebar">
            <Card
              variant="borderless"
              className={`section-surface demo-stage-card demo-stage-card--${stageTone}`}
            >
              <div className={`demo-agent-stage demo-agent-stage--${stageTone}`} aria-live="polite">
                <div className="demo-agent-stage__ring demo-agent-stage__ring--outer" />
                <div className="demo-agent-stage__ring demo-agent-stage__ring--inner" />
                <div className="demo-agent-stage__core">
                  <RobotOutlined />
                </div>
                <div className="demo-agent-stage__signal">{stageTitle}</div>
              </div>

              <div className="demo-stage-copy">
                <span className="section-kicker">Live agent status</span>
                <h2 className="demo-stage-title">{stageTitle}</h2>
                <p className="section-copy">{stageCopy}</p>
              </div>

              <div className="demo-stage-progress" aria-hidden="true">
                <div
                  className="demo-stage-progress__fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="demo-stage-progress__meta">
                <span>{completedStepCount} of 5 steps settled</span>
                <span>{progressPercent}% complete</span>
              </div>

              <div className="demo-stage-stats">
                <div className="demo-stage-stat">
                  <div className="demo-stage-stat__label">Network</div>
                  <div className="demo-stage-stat__value">Tempo testnet</div>
                </div>
                <div className="demo-stage-stat">
                  <div className="demo-stage-stat__label">Mode</div>
                  <div className="demo-stage-stat__value">Agent pays, then retries</div>
                </div>
                <div className="demo-stage-stat">
                  <div className="demo-stage-stat__label">Wallet</div>
                  <div className="demo-stage-stat__value">{shortenValue(agent.address)}</div>
                </div>
                <div className="demo-stage-stat">
                  <div className="demo-stage-stat__label">Proof</div>
                  <div className="demo-stage-stat__value">{proofStatusLabel}</div>
                </div>
              </div>

              <div className="card-actions">
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => void copy(details.gatewayUrl, "Paid endpoint")}
                >
                  Copy paid endpoint
                </Button>
                {paymentExplorerUrl ? (
                  <Button
                    icon={<LinkOutlined />}
                    href={paymentExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open payment proof
                  </Button>
                ) : agent.lastFundingExplorerUrl ? (
                  <Button
                    icon={<LinkOutlined />}
                    href={agent.lastFundingExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open funding tx
                  </Button>
                ) : null}
              </div>
            </Card>
          </aside>

          <div className="journey-stack">
            {JOURNEY_STEPS.map((step, index) => {
              const stepState = getStepState(step.id);
              const showExpandedBody = stepState === "active" || stepState === "error";
              const showCompactBody = stepState === "completed";

              return (
                <Card
                  key={step.id}
                  className={`section-surface journey-card journey-card--${stepState}`}
                  style={{ "--card-index": index } as CSSProperties}
                >
                  <div className="journey-card__header">
                    <div className="journey-card__badge">{step.icon}</div>
                    <div className="journey-card__heading">
                      <div className="journey-step__eyebrow">{step.label}</div>
                      <h2 className="journey-card__title">{step.title}</h2>
                      <p className="journey-card__copy">{step.description}</p>
                    </div>
                    <div className="journey-card__status">
                      {stepState === "completed" ? <CheckCircleFilled /> : step.icon}
                      <span>{getJourneyStatusLabel(stepState)}</span>
                    </div>
                  </div>

                  {showExpandedBody || showCompactBody ? (
                    <div
                      className={`journey-card__body ${
                        showCompactBody ? "journey-card__body--compact" : ""
                      }`}
                    >
                      {renderStepBody(step.id, stepState)}
                    </div>
                  ) : (
                    <div className="journey-card__body">{renderLockedBody(step.description)}</div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
