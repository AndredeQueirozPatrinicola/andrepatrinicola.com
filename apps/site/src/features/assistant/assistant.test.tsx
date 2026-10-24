import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { renderLocalized as RenderLocalized } from "../../test/render";
import { AnswerText, parseBlocks } from "./AnswerText";

const API = "https://api.example.test/ai/chat";
const sessionToken = "s".repeat(43);

type TurnstileOptions = { callback: (token: string) => void; action: string; appearance?: string };
let turnstileOptions: TurnstileOptions | undefined;

function stubTurnstile() {
  turnstileOptions = undefined;
  window.turnstile = {
    render: (_element: HTMLElement, options: TurnstileOptions) => {
      turnstileOptions = options;
      setTimeout(() => options.callback("human-token"));
      return "widget";
    },
    reset: () => setTimeout(() => turnstileOptions?.callback("human-token-2")),
    remove: () => undefined,
  } as never;
}

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let renderLocalized: typeof RenderLocalized;

/**
 * Loads the launcher with the build-time variables set (they are read when
 * the module loads), with the matching i18n module instance.
 */
async function loadLauncher(url = API) {
  vi.resetModules();
  vi.stubEnv("VITE_AI_CHAT_API_URL", url);
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
  ({ renderLocalized } = await import("../../test/render"));
  return (await import("./AssistantLauncher")).AssistantLauncher;
}

beforeEach(() => {
  stubTurnstile();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // The Turnstile loader appends a script tag: answer it as loaded.
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    setTimeout(() => (node as HTMLScriptElement).onload?.(new Event("load")));
    return node;
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete window.turnstile;
});

describe("AssistantLauncher", () => {
  it("renders nothing when the build did not configure the assistant", async () => {
    const AssistantLauncher = await loadLauncher("");
    const { container } = renderLocalized(<AssistantLauncher />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is a single closed button that loads and calls nothing until opened", async () => {
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />, { locale: "pt" });
    const button = screen.getByRole("button", { name: "Perguntar ao assistente do portfólio" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(turnstileOptions).toBeUndefined();
  });

  it("stays hidden while the consent banner is up", async () => {
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher concealed />);
    expect(screen.queryByRole("button", { name: "Ask the portfolio assistant" })).toBeNull();
  });

  it.each([
    ["pt", "Assistente do portfólio", "Como posso entrar em contato?"],
    ["en", "Portfolio assistant", "How can I get in touch?"],
    ["es", "Asistente del portafolio", "¿Cómo puedo ponerme en contacto?"],
  ] as const)("opens in %s with translated suggestions", async (locale, title, suggestion) => {
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />, { locale });
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(await screen.findByRole("dialog", { name: title })).toBeVisible();
    expect(screen.getByRole("button", { name: suggestion })).toBeInTheDocument();
  });

  it("asks a question with the Turnstile token, shows the answer and its sources", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        answer: "O portfólio usa **AWS Lambda**.\n\n- API Gateway\n- DynamoDB",
        sources: [
          { title: "Como construí meu portfólio", url: `${window.location.origin}/pt/blog/portfolio`, type: "article" },
          { title: "Phishing", url: "https://evil.test/pt/x", type: "article" },
        ],
        sessionToken,
        remaining: 9,
        fallback: false,
      }),
    );
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />, { locale: "pt" });
    await userEvent.click(screen.getByRole("button", { name: "Perguntar ao assistente do portfólio" }));
    const input = await screen.findByRole("textbox", { name: "Sua pergunta" });
    await waitFor(() => expect(input).toHaveFocus());
    await waitFor(() => expect(turnstileOptions).toMatchObject({ action: "chat", appearance: "interaction-only" }));

    await userEvent.type(input, "Como você usa AWS?{Enter}");

    expect(await screen.findByText("AWS Lambda")).toContainHTML("strong");
    expect(screen.getByText("DynamoDB").tagName).toBe("LI");
    expect(screen.getByRole("link", { name: "Como construí meu portfólio" })).toHaveAttribute("href", "/pt/blog/portfolio");
    expect(screen.queryByRole("link", { name: "Phishing" })).toBeNull();
    expect(screen.getByText("Perguntas restantes nesta conversa: 9")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(API);
    expect(JSON.parse(String(init?.body))).toEqual({ message: "Como você usa AWS?", locale: "pt", turnstileToken: "human-token" });
  });

  it("continues with the session token and no new verification", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { answer: "Primeira", sources: [], sessionToken, remaining: 9, fallback: true }))
      .mockResolvedValueOnce(json(200, { answer: "Segunda", sources: [], sessionToken, remaining: 8, fallback: true }));
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />, { locale: "pt" });
    await userEvent.click(screen.getByRole("button", { name: "Perguntar ao assistente do portfólio" }));
    const input = await screen.findByRole("textbox");
    await waitFor(() => expect(turnstileOptions).toBeDefined());
    await userEvent.type(input, "Um{Enter}");
    await screen.findByText("Primeira");
    await userEvent.type(input, "Dois{Enter}");
    await screen.findByText("Segunda");
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]?.body))).toEqual({ message: "Dois", locale: "pt", sessionToken });
  });

  it("shows a loading state and blocks a second question meanwhile", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the portfolio assistant" }));
    await waitFor(() => expect(turnstileOptions).toBeDefined());
    await userEvent.click(await screen.findByRole("button", { name: "How can I get in touch?" }));
    expect(await screen.findByText("Searching the portfolio's sources…")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "Another one");
    expect(screen.getByRole("button", { name: "Send question" })).toBeDisabled();
    finish(json(200, { answer: "Use the About page.", sources: [], sessionToken, remaining: 9, fallback: true }));
    expect(await screen.findByText("Use the About page.")).toBeInTheDocument();
  });

  it.each([
    [429, { error: "rate_limited" }, "Too many questions in a short time. Wait a minute and try again."],
    [429, { error: "daily_limit" }, "You reached today's question limit. To talk to André, use the About page."],
    [429, { message: "Too Many Requests" }, "The assistant is busy. Try again in a few seconds."],
    [503, { error: "capacity" }, "The assistant is unavailable right now. To talk to André, use the About page."],
    [400, { error: "invalid_request", fields: ["turnstileToken"] }, "We couldn't confirm you are not a robot. Please try again."],
    [500, { error: "internal_error" }, "Couldn't answer right now. Please try again."],
  ])("explains a %i answer", async (status, body, message) => {
    fetchMock.mockResolvedValueOnce(json(status, body));
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the portfolio assistant" }));
    await waitFor(() => expect(turnstileOptions).toBeDefined());
    await userEvent.type(await screen.findByRole("textbox"), "Hello?{Enter}");
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("starts over when the conversation reached its limit", async () => {
    fetchMock.mockResolvedValueOnce(json(429, { error: "conversation_limit" }));
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the portfolio assistant" }));
    await waitFor(() => expect(turnstileOptions).toBeDefined());
    await userEvent.type(await screen.findByRole("textbox"), "Hello?{Enter}");
    await screen.findByText("This conversation reached its question limit. Start a new one.");
    await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
    expect(screen.getByRole("button", { name: "How can I get in touch?" })).toBeInTheDocument();
  });

  it("closes with Escape and gives the focus back to the button, keeping the conversation", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { answer: "Kept answer", sources: [], sessionToken, remaining: 9, fallback: true }));
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />);
    const launcher = screen.getByRole("button", { name: "Ask the portfolio assistant" });
    await userEvent.click(launcher);
    await waitFor(() => expect(turnstileOptions).toBeDefined());
    await userEvent.type(await screen.findByRole("textbox"), "Hi{Enter}");
    await screen.findByText("Kept answer");

    const keys: string[] = [];
    const listener = (event: KeyboardEvent) => keys.push(event.key);
    window.addEventListener("keydown", listener);
    await userEvent.keyboard("{Escape}");
    window.removeEventListener("keydown", listener);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(launcher).toHaveFocus();
    expect(keys).toEqual([]); // the page's own shortcuts never saw it
    await userEvent.click(launcher);
    expect(screen.getByText("Kept answer")).toBeInTheDocument();
  });

  it("refuses questions over the limit without calling the API", async () => {
    const AssistantLauncher = await loadLauncher();
    renderLocalized(<AssistantLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Ask the portfolio assistant" }));
    const input = (await screen.findByRole("textbox")) as HTMLTextAreaElement;
    expect(input.maxLength).toBe(500);
  });
});

describe("AnswerText", () => {
  it("renders model text as text, never as HTML or links", () => {
    render(<AnswerText text={'<img src=x onerror="alert(1)"> veja https://evil.test e [clique](https://evil.test)'} />);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("a")).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });

  it("understands paragraphs, lists and emphasis", () => {
    expect(parseBlocks("Um\ndois\n\n- a\n- b\n\n3. c\n4. d\n## Título")).toEqual([
      { kind: "p", lines: ["Um", "dois"] },
      { kind: "ul", items: ["a", "b"], start: 1 },
      { kind: "ol", items: ["c", "d"], start: 3 },
      { kind: "p", lines: ["Título"] },
    ]);
    render(<AnswerText text={"*itálico* e `código`"} />);
    expect(screen.getByText("itálico").tagName).toBe("EM");
    expect(screen.getByText("código").tagName).toBe("CODE");
  });
});
