# Anti-Pattern Detection in Process-Driven Decision Support Systems - Demonstration

This project demonstrates the technical feasibility of detecting anti-patterns in a process model describing a PD-DSS by utilizing graph matching provided by the graph database [_Neo4j_](https://neo4j.com/).

## Getting Started

**Dependencies:**

- For query execution: Docker Compose (e.g., part of [Docker Desktop](https://www.docker.com/products/docker-desktop/))
- For query re-generation: [Node.js + npm](https://nodejs.org/en/) (Install additional dependencies with `npm install`. Code was tested with v.14)

**Getting Started:**

1. Run `docker compose up -d && docker-compose logs -f neo4j`
2. Wait for http://localhost:7474 to be available
3. Connect to DB using "No authentication"
4. Run queries - either:
   1. Use queries below
   2. Regenerate queries by running `npm start`

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

<!-- 4ms -->
<!-- ```
MATCH p=(n:NetwOpt)-[:FLOW]->(m)
RETURN p
``` -->

### (b) "No redundant service invocation"

```
MATCH (s1:ACTIVITY)
MATCH (s2:ACTIVITY)
MATCH p0=(s1)-[r0]->(s2)
WHERE labels(s1)=labels(s2)
RETURN p0
```

<!-- 6ms -->
<!-- ```
MATCH p=(n)-[r:UNCONTROLLED_FLOW]->(m)
WHERE labels(n)=labels(m)
RETURN p
``` -->

### (c) Network reduction must be undone

```
MATCH (red:NW_RED:ACTIVITY)
MATCH (end:END:EVENT)
MATCH p0=(red)-[*]->(end)
OPTIONAL MATCH (rev:NW_RR:ACTIVITY)
WHERE NOT exists((red)-[*]->(rev))
RETURN p0
```

<!-- 4ms -->
<!-- ```
MATCH p=(n:NetwRed)-[*]->(e:END)
WHERE NOT EXISTS((n)-[*]->(:NetwRedRev))
RETURN p
``` -->

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
MATCH p0=(opt)-[*]->(gw)
MATCH p1=(gw)-[r1]->(tf)
WHERE r1.condition="incorrect topology"
RETURN p0,p1
```

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

- `src/demonstration.ts`: Includes the anti-patterns and outputs their corresponding _Cypher_ queries
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
