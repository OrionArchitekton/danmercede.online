import { LogEntry, EntryType } from './types';

export const ENTRIES: LogEntry[] = [
  {
    id: "se-002",
    slug: "governance-latency-problem",
    title: "Governance as Code: The Latency Problem",
    date: "2024-10-24",
    timestamp: "09:15 AM PST",
    type: EntryType.ShortEssay,
    context: "Governance",
    tags: ["governance", "systems", "infra"],
    claim: "In autonomous systems, retrospective governance is a failure mode; governance must be a physics constraint, not an audit log.",
    content: `We often treat governance as a retrospective layer—audit logs, compliance checks, and post-incident reviews. But in autonomous agentic systems, by the time you review the log, the agent has already executed the trade, deleted the file, or sent the email.
    
    The challenge is latency. If every agentic decision requires a round-trip to a governance kernel, we introduce unacceptable drag. The solution likely lies in localizing signed policy primitives to the agent's runtime environment. We are currently testing a model where policy logic is compiled into WASM modules that sit directly in the agent's context window pipeline.`,
    implication: "Implication: We must move from 'Oversight' to 'Physics'—embedding rules into the execution substrate itself."
  },
  {
    id: "ex-002",
    slug: "edge-vs-containers-state",
    title: "Vercel Edge vs. Containers for Agent State",
    date: "2024-10-23",
    timestamp: "14:30 PM PST",
    type: EntryType.ExperimentLog,
    context: "Infra",
    tags: ["execution", "failure-modes", "infra"],
    hypothesis: "Edge functions can maintain sufficient ephemeral state for short-lived agent reasoning loops without external DB latency.",
    constraint: "Max execution time 30s, memory 128MB.",
    result: "Failed",
    resultDetails: "Complex reasoning chains hit memory limits immediately when loading context windows > 8k tokens.",
    nextStep: "Reverting to containerized micro-services. Edge is for routing, not reasoning."
  },
  {
    id: "ts-002",
    slug: "signal-vs-noise-reporting",
    title: "Signal vs. Noise in Automated Reporting",
    date: "2024-10-22",
    timestamp: "11:00 AM PST",
    type: EntryType.ThoughtSnippet,
    context: "Signal",
    tags: ["signal", "failure-modes"],
    content: "Most automated reporting systems optimize for volume. They confuse 'more data' with 'better visibility.' I am realizing that high-signal reporting is subtractive. A system should only notify a human when it encounters a state transition it cannot mathematically resolve itself. Everything else is just noise disguised as transparency."
  },
  {
    id: "su-002",
    slug: "cosmocrat-migration-pause",
    title: "Cosmocrat Platform Migration",
    date: "2024-10-21",
    timestamp: "16:45 PM PST",
    type: EntryType.StatusUpdate,
    context: "Infra",
    tags: ["execution", "infra"],
    status: "Paused",
    whatChanged: "Attempted migration to high-availability cluster v1.2.",
    whatBroke: "FIFO ordering guarantee violated during auto-scaling events.",
    nextStep: "Rollback complete. Investigating queue race conditions."
  },
  {
    id: "wn-002",
    slug: "surface-logic-test",
    title: "Initial Surface Logic",
    date: "2024-10-20",
    timestamp: "08:00 AM PST",
    type: EntryType.WorkingNote,
    context: "Signal",
    tags: ["signal", "infra"],
    content: "This site is a test of a new communication protocol. No polish, just the raw log of work. If I wait until the thought is perfect, the context is gone.",
    openQuestion: "Does public transparency on failure modes increase or decrease trust for early-stage systems?"
  },
  {
    id: "su-001",
    slug: "governance-module-v2",
    title: "Governance Module v2 Deployment",
    date: "2024-10-19",
    timestamp: "09:00 AM PST",
    type: EntryType.StatusUpdate,
    context: "Governance",
    tags: ["governance", "security"],
    status: "Active",
    whatChanged: "Enforced mandatory policy-check step before external API calls.",
    whatBroke: "Latency increased by 200ms (within tolerance).",
    nextStep: "Monitor error rates for 24h before full rollout."
  },
  {
    id: "se-001",
    slug: "trust-in-transparent-systems",
    title: "The Transparency Paradox in Early Systems",
    date: "2024-10-18",
    timestamp: "14:20 PM PST",
    type: EntryType.ShortEssay,
    context: "Signal",
    tags: ["signal", "failure-modes", "economics"],
    claim: "Publicly documenting failure modes creates higher long-term trust than a polished facade, but incurs higher short-term reputational volatility.",
    content: `Conventional PR wisdom suggests hiding the messy internals of early-stage builds. However, for technical audiences, a polished facade on a v0.1 product signals incompetence or dishonesty.
    
    When we expose the 'working log', we signal that we understand our own failure modes. This is a higher order of competence. It filters for partners who value engineering reality over marketing abstraction.`,
    implication: "Implication: Trust is a function of predictable execution, and admitting failure makes future execution more predictable."
  },
  {
    id: "ex-001",
    slug: "context-window-compression",
    title: "Semantic Compression for Long-Horizon Planning",
    date: "2024-10-15",
    timestamp: "10:00 AM PST",
    type: EntryType.ExperimentLog,
    context: "Systems",
    tags: ["systems", "execution"],
    hypothesis: "Summarizing past actions into a 'memory stream' reduces token usage by 60% without degrading plan adherence.",
    constraint: "GPT-4 Turbo, 128k context, restricted to 4k output.",
    result: "Passed",
    resultDetails: "Token usage dropped 64%. Agent successfully recalled constraints from turn 1 at turn 50 via the summary injection.",
    nextStep: "Deploy to staging for the multi-agent negotiation module."
  },
  {
    id: "ts-001",
    slug: "institutional-speed",
    title: "Institutional Speed Limits",
    date: "2024-10-12",
    timestamp: "13:15 PM PST",
    type: EntryType.ThoughtSnippet,
    context: "Systems",
    tags: ["systems", "economics"],
    content: "The speed limit of an institution is set by its slowest approver, not its fastest executor. We are trying to architect systems where approval is asynchronous and non-blocking for reversible decisions, and blocking only for irreversible ones. Distinguishing between the two is the entire game."
  },
  {
    id: "wn-001",
    slug: "agent-identity-standard",
    title: "Agent Identity Standards",
    date: "2024-10-10",
    timestamp: "16:00 PM PST",
    type: EntryType.WorkingNote,
    context: "Governance",
    tags: ["governance", "security"],
    content: "Drafting a spec for cryptographically verifying agent provenance. Currently, we rely on API keys, but that authenticates the controller, not the model instance. We need a way to sign the weights or the inference path.",
    openQuestion: "Can we use TEEs (Trusted Execution Environments) to prove a specific model generated a specific output without revealing the weights?"
  }
];

export type ImageMeta = { alt: string; description?: string };

export const IMAGE_METADATA = {
  // Executive / Authority Set
  "dan-mercede-executive-authority.png": {
    alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system",
    description:
      "Executive portrait of Dan Mercede, founder and systems architect focused on governed AI systems and enterprise control planes.",
  },
  "dan-mercede-executive-outdoor.png": {
    alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system",
    description:
      "Outdoor executive portrait of Dan Mercede, founder and systems architect specializing in governed AI and system control architecture.",
  },
  "dan-mercede-executive-relaxed.png": {
    alt: "Dan Mercede, Founder & Systems Architect of a governed AI operating system",
    description:
      "Relaxed executive portrait of Dan Mercede, founder and systems architect working in governed AI and enterprise AI governance.",
  },

  // Founder / Working Headshots
  "dan-mercede-founder-headshot.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Founder headshot of Dan Mercede, actively building and operating governed AI systems with a focus on execution and architecture.",
  },
  "dan-mercede-founder-headshot-sm.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Scaled founder headshot of Dan Mercede focused on hands-on AI system design and governance.",
  },
  "dan-mercede-founder-headshot-xs.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Compact founder headshot of Dan Mercede emphasizing hands-on work in governed AI systems.",
  },

  // Founder / Social & Working Context
  "dan-mercede-founder-social-landscape.png": {
    alt: "Dan Mercede, founder and systems architect in a working environment",
    description:
      "Landscape portrait of Dan Mercede in a casual working environment, representing hands-on leadership in governed AI systems.",
  },
  "dan-mercede-founder-social-portrait.png": {
    alt: "Dan Mercede, founder and systems architect in a working environment",
    description:
      "Portrait of Dan Mercede in a social working context, reflecting active system design and founder-led execution.",
  },
  "dan-mercede-founder-working-landscape.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Landscape image of Dan Mercede actively working on governed AI system architecture and execution.",
  },
  "dan-mercede-founder-working-portrait.png": {
    alt: "Dan Mercede working as founder and systems architect on governed AI systems",
    description:
      "Portrait of Dan Mercede in a focused working setting, emphasizing hands-on system building and AI governance.",
  },
} as const satisfies Record<string, ImageMeta>;

const basename = (src: string) => src.split("/").pop() || src;

export function getImageMeta(srcOrFilename: string): ImageMeta {
  const key = basename(srcOrFilename);
  const meta = (IMAGE_METADATA as Record<string, ImageMeta>)[key];

  if (!meta) {
    // Dev: fail loud. Prod: safe fallback.
    if (import.meta.env.DEV) {
      throw new Error(`Missing IMAGE_METADATA for: ${key}`);
    }
    return { alt: "Dan Mercede", description: undefined };
  }

  return meta;
}
