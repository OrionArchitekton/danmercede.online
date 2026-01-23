export enum EntryType {
  ShortEssay = "Short Essay",
  ExperimentLog = "Experiment Log",
  StatusUpdate = "Status Update",
  ThoughtSnippet = "Thought Snippet",
  WorkingNote = "Working Note"
}

export type Tag = 
  | "systems"
  | "governance"
  | "failure-modes"
  | "execution"
  | "signal"
  | "infra"
  | "security"
  | "economics";

export type ContextLabel = "Infra" | "Governance" | "Systems" | "Execution" | "Signal";

export interface BaseEntry {
  id: string;
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:MM [Timezone]
  tags: Tag[];
  context?: ContextLabel;
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

export type LogEntry = ShortEssay | ExperimentLog | StatusUpdate | ThoughtSnippet | WorkingNote;
