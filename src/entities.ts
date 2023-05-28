/** Represents a lookup from ID to object of type T. */
type Lookup<T> = { [id: string]: T };

/** Allowed vertex types. */
type VertexType = "ACTIVITY" | "EVENT" | "GATEWAY";

/** Represents any vertex. */
interface BaseVertex {
  /** Vertex type. */
  type: VertexType;
  /** Vertex variant. Corresponds to placeholder name for anti-pattern placeholders. */
  variant: string | null;
}

/** Represents a vertex in an anti-pattern. */
interface AntiPatternVertex extends BaseVertex {
  /** Unique ID of the vertex in the encompassing anti-pattern graph. */
  id: string;
  /** Whether the vertex contains a placeholder and the variant should be interpreted as placeholder name. */
  placeholder: boolean;
}

/** Creates an anti-pattern vertex.
 * See interface for parameter descriptions.
 */
export function createAntiPatternVertex(
  id: string,
  type: VertexType,
  variant: string,
  placeholder = false
): AntiPatternVertex {
  return {
    id,
    type,
    variant,
    placeholder,
  };
}

/** Represents a vertex in a Cypher query. */
interface NeoVertex extends BaseVertex {
  /** Unique variable name in the query. */
  variable: string;
}

/** Returns the Cypher representation of the given Neo vertex. */
export function stringifyNeoVertex(v: NeoVertex): string {
  return `(${v.variable}${v.variant ? ":" + v.variant : ""}:${v.type})`;
}

/** Creates a Neo4j vertex from an anti-pattern vertex. */
export function createNeoVertex(apVertex: AntiPatternVertex): NeoVertex {
  return {
    variable: apVertex.id,
    type: apVertex.type,
    variant: apVertex.placeholder ? null : apVertex.variant,
  };
}

/** Represents an arbitrary edge. */
interface BaseEdge {
  /** Identification of starting node. */
  from: string;
  /** Identification of end node. */
  to: string;
  /** Minimum repeatability. */
  lower: number;
  /** Maximum repeatability */
  upper: number;
}

/** Represents an edge of an anti-pattern graph. */
interface AntiPatternEdge extends BaseEdge {
  /** Whether the edge indicates a missing path to an activity. */
  missing: boolean;
  /** The optionally associated condition. */
  condition?: string;
}

/**
 * Creates an edge for an anti-pattern graph.
 * See corresponding interface for parameter descriptions.
 * Defaults to `[1..1]` for repeatability, `false` for `missing` and no `condition`.
 */
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

/** Represents an edge in a Neo4j Cypher query. */
interface NeoEdge extends BaseEdge {
  /** Unique variable name. */
  variable: string;
}

/** Creates a Neo4j Cypher edge from an anti-pattern edge. */
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

/** Returns the Cypher representation for a given edge. */
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

  return `(${e.from})-[${e.variable}${repeat}]->(${e.to})`;
}

/** Documents a vertex which must be matched in a Cypher query. */
interface VertexMatch {
  /** The vertex to match. */
  vertex: NeoVertex;
  /** Whether the vertex should be optionally matched or not. */
  optional: boolean;
}

/** Returns the Cypher MATCH statement for a given vertex match. */
export function stringifyVertexMatch(m: VertexMatch) {
  return `${m.optional ? "OPTIONAL " : ""}MATCH ${stringifyNeoVertex(
    m.vertex
  )}`;
}

/** Documents an edge which must be matched in a Cypher query. */
interface EdgeMatch {
  /** Unique path variable to be returned later. */
  pathVariable: string;
  /** The edge to match. */
  edge: NeoEdge;
}

/** Returns the Cypher MATCH statement for an edge match. */
export function stringifyEdgeMatch(m: EdgeMatch) {
  return `MATCH ${m.pathVariable}=${stringifyNeoEdge(m.edge)}`;
}

/** Represents an anti-pattern graph. */
export interface AntiPatternGraph {
  /** Vertices of graph indexed by ID. */
  vertices: Lookup<AntiPatternVertex>;
  /** Edges of graph. */
  edges: AntiPatternEdge[];
}

/** Represents a set of Cypher statements which can be combined into a query. */
export interface StatementCollection {
  /** Vertex matches indexed by vertex variable. */
  matchVertex: Lookup<VertexMatch>; // Lookup instead of array for duplicate removal
  /** List of edge matches. */
  matchEdge: EdgeMatch[];
  /** List of where clauses. */
  where: string[];
  /** Mapping from placeholder identifier to vertex variables which include the identifier. */
  placeholders: Lookup<string[]>;
}
