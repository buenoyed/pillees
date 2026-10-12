# pillees

The Pillees CLI, built on [`@pillees/sdk`](../sdk). Runs on a seeded sample market and never signs or sends anything.

From the repo root:

```bash
npm install
npm run pillees -- help
```

Or link it once for a global `pillees` command: `cd packages/cli && npm link`.

| Command | |
| --- | --- |
| `quote <mints...> [--in 1] [--slippage 50]` | Per-hop quote, min out, savings vs separate trades, accounts, CU, instruction data |
| `accounts <mints...> [--user <key>]` | The `multi_hop_swap` account list, in order |
| `venues` | Venues on the sample market |
| `scan [--ticks 20]` | Watch for edges tick by tick |
| `init [capsule.json]` | Write a capsule config |
| `run [capsule.json] [--ticks 30] [--interval 0]` | Dry run a capsule |

Every command takes `--seed <n>` (sample market seed, default 7) and `--json`. `NO_COLOR=1` turns off colours.
