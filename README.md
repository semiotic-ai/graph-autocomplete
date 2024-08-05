<h1 align="center" style="border-bottom: none;">
graph-autocomplete</h1>
<h3 align="center">SQL autcomplete for subgraph SQL data services</h3>
<p align="center">
  <a href="https://github.com/semantic-release/semantic-release">
    <img alt="semantic-release" src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg">
  </a>
  <a href="https://github.com/semiotic-ai/graph-autocomplete/actions">
    <img alt="Actions Status" src="https://github.com/semiotic-ai/graph-autocomplete/workflows/CI/badge.svg">
  </a>
  <a href="https://github.com/semiotic-ai/graph-autocomplete/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/semiotic-ai/graph-autocomplete">
  </a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@semiotic-labs/graph-autocomplete">
    <img alt="npm install" src="https://img.shields.io/badge/npm%20i-graph--autocomplete-brightgreen">
  </a>
  <a href="https://github.com/semiotic-ai/graph-autocomplete/tags">
    <img alt="version" src="https://img.shields.io/npm/v/@semiotic-labs/graph-autocomplete?color=green&label=version">
  </a>
</p>

## Highlights
- SQL autocomplete to be used with parsed db schema from a subgraph via [graph-tables](https://www.npmjs.com/package/@semiotic-labs/graph-table).
- Supports incomplete SQL
- Supports table and column aliases
- All whitelisted SQL functions 
- Package include CommonJS, ES Modules, UMD version and TypeScript declaration files.

## Planned 
- Support for `enum` type
- Use `relations` for database joins
- Support for function description (signature, example, etc.)
- Support for column description (type, info, etc.)

## Install

```sh
npm install @semiotic-labs/graph-autocomplete
```

## Usage

```ts
import {AutoComplete, Suggestion, SuggestionType} from '@semiotic-labs/graph-autocomplete';
import {parse} from '@semiotic-labs/graph-tables';

const simple_schema = `
    type SomeComplexTableErc20Name  @entity {
        "Some description about a string field"
        id: ID!,
        nullableField:Boolean,
        booleanField:Boolean!,
        bigIntField:BigInt!,
        bytesField:Bytes!,
        bigDecimalField:BigDecimal!,
        intField:Int!,
        int8Field:Int8!,
        stringField:String!
    }
`;

const layout = parse(simple_schema);
const autocomplete = new AutoComplete({logErrors: false, throwErrors: false});
autocomplete.updateLayout(layout);

const suggestions = autocomplete.suggest('SELECT some');
assert.equal(suggestions.some((suggestion) => 
    suggestion.type === SuggestionType.TABLE 
    && suggestion.value === "some_complex_table_erc_20_name"
),true);

```

## Development
The tool used to generate TypeScript code from an ANTLR 4 grammar is written in Java. To fully utilize the ANTLR 4 TypeScript target (including the ability to regenerate code from a grammar file after changes are made), a Java Runtime Environment (JRE) needs to be installed on the developer machine. The generated code itself uses several features new to TypeScript 2.0.

-Java Runtime Environment 1.6+ (1.8+ recommended)

See `syntax` folder for updating both supported functions and SQL lexicon.After changes run
```sh 
npm run lang-build
````
 
