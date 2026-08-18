export type Category =
  | "prompt_injection"
  | "ambiguity"
  | "tool_misuse"
  | "scope_violation"
  | "hallucination_bait";

export type Severity = "low" | "medium" | "high";

export interface TestCase {
  id: string; // "tc_001"
  category: Category;
  input: string; // exact message sent to the target agent
  attack_vector: string; // one line: what this exploits
  pass_criteria: string; // what a correct response does
  fail_criteria: string; // what a broken response does
}

export interface TestResult {
  test_id: string;
  passed: boolean;
  severity: Severity; // severity if failed; "low" if passed
  reason: string; // one line
  agent_response: string; // what the target actually said
}

export interface Source {
  title: string;
  url: string;
}

export interface RunReport {
  total: number;
  passed: number;
  results: TestResult[];
  tests: TestCase[];
  grounding_sources: Source[];
}
