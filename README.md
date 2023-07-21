# Anti-Pattern Detection in Process-Driven Decision Support Systems - Demonstration

This project demonstrates the technical feasibility of using graph matching provided by the graph database [_Neo4j_](https://neo4j.com/) to detect anti-patterns in a process model describing a decision support system.

> Note: The implementation originally described in the paper ["Anti-pattern Detection in Process-Driven Decision Support Systems"](https://link.springer.com/chapter/10.1007/978-3-031-20706-8_16) was extended to include a bug fix for conditional execution and better benchmarking. The original implementation is still available on the [`icsob-2022` branch](https://github.com/krchf/process-graph-antipattern-detection/tree/icsob-2022).

## Getting Started

**Dependencies:**

- For query execution: Docker Compose (e.g., part of [Docker Desktop](https://www.docker.com/products/docker-desktop/))
- For query re-generation: [Node.js + npm](https://nodejs.org/en/) (Install additional dependencies with `npm install`. Code was tested with v.14)

**Getting Started:**

1. Run `docker compose up -d && docker-compose logs -f neo4j`
2. Wait for http://localhost:7474 to be available
3. Connect to DB using "No authentication"
4. Run queries - either:
   1. Run benchmark via `npm start`.
   2. Insert queries below into the Neo4j UI (or regenerate queries by running `npm run print-queries`).

> Note: Database must be cleared before inserting a new process model. See ["Cleanup"](#cleanup) section at the end of this document for details.

**Anti-Pattern Visualizations:**

Some anti-patterns are visualized below. (See paper for detailed descriptions.)

![](docs/figures/anti-patterns-examples.drawio.svg)

## Demonstration: "Incorrect Process"

**Process Visualization:**

![](docs/figures/process-example-incorrect.drawio.svg)

**Graph Creation:**

```
CREATE (start:START:EVENT {name: "START"})
-[:FLOW]->(red:NW_RED:ACTIVITY {name:"Reduce"})
-[:FLOW]->(opt1:NW_OPT:ACTIVITY {name:"Optimize"})
-[:FLOW]->(opt2:NW_OPT:ACTIVITY {name:"Optimize"})
-[:FLOW]->(vis:VIS_INV:ACTIVITY {name:"Visualize"})
-[:FLOW]->(end:END:EVENT {name:"END"})
```

### "No consecutive optimization"

```
MATCH (opt1:NW_OPT:ACTIVITY)
MATCH (opt2:NW_OPT:ACTIVITY)
MATCH p0=(opt1)-[r0]->(opt2)
RETURN p0
```

<!-- ```
MATCH p=(n:NetwOpt)-[r:UNCONTROLLED_FLOW]->(m:NetwOpt)
RETURN p
``` -->

### (a) "Optimization should not be immediately followed by other activity"

```
MATCH (opt:NW_OPT:ACTIVITY)
MATCH (s:ACTIVITY)
MATCH p0=(opt)-[r0]->(s)
RETURN p0
```

### (b) "No redundant service invocation"

```
MATCH (s1:ACTIVITY)
MATCH (s2:ACTIVITY)
MATCH p0=(s1)-[r0]->(s2)
WHERE labels(s1)=labels(s2)
RETURN p0
```

### (c) Network reduction must be undone

```
> First query (existence of target nodes)

MATCH (rev:NW_RR:ACTIVITY)
RETURN rev

> Second query (existence of anti-pattern)

MATCH (red:NW_RED:ACTIVITY)
MATCH (end:END:EVENT)
MATCH (rev:NW_RR:ACTIVITY)
MATCH p0=(red)-[r0*]->(end)
WHERE NONE (n IN nodes(p0) WHERE n=rev)
RETURN p0
```

## Demonstration "Correct Process"

**Visualization:**

![](docs/figures/process-example-correct-gateway.drawio.svg)

**Graph Creation:**

```
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
-[:FLOW]->(end);
```

### (d) Topology faults should not be detected during optimization

```
MATCH (opt:NW_OPT:ACTIVITY)
MATCH (gw:EXCLUSIVE:GATEWAY)
MATCH (tf:VIS_TOP:ACTIVITY)
MATCH p0=(opt)-[r0*]->(gw)
MATCH p1=(gw)-[r1]->(tf)
WHERE r1.condition="incorrect topology"
RETURN p0,p1
```

## Demonstration "Conditional Nonexistent"

**Graph Creation:**

```
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
-[:FLOW]->(end);
```

_Intended for anti-pattern (c)._

## Cleanup

**Clear Database:**

```
MATCH (n)
DETACH DELETE n
```

**Stop Neo4j**:

Run `docker compose down`

> Warning: Database may not be persisted!

## About the Code

### Relevant Files

- `src/demo/anti-patterns.ts`: Defines the anti-patterns
- `src/demo/benchmark.ts`: Automatically executes the anti-pattern queries against the process graphs and outputs the execution time
- `src/demo/print-quries.ts`: Outputs the _Cypher_ query for each anti-pattern
- `src/entities.ts`: Provides data models and associated functionality such as stringification of query elements
- `src/query-construction.ts`: Traverses an anti-pattern to build a complete query

### Code Optimizations

- Instead of outputting vertex and edge matches separately, we could aggregate them based on our intermediate query structure constructed from the anti-pattern to potentially improve query execution. Example:

  ```
  MATCH (opt1:NW_OPT:ACTIVITY)-[r0]->(opt2:NW_OPT:ACTIVITY)
  RETURN p0
  ```

  instead of

  ```
  MATCH (opt1:NW_OPT:ACTIVITY)
  MATCH (opt2:NW_OPT:ACTIVITY)
  MATCH p0=(opt1)-[r0]->(opt2)
  RETURN p0
  ```

- For anti-pattern _(c)_, we inserted the end event manually to match a whole path instead of the starting node only. This could potentially be done automatically.
- Source code documentation is work in progress.
