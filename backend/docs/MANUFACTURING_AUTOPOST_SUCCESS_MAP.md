# Manufacturing Auto-post Success Map

Current:

```text
Build                               ✅
Manufacturing DB migrations         ✅
Manufacturing accounting HIGH=0     ✅
Accounting idempotency              ✅
Entity schema                       🟡 remove ProductionOrder.totalVariance
Lifecycle auto-post                 ❌ ERROR=9 WARN=5
Accounting E2E bootstrap            ❌
```

After this stage:

```text
Lifecycle auto-post ERROR           target 0
Lifecycle warnings                  ~5
Unit suite                          target green
```

Next:

```text
1. resolve lifecycle warnings
2. build real E2E fixture/bootstrap
3. run accounting reconciliation E2E
4. finalize WIP policy
```
