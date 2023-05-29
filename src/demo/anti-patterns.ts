import {
  AntiPatternGraph,
  createAntiPatternVertex,
  createAntiPatternEdge,
} from "../entities";

// TODO docs
export interface AntiPatternCatalogue {
  [name: string]: {
    name: string;
    graph: AntiPatternGraph;
  };
}

export enum AntiPatternId {
  DoubleOpt = "apDoubleOpt",
  RedundantServices = "apRedundantServices",
  NoCondition = "apNoCondition",
  MissingReversal = "apMissingReversal",
  AbusingOpt = "apAbusingOpt",
}

const apDoubleOpt: AntiPatternGraph = {
  vertices: {
    opt1: createAntiPatternVertex("opt1", "ACTIVITY", "NW_OPT"),
    opt2: createAntiPatternVertex("opt2", "ACTIVITY", "NW_OPT"),
  },
  edges: [createAntiPatternEdge("opt1", "opt2")],
};

const apRedundantServices: AntiPatternGraph = {
  vertices: {
    s1: createAntiPatternVertex("s1", "ACTIVITY", "S", true),
    s2: createAntiPatternVertex("s2", "ACTIVITY", "S", true),
  },
  edges: [createAntiPatternEdge("s1", "s2")],
};

const apNoCondition: AntiPatternGraph = {
  vertices: {
    opt: createAntiPatternVertex("opt", "ACTIVITY", "NW_OPT"),
    s: createAntiPatternVertex("s", "ACTIVITY", "", true),
  },
  edges: [createAntiPatternEdge("opt", "s")],
};

const apMissingReversal: AntiPatternGraph = {
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

const apAbusingOpt: AntiPatternGraph = {
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

export const antiPatternCatalogue: AntiPatternCatalogue = {
  [AntiPatternId.DoubleOpt]: {
    name: "Double optimization",
    graph: apDoubleOpt,
  },
  [AntiPatternId.RedundantServices]: {
    name: "Redundant services",
    graph: apRedundantServices,
  },
  [AntiPatternId.NoCondition]: {
    name: "No conditional processing of optimization output",
    graph: apNoCondition,
  },
  [AntiPatternId.MissingReversal]: {
    name: "Missing reversal of network reduction",
    graph: apMissingReversal,
  },
  [AntiPatternId.AbusingOpt]: {
    name: "Using optimization for identification of topology faults",
    graph: apAbusingOpt,
  },
};
