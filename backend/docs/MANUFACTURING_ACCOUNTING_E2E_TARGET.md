# Manufacturing Accounting E2E Target

Example:

```text
Material actual cost = 80
Labor = 0
Overhead = 0
Actual total cost = 80
Expected cost = 75
Total variance = +5
```

Expected source journals:

```text
Material Consumption
WIP                 Dr 80
Raw Materials       Cr 80

Production Completion
Finished Goods      Dr 80
WIP                 Cr 80

Production Variance
Manufacturing Var.  Dr 5
WIP                 Cr 5
```

E2E assertions:

```text
one source journal per source document
every journal balanced
raw material stock decreases once
finished goods stock increases once
retry does not duplicate stock
retry does not duplicate journals
source types are correct
company isolation holds
```
