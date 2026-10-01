import Link from "next/link";
import { Logo } from "@/components/logo";

type Status = "disponivel" | "em-breve";

const FEATURES: { icon: string; title: string; text: string; status: Status }[] = [
  {
    icon: "☀️",
    title: "Briefing da manhã",
    text: "No horário que você escolher: compromissos do dia, pendências e lembretes num resumo de 30 segundos.",
    status: "disponivel",
  },
  {
    icon: "📅",
    title: "Agenda inteligente",
    text: "Consulta, marca e remarca no Google Agenda. Encontra horário livre e avisa antes de conflitos.",
    status: "em-breve",
  },
  {
    icon: "✉️",
    title: "E-mail em ordem",
    text: "Resume a caixa de entrada, destaca o que é urgente e rascunha respostas no seu tom.",
    status: "em-breve",
  },
  {
    icon: "⏰",
    title: "Lembretes e follow-ups",
    text: "“Me cobra a proposta do João na quinta.” Ela agenda, lembra e insiste até você resolver.",
    status: "disponivel",
  },
  {
    icon: "✅",
    title: "Tarefas e prioridades",
    text: "Sua lista de pendências por mensagem, com prazos e sugestão do que atacar primeiro.",
    status: "disponivel",
  },
  {
    icon: "🎙️",
    title: "Notas de voz",
    text: "Mande um áudio no trânsito: ela transforma em tarefa, lembrete ou rascunho de e-mail.",
    status: "em-breve",
  },
  {
    icon: "🤝",
    title: "Preparação de reuniões",
    text: "Antes de cada reunião: com quem é, o que ficou em aberto da última vez e a pauta sugerida.",
    status: "em-breve",
  },
  {
    icon: "🔎",
    title: "Pesquisa e resumos",
    text: "Resume links e documentos, compara opções e tira dúvidas em segundos, sem abrir o computador.",
    status: "disponivel",
  },
  {
    icon: "🧠",
    title: "Memória do seu negócio",
    text: "Lembra clientes, preferências e decisões. Quanto mais você usa, mais ela conhece sua rotina.",
    status: "disponivel",
  },
];

const DAY: { time: string; who: "garra" | "voce"; text: string }[] = [
  { time: "07:30", who: "garra", text: "Bom dia! Hoje você tem 4 compromissos, o primeiro às 9h. 2 pendências vencem hoje." },
  { time: "09:50", who: "garra", text: "Reunião com a Construtora Alfa em 10 min. Ficou em aberto: prazo da fase 2." },
  { time: "12:40", who: "voce", text: "Lembra de mandar o orçamento revisado pro Marcos até sexta" },
  { time: "12:40", who: "garra", text: "Anotado. Te lembro quinta às 17h e de novo sexta às 9h se não estiver feito." },
  { time: "18:30", who: "garra", text: "Resumo do dia: 3 tarefas concluídas, 2 ficam para amanhã. Quer que eu reorganize?" },
];

const AUDIENCE = ["Empresários", "Executivos", "Médicos e dentistas", "Advogados", "Consultores", "Corretores"];

const STEPS = [
  { n: "1", title: "Conecte sua IA", text: "Entre com sua conta do ChatGPT ou do Claude, ou use uma chave de API." },
  { n: "2", title: "Conte como você trabalha", text: "Nome da assistente, seu ramo, horários e o jeito que prefere ser atendido." },
  { n: "3", title: "Converse pelo Telegram", text: "Crie seu bot seguindo o passo a passo. Em 5 minutos ela está trabalhando." },
];

const SECURITY = [
  { title: "Servidor dedicado", text: "Cada cliente tem sua própria instância isolada. Nada é compartilhado." },
  { title: "Só você conversa", text: "Ninguém fala com a sua assistente sem a sua aprovação no painel." },
  { title: "Credenciais protegidas", text: "Suas chaves e tokens ficam só no seu servidor, nunca no nosso banco." },
  { title: "Seus dados, sua decisão", text: "Apague a assistente e toda a memória dela quando quiser, com um clique." },
];

const FAQ = [
  {
    q: "Preciso pagar a IA à parte?",
    a: "Sim. Você conecta a sua própria conta — assinatura do ChatGPT Plus/Pro, Claude Pro/Max ou uma chave de API. Assim você controla custo e privacidade.",
  },
  {
    q: "Funciona com Google Agenda e Gmail?",
    a: "Estamos finalizando essas integrações. Hoje a assistente já cuida de lembretes, tarefas, briefing diário e pesquisas; agenda e e-mail chegam nas próximas semanas.",
  },
  {
    q: "Por que Telegram e não WhatsApp?",
    a: "O Telegram tem uma API oficial para assistentes, o que garante estabilidade e segurança. O WhatsApp está nos planos.",
  },
  {
    q: "Minha secretária ou equipe pode usar junto?",
    a: "Planos para equipes estão em desenvolvimento. Por enquanto cada assistente atende uma pessoa.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Você apaga a assistente e todos os dados dela a qualquer momento, direto pelo painel.",
  },
];

function Badge({ status }: { status: Status }) {
  return status === "disponivel" ? (
    <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-semibold text-mint">disponível</span>
  ) : (
    <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral-deep">em breve</span>
  );
}

function BriefingMock() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-coral/25 via-coral-soft/60 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-[2.2rem] border-[6px] border-night bg-chat-bg shadow-2xl">
        <div className="flex items-center gap-3 bg-night px-4 py-3 text-on-night">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-coral text-lg">🦞</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Lia · assistente</div>
            <div className="text-xs opacity-60">online</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3 pb-5 text-[13.5px] leading-snug">
          <div className="max-w-[90%] self-start rounded-2xl rounded-bl-md bg-bubble-in px-3 py-2 shadow-sm">
            <p className="font-semibold">☀️ Bom dia, Ricardo! Sua quinta-feira:</p>
            <ul className="mt-1.5 space-y-1">
              <li>📅 09:00 · Reunião com a Construtora Alfa</li>
              <li>📅 14:30 · Call com investidor (link no convite)</li>
              <li>✉️ 2 e-mails urgentes: contrato e NF pendente</li>
              <li>⏰ Cobrar proposta do João até 18h</li>
            </ul>
            <span className="mt-1 block text-right text-[10px] text-ink-soft">07:30</span>
          </div>
          <div className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-bubble-out px-3 py-2 shadow-sm">
            Move a call do investidor pra 16h e avisa ele
            <span className="ml-2 align-bottom text-[10px] text-ink-soft">07:32</span>
          </div>
          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-bubble-in px-3 py-2 shadow-sm">
            Feito ✅ Call remarcada para 16h e o investidor já recebeu o novo convite.
            <span className="ml-2 align-bottom text-[10px] text-ink-soft">07:32</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1 overflow-x-clip">
      {/* Navegação */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#recursos" className="hidden px-3 text-sm text-ink-soft hover:text-ink md:inline">
              Recursos
            </a>
            <a href="#como-funciona" className="hidden px-3 text-sm text-ink-soft hover:text-ink md:inline">
              Como funciona
            </a>
            <a href="#perguntas" className="hidden px-3 text-sm text-ink-soft hover:text-ink md:inline">
              Perguntas
            </a>
            <Link href="/entrar" className="btn-ghost px-4">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-primary hidden sm:inline-flex">
              Começar agora
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pb-24 md:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral-soft px-3 py-1 text-xs font-semibold text-coral-deep">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" /> Assistente executiva com IA
          </span>
          <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
            Menos agenda na cabeça. <span className="text-coral">Mais tempo para decidir.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            A Garra é uma assistente pessoal com IA que organiza sua agenda, põe ordem nos e-mails, cobra seus
            compromissos e prepara seu dia — tudo por mensagem, no Telegram, a qualquer hora.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/cadastro" className="btn-primary px-7 py-3.5 text-base">
              Quero minha assistente →
            </Link>
            <a href="#um-dia" className="btn-ghost px-6 py-3.5 text-base">
              Ver um dia com ela
            </a>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
            <li>✓ Pronta em 5 minutos</li>
            <li>✓ Servidor dedicado</li>
            <li>✓ Use o ChatGPT ou Claude que você já assina</li>
          </ul>
        </div>
        <BriefingMock />
      </section>

      {/* Para quem */}
      <section className="border-y border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-7 sm:px-6 md:flex-row md:justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Feita para quem tem agenda cheia</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {AUDIENCE.map((a) => (
              <li key={a} className="rounded-full border border-line bg-cream px-3.5 py-1.5 text-sm">
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-bold tracking-tight">Uma secretária que nunca esquece nada.</h2>
          <p className="mt-3 text-lg text-ink-soft">
            Do primeiro café ao fim do expediente, ela cuida dos detalhes para você focar no que só você pode fazer.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex flex-col gap-3 transition hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-coral-soft text-2xl">{f.icon}</span>
                <Badge status={f.status} />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="leading-relaxed text-ink-soft">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Um dia com a Garra */}
      <section id="um-dia" className="scroll-mt-20 border-y border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight">Um dia com a sua assistente.</h2>
            <p className="mt-3 text-lg text-ink-soft">
              Ela trabalha em segundo plano e só te chama quando importa. Você responde quando puder, de onde estiver.
            </p>
            <Link href="/cadastro" className="btn-primary mt-8">
              Começar agora
            </Link>
          </div>
          <ol className="relative space-y-5 border-l-2 border-line pl-6">
            {DAY.map((m, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-4 border-paper ${
                    m.who === "garra" ? "bg-coral" : "bg-ink-soft"
                  }`}
                />
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm font-semibold text-coral-deep">{m.time}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    {m.who === "garra" ? "Assistente" : "Você"}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight">Pronta em 5 minutos.</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Sem instalar nada, sem servidor, sem configuração técnica. O assistente de configuração te leva passo a passo.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card">
              <span className="font-display text-5xl font-extrabold text-coral/30">{s.n}</span>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Segurança */}
      <section className="bg-night text-on-night">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight">Discrição de verdade.</h2>
          <p className="mt-3 max-w-2xl text-lg opacity-70">
            Sua agenda e seus contatos são assunto seu. A arquitetura foi pensada para isso desde o primeiro dia.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY.map((s) => (
              <div key={s.title} className="rounded-3xl border border-on-night/10 bg-on-night/5 p-6">
                <h3 className="font-semibold">🔒 {s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-70">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="perguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight">Perguntas frequentes</h2>
        <div className="mt-8 divide-y divide-line rounded-3xl border border-line bg-paper">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span className="text-coral transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="card flex flex-col items-center gap-5 bg-coral-soft/50 px-6 py-14 text-center">
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Recupere as horas que a sua agenda está levando.
          </h2>
          <p className="max-w-xl text-ink-soft">Configure em 5 minutos. Cancele quando quiser.</p>
          <Link href="/cadastro" className="btn-primary px-8 py-4 text-base">
            Quero minha assistente
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
