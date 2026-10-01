import Link from "next/link";
import { Logo } from "@/components/logo";

const STEPS = [
  {
    n: "1",
    title: "Conecte sua IA",
    text: "Use sua assinatura do ChatGPT ou do Claude, ou cole uma chave de API. Você escolhe o cérebro.",
  },
  {
    n: "2",
    title: "Dê uma personalidade",
    text: "Nome, jeito de falar e o que ela precisa saber sobre você. Em dois minutos ela já é sua.",
  },
  {
    n: "3",
    title: "Converse no Telegram",
    text: "Crie seu bot com o @BotFather seguindo nosso passo a passo e pronto: ela mora no seu bolso.",
  },
];

const FEATURES = [
  { icon: "🧠", title: "Memória de verdade", text: "Lembra das suas preferências, projetos e pessoas importantes entre uma conversa e outra." },
  { icon: "⏰", title: "Lembretes e rotinas", text: "“Me lembra de pagar o boleto sexta às 9h.” Ela agenda, cobra e confirma." },
  { icon: "📅", title: "Google Agenda", text: "Consulta, marca e remarca compromissos por mensagem. (chegando em breve)", soon: true },
  { icon: "🔒", title: "Servidor só seu", text: "Cada agente roda isolado, com dados e credenciais separados dos outros usuários." },
  { icon: "🔁", title: "Troque de IA quando quiser", text: "Começou com ChatGPT e quer testar o Claude? Troque no painel, sem perder a memória." },
  { icon: "🇧🇷", title: "Feito em português", text: "Do cadastro ao suporte, tudo pensado pra quem fala português." },
];

const FAQ = [
  {
    q: "Preciso pagar a IA à parte?",
    a: "Sim. Você conecta a sua própria conta: assinatura do ChatGPT Plus/Pro, Claude Pro/Max ou uma chave de API. Assim você controla o custo e a privacidade.",
  },
  {
    q: "É difícil criar o bot do Telegram?",
    a: "Não. O assistente de configuração mostra cada passo: abrir o @BotFather, mandar /newbot, escolher o nome e colar o token. Leva uns 2 minutos.",
  },
  {
    q: "Outras pessoas conseguem falar com o meu bot?",
    a: "Não sem a sua aprovação. Quem mandar mensagem recebe um código, e só você pode aprovar pelo painel.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Você pode apagar seu agente e todos os dados dele a qualquer momento pelo painel.",
  },
];

function ChatMock() {
  const msgs: { me?: boolean; text: string; time: string }[] = [
    { me: true, text: "me lembra de ligar pro dentista amanhã cedo", time: "21:14" },
    { text: "Fechado! Amanhã às 8h30 eu te chamo pra ligar pro dentista 🦷", time: "21:14" },
    { me: true, text: "e o que eu tenho pra fazer essa semana?", time: "21:15" },
    {
      text: "Quinta é aniversário da Ana 🎂, sexta vence o boleto do condomínio e você pediu pra eu cobrar o relatório do projeto até quarta.",
      time: "21:15",
    },
  ];
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-coral/30 via-coral-soft to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-[2.2rem] border-[6px] border-night bg-[#e7ddd3] shadow-2xl">
        <div className="flex items-center gap-3 bg-night px-4 py-3 text-cream">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-coral text-lg">🦞</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Lia</div>
            <div className="text-xs text-cream/60">bot · online</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3 pb-5">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13.5px] leading-snug shadow-sm ${
                m.me ? "self-end rounded-br-md bg-[#dcf8c6]" : "self-start rounded-bl-md bg-white"
              }`}
            >
              {m.text}
              <span className="ml-2 align-bottom text-[10px] text-ink-soft/60">{m.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#como-funciona" className="hidden px-3 text-sm text-ink-soft hover:text-ink sm:inline">
              Como funciona
            </a>
            <a href="#perguntas" className="hidden px-3 text-sm text-ink-soft hover:text-ink sm:inline">
              Perguntas
            </a>
            <Link href="/entrar" className="btn-ghost">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-primary hidden sm:inline-flex">
              Criar minha assistente
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral-soft px-3 py-1 text-xs font-semibold text-coral-deep">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" /> Movida pelo OpenClaw
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
            Sua assistente de IA, <span className="text-coral">no seu Telegram</span>, em 5 minutos.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            A Garra cria e hospeda um agente pessoal só pra você. Ele lembra das suas coisas, te cobra compromissos e
            responde na hora — usando o ChatGPT ou o Claude que você já assina.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/cadastro" className="btn-primary px-7 py-3.5 text-base">
              Criar minha assistente →
            </Link>
            <a href="#como-funciona" className="btn-ghost px-6 py-3.5 text-base">
              Ver como funciona
            </a>
          </div>
          <p className="mt-5 text-sm text-ink-soft">Sem cartão de crédito no teste · Cancele quando quiser</p>
        </div>
        <ChatMock />
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight">Três passos e pronto.</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Nada de servidor, terminal ou configuração difícil. O assistente de configuração te leva pela mão.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-3xl border border-line bg-cream p-7">
                <span className="font-display text-6xl font-extrabold text-coral/25">{s.n}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight">Mais que um chatbot.</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 flex items-center gap-2 text-lg font-semibold">
                {f.title}
                {f.soon && (
                  <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral-deep">
                    em breve
                  </span>
                )}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA escuro */}
      <section className="bg-night text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight">Use a IA que você já paga.</h2>
            <p className="mt-4 leading-relaxed text-cream/70">
              Conecte sua assinatura do <b className="text-cream">ChatGPT</b> ou do <b className="text-cream">Claude</b>{" "}
              com login pelo navegador, ou use uma chave de API da Anthropic, OpenAI ou OpenRouter.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            {["ChatGPT", "Claude", "OpenRouter"].map((p) => (
              <span key={p} className="rounded-2xl border border-cream/15 bg-cream/5 px-5 py-3 font-semibold">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="perguntas" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight">Perguntas frequentes</h2>
        <div className="mt-8 divide-y divide-line rounded-3xl border border-line bg-paper">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {f.q}
                <span className="text-coral transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/cadastro" className="btn-primary px-8 py-4 text-base">
            Criar minha assistente agora
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-soft sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} Garra · Feito no Brasil</p>
        </div>
      </footer>
    </main>
  );
}
