/**
 * Minimal SQLite tokenizer that reproduces `sqlite3_bind_parameter_count` and
 * `sqlite3_bind_parameter_name` for the FIRST statement of `sql` (prepare only
 * compiles the first statement, exactly like expo-sqlite's prepareAsync).
 *
 * Needed because expo-sqlite binds array params by raw index (`index = key+1`)
 * and silently ignores out-of-range indexes, while node:sqlite throws.
 */
export interface SqlParamInfo {
  count: number;
  /** names[i] is the name of parameter index i+1; null for anonymous `?` or unnamed holes. */
  names: (string | null)[];
}

function isIdChar(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch) || ch.charCodeAt(0) >= 0x80;
}

export function scanSqlParameters(sql: string): SqlParamInfo {
  const names: (string | null)[] = [];
  let count = 0;
  const byName = new Map<string, number>();
  const assign = (index: number, name: string | null) => {
    while (names.length < index) names.push(null);
    if (name !== null && names[index - 1] === null) names[index - 1] = name;
  };
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i + 2);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2;
            continue;
          }
          break;
        }
        j += 1;
      }
      i = j + 1;
      continue;
    }
    if (ch === "[") {
      const end = sql.indexOf("]", i + 1);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (ch === ";") break;
    if (ch === "?") {
      let j = i + 1;
      while (j < n && /[0-9]/.test(sql[j])) j += 1;
      if (j === i + 1) {
        count += 1;
        assign(count, null);
      } else {
        const index = Number(sql.slice(i + 1, j));
        const name = sql.slice(i, j);
        if (index > count) count = index;
        assign(index, name);
      }
      i = j;
      continue;
    }
    if (ch === ":" || ch === "@" || ch === "$" || ch === "#") {
      let j = i + 1;
      let identChars = 0;
      while (j < n) {
        const c = sql[j];
        if (isIdChar(c)) {
          identChars += 1;
          j += 1;
        } else if (c === "(" && identChars > 0) {
          const close = sql.indexOf(")", j);
          j = close === -1 ? n : close + 1;
          break;
        } else if (c === ":" && sql[j + 1] === ":") {
          j += 2;
        } else {
          break;
        }
      }
      if (identChars > 0) {
        const name = sql.slice(i, j);
        const existing = byName.get(name);
        if (existing === undefined) {
          count += 1;
          byName.set(name, count);
          assign(count, name);
        }
        i = j;
        continue;
      }
      i += 1;
      continue;
    }
    i += 1;
  }
  while (names.length < count) names.push(null);
  return { count, names };
}
