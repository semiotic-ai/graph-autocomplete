import { CodeCompletionCore } from './parsing/CodeCompletionCore';
import { Layout } from '@semiotic-labs/graph-tables';
import { ParsedQuery } from './models/ParsedQuery';
import { OutputColumn } from './models/OutputColumn';
import { PostgresScript } from './postgres/PostgresScript';

/** AutoComplete options */
export interface Options {
  /** Log errors to console */
  logErrors: boolean;
  /** Throw errors */
  throwErrors: boolean;
}

/** Suggestion type */
export enum SuggestionType {
  /** SQL keyword like `SELECT, WHERE, FROM` */
  KEYWORD = 'KEYWORD',
  /** Supported SQL (whitelisted PostgreSQL) functions */
  FUNCTION = 'FUNCTION',
  /** A database table column */
  COLUMN = 'COLUMN',
  /** A database table */
  TABLE = 'TABLE'
}

/** A completion suggestion
 * @param value - The suggestion value
 * @param type - The suggestion type
 */
export class Suggestion {
  value?: string;
  type: SuggestionType;

  constructor(type: SuggestionType, value?: string) {
    this.value = value;
    this.type = type;
  }
}

const INITIAL_SUGGESTIONS = [
  new Suggestion(SuggestionType.KEYWORD, 'SELECT'),
  new Suggestion(SuggestionType.KEYWORD, 'WITH')
];

function getAllOutputColumns(query: ParsedQuery): OutputColumn[] {
  return [...query.outputColumns, ...[...query.subqueries.values()].flatMap(getAllOutputColumns)];
}

/** A SQL auto completion engine without any database side effect (change). */
export class AutoComplete {
  _options?: Options;
  _tableNames: string[] = [];
  _columnNames: string[] = [];
  _layout?: Layout;

  /**
   * Returns a new AutoComplete instance
   * @param options - AutoComplete options
   */
  constructor(options?: Options) {
    this._options = options;
  }

  /**
   * Update the database layout
   * @param layout - The layout
   */
  public updateLayout(layout?: Layout): void {
    this._tableNames = [];
    this._columnNames = [];
    this._layout = layout;

    if (layout) {
      const uniqueColumnNames = new Set<string>();

      for (const [tableName, table] of layout.tables) {
        this._tableNames.push(tableName);
        for (const columnName of table.columns.keys()) {
          uniqueColumnNames.add(columnName);
          uniqueColumnNames.add(`${tableName}.${columnName}`);
        }
      }

      this._columnNames = [...uniqueColumnNames];
    }
  }

  /**
   * Suggest completions for a SQL script
   * @param sqlScript - The SQL script
   * @param atIndex - The index of the cursor to autocomplete after
   */
  public suggest(sqlScript: string, atIndex?: number): Suggestion[] {
    const indexToAutocomplete = (atIndex ? atIndex : sqlScript.length) - 1;
    const suggestions: Suggestion[] = [];

    if (indexToAutocomplete < 0) {
      return INITIAL_SUGGESTIONS;
    } else if (indexToAutocomplete === sqlScript.length - 1 && sqlScript.indexOf(' ') === -1) {
      for (const suggestion of INITIAL_SUGGESTIONS) {
        if (suggestion.value?.startsWith(sqlScript.toUpperCase())) {
          return [suggestion];
        }
      }
    }

    const script = new PostgresScript(sqlScript, {
      logErrors: this._options?.logErrors || false,
      throwErrors: this._options?.throwErrors || false,
      removedTrailingPeriod: false
    });

    const tableNames: string[] = this._tableNames.slice();
    const columnNames: string[] = this._columnNames.slice();

    [...script.ParsedStatement.parsedQueries.values()].forEach((query) => {
      [...query.getAllReferencedTables().values()].forEach((table) => {
        for (const alias of table.aliases) {
          const tableName = table.tableName.toLowerCase();
          if (this._layout?.tables.has(tableName)) {
            tableNames.push(alias);
            for (const columnName of this._layout?.tables.get(tableName)?.columns.keys() || []) {
              columnNames.push(`${alias}.${columnName}`);
            }
          }
        }
      });

      getAllOutputColumns(query).forEach((column) => {
        if (column.columnAlias) {
          columnNames.push(column.columnAlias);
        }
      });
    });

    const core = new CodeCompletionCore(script.parser);
    core.ignoredTokens = new Set(script.TokensToIgnore);

    const query = script.ParsedStatement.getQueryAtLocation(indexToAutocomplete);
    const token = query?.getTokenAtLocation(indexToAutocomplete);

    if (token && token.location.streamIndex >= 0) {
      const tokenString =
        (token.location.stopIndex <= indexToAutocomplete
          ? token.value
          : token.value?.substring(0, indexToAutocomplete - token.location.startIndex)) || '';

      // Depending on the SQL grammar, we may not get both Tables and Column rules,
      // even if both are viable options for autocompletion
      // So, instead of using all preferredRules at once, we'll do them separate
      let isTableCandidatePosition = false;
      let isColumnCandidatePosition = false;
      for (const preferredRules of [
        script.PreferredRulesForTable,
        script.PreferredRulesForColumn
      ]) {
        core.preferredRules = new Set(preferredRules);
        const candidates = core.collectCandidates(token.location.streamIndex);
        for (const candidateToken of candidates.tokens) {
          let candidateTokenValue = script.parser.vocabulary.getDisplayName(candidateToken[0]);
          if (candidateTokenValue.startsWith("'") && candidateTokenValue.endsWith("'")) {
            candidateTokenValue = candidateTokenValue.substring(1, candidateTokenValue.length - 1);
          }
          let followOnTokens = candidateToken[1];
          for (const followOnToken of followOnTokens) {
            let followOnTokenValue = script.parser.vocabulary.getDisplayName(followOnToken);
            if (followOnTokenValue.startsWith("'") && followOnTokenValue.endsWith("'")) {
              followOnTokenValue = followOnTokenValue.substring(1, followOnTokenValue.length - 1);
            }
            if (!(followOnTokenValue.length === 1 && /[^\w\s]/.test(followOnTokenValue))) {
              candidateTokenValue += ' ';
            }
            candidateTokenValue += followOnTokenValue;
          }
          if (
            tokenString.length === 0 ||
            (candidateTokenValue.startsWith(tokenString.toUpperCase()) &&
              suggestions.find((option) => option.value === candidateTokenValue) === undefined)
          ) {
            const suggestionType = script.isFunction(candidateToken[0])
              ? SuggestionType.FUNCTION
              : SuggestionType.KEYWORD;
            suggestions.push(new Suggestion(suggestionType, candidateTokenValue));
          }
        }
        for (const rule of candidates.rules) {
          if (script.PreferredRulesForTable.includes(rule[0])) {
            isTableCandidatePosition = true;
          }
          if (script.PreferredRulesForColumn.includes(rule[0])) {
            isColumnCandidatePosition = true;
          }
        }
      }

      const candidate = tokenString.toLowerCase();

      if (isTableCandidatePosition) {
        for (const tableName of tableNames) {
          if (tableName.startsWith(candidate)) {
            suggestions.unshift(new Suggestion(SuggestionType.TABLE, tableName));
          }
          if (suggestions.length === 0 || suggestions[0].type !== SuggestionType.TABLE) {
            // If none of the table options match, still identify this as a potential table location
            suggestions.unshift(new Suggestion(SuggestionType.TABLE));
          }
        }
      }
      if (isColumnCandidatePosition) {
        for (const columnName of columnNames) {
          if (columnName.startsWith(candidate)) {
            suggestions.unshift(new Suggestion(SuggestionType.COLUMN, columnName));
          }
          if (suggestions.length === 0 || suggestions[0].type !== SuggestionType.COLUMN) {
            // If none of the column options match, still identify this as a potential column location
            suggestions.unshift(new Suggestion(SuggestionType.COLUMN));
          }
        }
      }
    }

    return suggestions;
  }
}
