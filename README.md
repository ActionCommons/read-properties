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

## Other useful `npm` commands

### Setup packages defined in the `package.json` file

```bash
npm install
```

### Update packages

Update packages to the latest version allowed by the version range specified in
the `package.json` file.

```bash
npm update
```

### Check for vulnerabilities

```bash
npm audit
```

### Check the registry for newer versions

Check the registry to see if any of the installed packages have newer versions
available.

```bash
npm outdated
```

### Prune

Remove "extraneous" packages—those that are installed in node_modules but no
longer listed in `package.json`

```bash
npm prune
```

### Simplify the dependency tree

Simplify the dependency tree by moving duplicated nested dependencies further up
the hierarchy.

```bash
npm dedupe
```

### Display package dependencies

Display an ASCII tree of all installed packages and their dependencies.

```bash
npm list (or npm ls)
npm ls -g --depth=0   # to see only top-level global packages
```

### Display dependency chain

Check why a specific package is installed by visualizing the dependency chain
leading to it.

```bash
npm explain <package> (formerly npm why)
```

### Run diagnostic tests

Run a series of diagnostic tests to ensure the npm installation and environment
(like the cache and registry access) are working correctly.

```bash
npm doctor
```

### Clear cache

Clear the internal npm cache, which can resolve "ghost" installation errors.

```bash
npm cache clean --force
```

### Continuous Integration

Perform a "clean" install by deleting node_modules and strictly following the
`package-lock.json` file (Designed for CI environments).

```bash
npm ci
```

### Create a symbolic link

Create a symbolic link for a package being developed locally, allowing use in
another project as if it were published.

```bash
npm link
```

### Print detailed metadata about a package

Print detailed metadata about a package from the registry without installing it,
such as available versions or its documentation.

```bash
npm view <package-name>
```
