import * as neo4j from "neo4j-driver";

import { AntiPatternId, antiPatternCatalogue } from "./anti-patterns";
import { buildQueries } from "../query-construction";

// TODO docs
interface Benchmark {
  name: string;
  graphConstructionQuery: string;
  antiPatternMatches: {
    [id: string]: boolean;
  };
}

const pIncorrect = `
CREATE (start:START:EVENT {name: "START"})
-[:FLOW]->(red:NW_RED:ACTIVITY {name:"Reduce"})
-[:FLOW]->(opt1:NW_OPT:ACTIVITY {name:"Optimize"})
-[:FLOW]->(opt2:NW_OPT:ACTIVITY {name:"Optimize"})
-[:FLOW]->(vis:VIS_INV:ACTIVITY {name:"Visualize"})
-[:FLOW]->(end:END:EVENT {name:"END"})`;

const pCorrect = `
CREATE (end:END:EVENT {name:"END"});

CREATE (start:START:EVENT {name:"START"})
-[:FLOW]->(red:NW_RED:ACTIVITY {name:"Reduce"})
-[:FLOW]->(opt:NW_OPT:ACTIVITY {name:"Optimize"})
-[:FLOW]->(rev:NW_RR:ACTIVITY {name:"Reverse"})
-[:FLOW]->(x:EXCLUSIVE:GATEWAY {name:"x"});

MATCH (x:EXCLUSIVE:GATEWAY), (end:END)
CREATE (x)
-[:FLOW {condition:"correct topology"}]->(vis:VIS_INV:ACTIVITY {name:"Visualize"})
-[:FLOW]->(end);

MATCH (x:EXCLUSIVE:GATEWAY), (end:END)
CREATE (x)
-[:FLOW {condition:"incorrect topology"}]->(tf:VIS_TOP:ACTIVITY {name:"Identify"})
-[:FLOW]->(end);`;

const pConditional = `
CREATE (end:END:EVENT {name:"END"});

CREATE (start:START:EVENT {name:"START"})
-[:FLOW]->(red:NW_RED:ACTIVITY {name:"Reduce"})
-[:FLOW]->(x:EXCLUSIVE:GATEWAY {name:"x"});

MATCH (x:EXCLUSIVE:GATEWAY), (end:END)
CREATE (x)
-[:FLOW]->(red:NW_RR:ACTIVITY {name:"Reverse"})
-[:FLOW]->(end);

MATCH (x:EXCLUSIVE:GATEWAY), (end:END)
CREATE (x)
-[:FLOW]->(end);`;

const benchmarks: Benchmark[] = [
  {
    name: "Incorrect Process",
    graphConstructionQuery: pIncorrect,
    antiPatternMatches: {
      [AntiPatternId.DoubleOpt]: true,
      [AntiPatternId.RedundantServices]: true,
      [AntiPatternId.MissingReversal]: true,
    },
  },
  {
    name: "Correct Process",
    graphConstructionQuery: pCorrect,
    antiPatternMatches: {
      [AntiPatternId.DoubleOpt]: false,
      [AntiPatternId.RedundantServices]: false,
      [AntiPatternId.MissingReversal]: false,
      [AntiPatternId.AbusingOpt]: true,
    },
  },
  {
    name: "Conditional Process",
    graphConstructionQuery: pConditional,
    antiPatternMatches: {
      [AntiPatternId.MissingReversal]: true,
    },
  },
];

function constructSummary(
  antiPatternFound: boolean,
  shouldMatch: boolean,
  execTimes: number[]
) {
  return `[${
    antiPatternFound === shouldMatch ? "Correct" : "Incorrect!!!"
  }] - ${antiPatternFound ? "detected" : "not detected"} - ${
    execTimes[execTimes.length - 1]
  }ms${
    execTimes.length > 1
      ? " (total: " + execTimes.reduce((p, c) => p + c) + "ms)"
      : ""
  }`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  let driver: neo4j.Driver = undefined as unknown as neo4j.Driver;

  try {
    driver = neo4j.driver("neo4j://localhost");

    for (const benchmark of benchmarks) {
      console.log("\n\n--------------------------------------------------");
      console.log(`Adding graph "${benchmark.name}" ...`);
      await driver.executeQuery(`MATCH (n) DETACH DELETE (n)`);
      await sleep(2000);
      for (const query of benchmark.graphConstructionQuery.split("\n\n")) {
        await driver.executeQuery(query);
      }
      await sleep(5000); // wait for DB to index

      for (const [antiPatternId, shouldMatch] of Object.entries(
        benchmark.antiPatternMatches
      )) {
        const antiPattern = antiPatternCatalogue[antiPatternId];
        const antiPatternQueries = buildQueries(antiPattern.graph);
        console.log(`\n>>> Anti-Pattern "${antiPattern.name}"`);

        let initialQueryExecutionTime: number = 0;
        if (antiPatternQueries.length > 1) {
          const { records, summary } = await driver.executeQuery(
            antiPatternQueries[0]
          );
          const targetNodesFound = records.length > 0;
          initialQueryExecutionTime = summary.resultAvailableAfter.toNumber();

          if (targetNodesFound) {
            console.log(
              `-- Initial query found target nodes after ${initialQueryExecutionTime}ms.`
            );
            console.log(
              "-- Executing subsequent query to check anti-pattern existence."
            );
          } else {
            console.log(
              `-- Initial query did not find target nodes after ${initialQueryExecutionTime}ms.`
            );
            console.log(
              "-- Implies anti-pattern existence. Subsequent query is not needed."
            );
            console.log(
              constructSummary(true, shouldMatch, [initialQueryExecutionTime])
            );
            continue;
          }
        }

        const { records, summary } = await driver.executeQuery(
          antiPatternQueries[antiPatternQueries.length - 1]
        );
        const antiPatternFound = records.length > 0;
        console.log(
          constructSummary(antiPatternFound, shouldMatch, [
            initialQueryExecutionTime,
            summary.resultAvailableAfter.toNumber(),
          ])
        );
      }
    }
  } catch (err) {
    console.error("ERROR:", err);
  }

  if (driver) {
    driver.close();
  }
})();
