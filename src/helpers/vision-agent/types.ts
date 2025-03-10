export interface Action {
  thought: string;
  operation: {
    name: string;
    args: Record<string, any>;
  };
}

export type ActionName = 
  | "navigate"
  | "click" 
  | "setValue"
  | "setValueAndEnter"
  | "scroll"
  | "wait"
  | "finish"
  | "fail";

export interface NavigateAction {
  name: "navigate";
  args: {
    url: string;
  };
}

export interface ClickAction {
  name: "click";
  args: {
    selector: string;
  };
}

export interface SetValueAction {
  name: "setValue" | "setValueAndEnter";
  args: {
    selector: string;
    value: string;
  };
}

export interface ScrollAction {
  name: "scroll";
  args: {
    direction: "up" | "down";
  };
}

export interface WaitAction {
  name: "wait";
  args: {
    ms: number;
  };
}

export interface FinishAction {
  name: "finish";
  args: Record<string, never>;
}

export interface FailAction {
  name: "fail";
  args: {
    reason: string;
  };
}

export type Operation = 
  | NavigateAction
  | ClickAction
  | SetValueAction
  | ScrollAction
  | WaitAction
  | FinishAction
  | FailAction; 