type Lookup<T> = { [id: string]: T };

type VertexType = "ACTIVITY" | "EVENT" | "GATEWAY";

interface BaseVertex {
  type: VertexType;
  variant: string | null;
}

interface AntiPatternVertex extends BaseVertex {
  id: string;
  placeholder: boolean; // if true, variant is interpreted as placeholder name
}

export function createAntiPatternVertex(
  id: string,
  type: VertexType,
  variant: string,
  placeholder?: boolean
): AntiPatternVertex {
  return {
    id,
    type,
    variant,
    placeholder: placeholder || false,
  };
}

interface NeoVertex extends BaseVertex {
  variable: string;
}

export function stringifyNeoVertex(v: NeoVertex): string {
  return `(${v.variable}${v.variant ? ":" + v.variant : ""}:${v.type})`;
}

export function createNeoVertex(apVertex: AntiPatternVertex): NeoVertex {
  return {
    variable: apVertex.id,
    type: apVertex.type,
    variant: apVertex.placeholder ? null : apVertex.variant,
  };
}

interface BaseEdge {
  from: string;
  to: string;
  lower: number;
  upper: number;
}

interface AntiPatternEdge extends BaseEdge {
  missing: boolean;
  condition?: string;
}

export function createAntiPatternEdge(
  from: string,
  to: string,
  opt?: {
    lower?: number;
    upper?: number;
    missing?: boolean;
    condition?: string;
  }
): AntiPatternEdge {
  return {
    from,
    to,
    lower: opt?.lower || 1,
    upper: opt?.upper || 1,
    missing: opt?.missing || false,
    condition: opt?.condition || undefined,
  };
}

interface NeoEdge extends BaseEdge {
  variable: string;
}

export function createNeoEdge(
  variable: string,
  apEdge: AntiPatternEdge
): NeoEdge {
  return {
    variable,
    from: apEdge.from,
    to: apEdge.to,
    lower: apEdge.lower,
    upper: apEdge.upper,
  };
}

export function stringifyNeoEdge(e: NeoEdge): string {
  let repeat = "";
  if (e.lower === 1 && e.upper === 1) {
    repeat = "";
  } else if (e.lower === 1 && e.upper === Infinity) {
    repeat = `*`;
  } else if (e.lower > 1 && e.upper === Infinity) {
    repeat = `*${e.lower}..`;
  } else {
    repeat = `*${e.lower}..${e.upper}`;
  }

  return `(${e.from})-[${e.upper === 1 ? e.variable : ""}${repeat}]->(${e.to})`;
}

interface VertexMatch {
  vertex: NeoVertex;
  optional: boolean;
}

export function stringifyVertexMatch(m: VertexMatch) {
  return `${m.optional ? "OPTIONAL " : ""}MATCH ${stringifyNeoVertex(
    m.vertex
  )}`;
}

interface EdgeMatch {
  pathVariable: string;
  edge: NeoEdge;
}

export function stringifyEdgeMatch(m: EdgeMatch) {
  return `MATCH ${m.pathVariable}=${stringifyNeoEdge(m.edge)}`;
}

interface Query {
  vertexMatches: VertexMatch[];
  edgeMatches: EdgeMatch[];
  where: string[];
}

export interface AntiPatternGraph2 {
  vertices: Lookup<AntiPatternVertex>;
  edges: AntiPatternEdge[];
}

export interface Clauses {
  // TODO array possible when duplicates are removed?
  matchVertex: Lookup<VertexMatch>;
  matchEdge: EdgeMatch[];
  where: string[];
  placeholders: Lookup<string[]>;
}
