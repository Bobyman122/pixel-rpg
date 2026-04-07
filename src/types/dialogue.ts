export interface DialogueChoice {
  text: string;
  nextId: string | null;
  flag?: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  nextId: string | null;
  setFlag?: string;
  requireFlag?: string;
}

export interface DialogueScript {
  id: string;
  lines: Record<string, DialogueLine>;
  startLineId: string;
}
