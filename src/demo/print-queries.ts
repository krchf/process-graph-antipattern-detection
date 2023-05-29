import { antiPatternCatalogue } from "./anti-patterns";
import { AntiPatternGraph } from "../entities";
import { buildQueries } from "../query-construction";

/**
 * Constructs and prints the Cypher query for a given anti-pattern graph.
 *
 * @param patternName Name of the pattern.
 * @param graph The anti-pattern graph to construct a query for.
 */
function printAntiPatternQuery(patternName: string, graph: AntiPatternGraph) {
  const divider = "-".repeat(patternName.length);

  const queries = buildQueries(graph);

  console.log(patternName);
  console.log(divider);
  if (queries.length > 0) {
    console.log("> First query (existence of target nodes)\n");
    console.log(queries[0]);
    console.log("\n> Second query (existence of anti-pattern)\n");
  }
  console.log(queries[queries.length - 1]);
  console.log(divider);
  console.log("\n");
}

for (const antiPattern of Object.values(antiPatternCatalogue)) {
  printAntiPatternQuery(antiPattern.name, antiPattern.graph);
}
