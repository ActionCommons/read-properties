# read-properties

![CI](../../actions/workflows/ci.yml/badge.svg)
![Check dist/](../../actions/workflows/check-dist.yml/badge.svg)
![CodeQL](../../actions/workflows/codeql-analysis.yml/badge.svg)
![Coverage](./badges/coverage.svg)

A GitHub Action that reads one or more Java-style `.properties` files and
exposes every key-value pair as a step output.

## Usage

### Read a single file (all properties)

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v6

  - name: Read config
    id: props
    uses: ActionCommons/read-properties@v1
    with:
      files: config/app.properties

  - name: Use a value
    run: echo "${{ steps.props.outputs['app.version'] }}"
```

### Read multiple files

```yaml
- name: Read multiple files
  id: props
  uses: ActionCommons/read-properties@v1
  with:
    files: |
      config/database.properties
      config/app.properties
```

### Read a subset of properties

The `properties` filter applies to every file listed in `files`.

```yaml
- name: Read selected properties
  id: props
  uses: ActionCommons/read-properties@v1
  with:
    files: |
      config/database.properties
      config/app.properties
    properties: |
      db.host
      app.version
```

## Inputs

| Input        | Required | Description                                                                             |
| ------------ | -------- | --------------------------------------------------------------------------------------- |
| `files`      | **Yes**  | Newline-separated list of one or more `.properties` file paths                          |
| `properties` | No       | Newline-separated list of property keys to read. When omitted, all properties are read. |

## Outputs

Outputs are set dynamically at runtime as `<stem>.<property-key>`, where `stem`
is the filename without its extension.

| Example file        | Example property | Output key       |
| ------------------- | ---------------- | ---------------- |
| `config.properties` | `db.host`        | `config.db.host` |
| `app.properties`    | `version`        | `app.version`    |

### Referencing outputs in expressions

Because output keys contain dots, use bracket notation:

```yaml
${{ steps.props.outputs['config.db.host'] }}
```

### Duplicate filenames

When two files share the same name (but live in different directories), the
first keeps the plain stem and each subsequent file receives a 1-based numeric
suffix:

| File                            | Stem assigned |
| ------------------------------- | ------------- |
| `env/prod/config.properties`    | `config`      |
| `env/staging/config.properties` | `config1`     |
| `env/dev/config.properties`     | `config2`     |

## Supported `.properties` syntax

| Feature                        | Supported |
| ------------------------------ | :-------: |
| `key=value` assignment         |    ✅     |
| `key: value` (colon separator) |    ✅     |
| `#` and `!` comment lines      |    ✅     |
| Backslash line continuation    |    ✅     |
| Spaces around the separator    |    ✅     |
| `=` signs inside values        |    ✅     |
| Empty values (`key=`)          |    ✅     |
| Windows CRLF line endings      |    ✅     |

## Testing locally

Copy `.env.example` to `.env` and set your input values, then run:

```bash
npx @github/local-action . src/main.ts .env
```

Input names follow the `INPUT_<NAME>` convention (hyphens are **not** converted
to underscores):

```bash
# .env
ACTIONS_STEP_DEBUG=true
INPUT_FILES=config/app.properties
INPUT_PROPERTIES=app.version
```
