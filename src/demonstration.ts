import {
  AntiPatternGraph2,
  createAntiPatternVertex,
  createAntiPatternEdge,
} from "./entities";
import { buildQuery } from "./query-construction";

function printAntiPatternQuery(patternName: string, graph: AntiPatternGraph2) {
  const divider = "-".repeat(patternName.length);

  console.log(patternName);
  console.log(divider);
  console.log(buildQuery(graph));
  console.log(divider);
  console.log("\n");
}

const apDoubleOpt: AntiPatternGraph2 = {
  vertices: {
    opt1: createAntiPatternVertex("opt1", "ACTIVITY", "NW_OPT"),
    opt2: createAntiPatternVertex("opt2", "ACTIVITY", "NW_OPT"),
  },
  edges: [createAntiPatternEdge("opt1", "opt2")],
};

printAntiPatternQuery("Double optimization", apDoubleOpt);

const apRedundantServices: AntiPatternGraph2 = {
  vertices: {
    s1: createAntiPatternVertex("s1", "ACTIVITY", "S", true),
    s2: createAntiPatternVertex("s2", "ACTIVITY", "S", true),
  },
  edges: [createAntiPatternEdge("s1", "s2")],
};

printAntiPatternQuery("Redundant services", apRedundantServices);

const apNoCondition: AntiPatternGraph2 = {
  vertices: {
    opt: createAntiPatternVertex("opt", "ACTIVITY", "NW_OPT"),
    s: createAntiPatternVertex("s", "ACTIVITY", "", true),
  },
  edges: [createAntiPatternEdge("opt", "s")],
};

printAntiPatternQuery(
  "No conditional processing of optimization output",
  apNoCondition
);

const apMissingReversal: AntiPatternGraph2 = {
  vertices: {
    red: createAntiPatternVertex("red", "ACTIVITY", "NW_RED"),
    rev: createAntiPatternVertex("rev", "ACTIVITY", "NW_RR"),
    end: createAntiPatternVertex("end", "EVENT", "END"),
  },
  edges: [
    createAntiPatternEdge("red", "end", { upper: Infinity }),
    createAntiPatternEdge("red", "rev", { upper: Infinity, missing: true }),
  ],
};

printAntiPatternQuery(
  "Missing reversal of network reduction",
  apMissingReversal
);

const apAbusingOpt: AntiPatternGraph2 = {
  vertices: {
    opt: createAntiPatternVertex("opt", "ACTIVITY", "NW_OPT"),
    gw: createAntiPatternVertex("gw", "GATEWAY", "EXCLUSIVE"),
    tf: createAntiPatternVertex("tf", "ACTIVITY", "VIS_TOP"),
  },
  edges: [
    createAntiPatternEdge("opt", "gw", { upper: Infinity }),
    createAntiPatternEdge("gw", "tf", {
      condition: "incorrect topology",
    }),
  ],
};

printAntiPatternQuery(
  "Using optimization for identification of topology faults",
  apAbusingOpt
);
