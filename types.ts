export enum EntryType {
  ShortEssay = "Short Essay",
  ExperimentLog = "Experiment Log",
  StatusUpdate = "Status Update",
  ThoughtSnippet = "Thought Snippet",
  WorkingNote = "Working Note",
  Diagram = "Diagram"
}

export type Tag = 
  | "systems"
  | "governance"
  | "failure-modes"
  | "execution"
  | "signal"
  | "infra"
  | "security"
  | "economics"
  | "workflow-ownership";

export type ContextLabel = "Infra" | "Governance" | "Systems" | "Execution" | "Signal";

export interface BaseEntry {
  id: string;
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:MM [Timezone]
  tags: Tag[];
  context?: ContextLabel;
  image?: { src: string; alt: string; caption?: string }; // optional inline figure (e.g. a guide infographic)
}

export interface ShortEssay extends BaseEntry {
  type: EntryType.ShortEssay;
  content: string; // Main body paragraphs
  claim: string; // Core assertion (Bolded)
  implication: string; // Closing sentence
}

export interface ExperimentLog extends BaseEntry {
  type: EntryType.ExperimentLog;
  hypothesis: string;
  constraint: string;
  result: "Passed" | "Failed" | "Inconclusive";
  resultDetails: string;
  nextStep: string;
}

export interface StatusUpdate extends BaseEntry {
  type: EntryType.StatusUpdate;
  status: "Active" | "Paused" | "Rolled back" | "Investigating" | "Resolved";
  whatChanged: string;
  whatBroke: string;
  nextStep: string;
}

export interface ThoughtSnippet extends BaseEntry {
  type: EntryType.ThoughtSnippet;
  content: string; // Max 200 words, single idea
}

export interface WorkingNote extends BaseEntry {
  type: EntryType.WorkingNote;
  content: string;
  openQuestion: string; // Mandatory open question
}

export interface Diagram extends BaseEntry {
  type: EntryType.Diagram;
  src: string;
  alt: string;
  caption: string;
  content?: string;
}

export type LogEntry = ShortEssay | ExperimentLog | StatusUpdate | ThoughtSnippet | WorkingNote | Diagram;
