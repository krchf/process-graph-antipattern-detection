import {
  AntiPatternGraph,
  createNeoVertex,
  createNeoEdge,
  StatementCollection,
  stringifyVertexMatch,
  stringifyEdgeMatch,
} from "./entities";

/** Global counters for variables. */
interface Counters {
  /** Number of path variables. */
  paths: number;
  /** Number of relation/edge variables. */
  relations: number;
}

/**
 * Processes a single edge of the anti-pattern graph.
 *
 * @param graph The complete anti-pattern graph.
 * @param edgeIndex Index of the edge to process w.r.t. to `graph.edges`.
 * @param counters Global variable counters.
 * @returns A collection of Cypher statements for the edge.
 */
function processEdge(
  graph: AntiPatternGraph,
  edgeIndex: number,
  counters: Counters
): StatementCollection {
  const edge = graph.edges[edgeIndex];
  const from = graph.vertices[edge.from];
  const to = graph.vertices[edge.to];

  const res: StatementCollection = {
    matchVertex: {},
    matchEdge: [],
    where: [],
    placeholders: {},
  };

  // add MATCH-statements for nodes, overwriting existing ones
  res.matchVertex[edge.from] = {
    vertex: createNeoVertex(graph.vertices[edge.from]),
    optional: false,
  };
  res.matchVertex[edge.to] = {
    vertex: createNeoVertex(graph.vertices[edge.to]),
    optional: edge.missing, // activity may not be included in graph
  };

  const neoEdge = createNeoEdge(`r${counters.relations++}`, edge);
  if (!edge.missing) {
    // create MATCH-statement for relation/edge only if it does not denote a missing path
    res.matchEdge.push({
      pathVariable: `p${counters.paths++}`,
      edge: neoEdge,
    });
  } else {
    res.where.push(
      `NONE (n IN nodes(p${counters.paths - 1}) WHERE n=${edge.to})`
    );

    // does not work for conditional execution:
    // res.where.push(`NOT exists(${stringifyNeoEdge(neoEdge)})`);
  }

  if (edge.condition) {
    res.where.push(`${neoEdge.variable}.condition="${edge.condition}"`);
  }

  // track placeholders
  for (const v of [from, to]) {
    if (v.placeholder) {
      const name = v.variant as string;
      if (res.placeholders[name]) {
        res.placeholders[name].push(v.id);
      } else {
        res.placeholders[name] = [v.id];
      }
    }
  }

  return res;
}

/**
 * Builds and returns the Cypher representation of a statement collection.
 *
 * @param statementCollection Statement collection to build query from
 */
function prepareAndJoinStatements(statementCollection: StatementCollection) {
  let matchStatements: string[] = [];
  let whereStatements: string[] = statementCollection.where;
  const pathVariables: string[] = [];

  // make sure that mandatory matches are executed before optional matches
  const vertexMatches = Object.values(statementCollection.matchVertex);

  for (const vm of Object.values(vertexMatches)) {
    matchStatements.push(stringifyVertexMatch(vm));
  }
  for (const em of statementCollection.matchEdge) {
    matchStatements.push(stringifyEdgeMatch(em));
    pathVariables.push(em.pathVariable);
  }

  // add final WHERE-statements for placeholders
  // (since they not necessarily occur adjacent in one edge)
  for (const nodes of Object.values(statementCollection.placeholders)) {
    if (nodes.length > 1) {
      // TODO generalize to more nodes
      whereStatements.push(`labels(${nodes[0]})=labels(${nodes[1]})`);
    }
    // else: don't care about anonymous placeholders
  }

  return `${matchStatements.join("\n")}${
    whereStatements.length > 0
      ? "\nWHERE " + whereStatements.join("\nAND ")
      : ""
  }\nRETURN ${pathVariables.join(",")}`;
}

/** Builds a Cypher queries for the given anti-pattern graph. */
export function buildQueries(graph: AntiPatternGraph): string[] {
  const counters: Counters = {
    paths: 0,
    relations: 0,
  };
  const statements: StatementCollection = {
    matchVertex: {},
    matchEdge: [],
    where: [],
    placeholders: {},
  };
  const queries: string[] = [];

  // traverse edges
  for (let i = 0; i < graph.edges.length; i++) {
    const edgeStatementCollection = processEdge(graph, i, counters);
    mergeStatementCollection(statements, edgeStatementCollection);
  }

  // build initial query to ensure that nodes which are the target of a nonexistent flow are contained in the graph
  const optionalMatches = Object.values(statements.matchVertex).filter(
    (v) => v.optional
  );
  if (optionalMatches.length > 0) {
    let query = optionalMatches.map(stringifyVertexMatch).join("\n");
    query += `\nRETURN ${optionalMatches
      .map((v) => v.vertex.variable)
      .join(",")}`;
    queries.push(query);
  }

  queries.push(prepareAndJoinStatements(statements));
  return queries;
}

/** Merges all statements of collection c2 into c1. */
function mergeStatementCollection(
  c1: StatementCollection,
  c2: StatementCollection
) {
  // TODO consider duplicates, avoid overwrites

  for (const [vertexId, vertexMatch] of Object.entries(c2.matchVertex)) {
    c1.matchVertex[vertexId] = vertexMatch;
  }
  for (const edgeId of c2.matchEdge) {
    c1.matchEdge.push(edgeId);
  }
  for (const where of c2.where) {
    c1.where.push(where);
  }

  for (const [placeholderId, nodes] of Object.entries(c2.placeholders)) {
    if (!c1.placeholders[placeholderId]) {
      c1.placeholders[placeholderId] = nodes;
    } else {
      c1.placeholders[placeholderId] = [
        ...c1.placeholders[placeholderId],
        ...nodes,
      ];
    }
  }
}
