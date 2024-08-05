import { AutoComplete, Suggestion, SuggestionType } from '../src/index';
import { parse } from '@semiotic-labs/graph-tables';
import { readFileSync } from 'fs';
import path from 'path';
import * as assert from 'assert';

describe('basic', () => {
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

  const SELECT = new Suggestion(SuggestionType.KEYWORD, 'SELECT');
  const WITH = new Suggestion(SuggestionType.KEYWORD, 'WITH');

  const autocomplete = new AutoComplete({ logErrors: false, throwErrors: false });
  autocomplete.updateLayout(layout);

  it('should suggest initialy SELECT and WITH keywords', () => {
    const suggestions = autocomplete.suggest('');
    assert.deepStrictEqual(suggestions, [SELECT, WITH]);
  });

  it('should suggest SELECT after sel entry', () => {
    const suggestions = autocomplete.suggest('sel');
    assert.deepStrictEqual(suggestions, [SELECT]);
  });

  it('should suggest table some_complex_table_erc_20_name after SELECT some', () => {
    const suggestions = autocomplete.suggest('SELECT some');
    assert.equal(
      suggestions.some(
        (suggestion) =>
          suggestion.type === SuggestionType.TABLE &&
          suggestion.value === 'some_complex_table_erc_20_name'
      ),
      true
    );
  });

  it('should suggest function TO_DATE after SELECT TO_D', () => {
    const suggestions = autocomplete.suggest('SELECT TO_D');
    assert.equal(
      suggestions.some(
        (suggestion) =>
          suggestion.type === SuggestionType.FUNCTION && suggestion.value === 'TO_DATE'
      ),
      true
    );
  });

  it('should suggest column id after SELECT some_complex_table_erc_20_name.i', () => {
    const suggestions = autocomplete.suggest('SELECT some_complex_table_erc_20_name');
    assert.equal(
      suggestions.some(
        (suggestion) =>
          suggestion.type === SuggestionType.COLUMN &&
          suggestion.value === 'some_complex_table_erc_20_name.id'
      ),
      true
    );
  });

  it('should suggest FROM after SELECT * F', () => {
    const suggestions = autocomplete.suggest('SELECT * F');
    assert.equal(
      suggestions.some(
        (suggestion) => suggestion.type === SuggestionType.KEYWORD && suggestion.value === 'FROM'
      ),
      true
    );
  });

  it('should suggest table some_complex_table_erc_20_name after SELECT * FROM s', () => {
    const suggestions = autocomplete.suggest('SELECT * FROM s');
    assert.equal(
      suggestions.some(
        (suggestion) =>
          suggestion.type === SuggestionType.TABLE &&
          suggestion.value === 'some_complex_table_erc_20_name'
      ),
      true
    );
  });
});

describe('complex', () => {
  const graphql_schema = readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');

  const layout = parse(graphql_schema);

  const autocomplete = new AutoComplete({ logErrors: false, throwErrors: false });

  autocomplete.updateLayout(layout);

  it('should suggest OVER', () => {
    const suggestions = autocomplete.suggest('SELECT ambtransaction.receiver_network,COUNT(*) O');
    assert.equal(
      suggestions.some(
        (suggestion) => suggestion.type === SuggestionType.KEYWORD && suggestion.value === 'OVER'
      ),
      true
    );
  });

  it('should suggest a.reciever in middle', () => {
    const suggestions = autocomplete.suggest(
      'SELECT a.r FROM ambtransaction AS a WHERE a.bridge_name',
      10
    );
    assert.equal(
      suggestions.some(
        (suggestion) => suggestion.type === SuggestionType.COLUMN && suggestion.value === 'receiver'
      ),
      true
    );
  });
});
