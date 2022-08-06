import {
  AntiPatternGraph2,
  Clauses,
  createNeoVertex,
  createNeoEdge,
  stringifyVertexMatch,
  stringifyEdgeMatch,
  stringifyNeoEdge,
} from "./entities";

interface Counters {
  paths: number;
  relations: number;
}

function processEdge(
  edgeIndex: number,
  graph: AntiPatternGraph2,
  counters: Counters
): Clauses {
  const edge = graph.edges[edgeIndex];
  const from = graph.vertices[edge.from];
  const to = graph.vertices[edge.to];

  const res: Clauses = {
    matchVertex: {},
    matchEdge: [],
    where: [],
    placeholders: {},
  };

  res.matchVertex[edge.from] = {
    vertex: createNeoVertex(graph.vertices[edge.from]),
    optional: false,
  };
  res.matchVertex[edge.to] = {
    vertex: createNeoVertex(graph.vertices[edge.to]),
    optional: false,
  };
  res.matchVertex[edge.to] = {
    vertex: createNeoVertex(graph.vertices[edge.to]),
    optional: edge.missing,
  };

  const neoEdge = createNeoEdge(`r${counters.relations++}`, edge);

  if (!edge.missing) {
    res.matchEdge.push({
      pathVariable: `p${counters.paths++}`,
      edge: neoEdge,
    });
  } else {
    res.where.push(`NOT exists(${stringifyNeoEdge(neoEdge)})`);
  }

  if (edge.condition) {
    res.where.push(`${neoEdge.variable}.condition="${edge.condition}"`);
  }

  // store placeholders
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

function asdf(clauses: Clauses, noOfPaths: number) {
  let matchClauses: string[] = [];
  let whereClauses: string[] = clauses.where;

  const vertexMatches = Object.values(clauses.matchVertex);
  const mandatoryMatches = vertexMatches.filter((m) => !m.optional);
  const optionalMatches = vertexMatches.filter((m) => m.optional);

  for (const vm of Object.values(mandatoryMatches)) {
    matchClauses.push(stringifyVertexMatch(vm));
  }
  for (const em of clauses.matchEdge) {
    matchClauses.push(stringifyEdgeMatch(em));
  }
  for (const vm of Object.values(optionalMatches)) {
    matchClauses.push(stringifyVertexMatch(vm));
  }

  for (const nodes of Object.values(clauses.placeholders)) {
    if (nodes.length > 1) {
      // TODO generalize to more nodes
      whereClauses.push(`labels(${nodes[0]})=labels(${nodes[1]})`);
    }
    // else: don't care about anonymous placeholders
  }

  const paths: string[] = [];
  for (let i = 0; i < noOfPaths; i++) {
    paths.push(`p${i}`);
  }

  return `${matchClauses.join("\n")}${
    whereClauses.length > 0 ? "\nWHERE " + whereClauses.join("\nAND ") : ""
  }\nRETURN ${paths.join(",")}`;
}

export function buildQuery(graph: AntiPatternGraph2): string {
  // TODO generalize to more edges
  const counters: Counters = {
    paths: 0,
    relations: 0,
  };
  const clauses: Clauses = {
    matchVertex: {},
    matchEdge: [],
    where: [],
    placeholders: {},
  };

  for (let i = 0; i < graph.edges.length; i++) {
    const edgeClauses = processEdge(i, graph, counters);
    mergeClauses(clauses, edgeClauses);
  }

  return asdf(clauses, counters.paths);
}

function mergeClauses(c1: Clauses, c2: Clauses) {
  // TODO implement properly
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
