# stackdiff

A CLI tool that compares dependency trees across branches and surfaces breaking version conflicts before merge.

## Installation

```bash
npm install -g stackdiff
```

Or use with npx:

```bash
npx stackdiff
```

## Usage

Compare dependencies between your current branch and main:

```bash
stackdiff main
```

Compare two specific branches:

```bash
stackdiff feature/new-api main
```

With custom options:

```bash
stackdiff main --severity breaking --format table
```

### Example Output

```
🔍 Comparing dependencies: feature/auth → main

⚠️  Breaking Changes Found:
  react: 17.0.2 → 18.2.0 (major)
  typescript: 4.9.5 → 5.0.0 (major)

📦 Minor Updates:
  axios: 1.3.0 → 1.4.0 (minor)

✅ No conflicts detected in 24 other packages
```

## Options

- `--severity <level>` - Filter by change severity: `all`, `breaking`, `minor`, `patch` (default: `all`)
- `--format <type>` - Output format: `table`, `json`, `markdown` (default: `table`)
- `--ignore <packages>` - Comma-separated list of packages to ignore

## License

MIT