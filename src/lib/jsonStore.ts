/**
 * JSON File-Based Storage Engine
 * Drop-in replacement for Mongoose models — stores data in local JSON files
 * under the `data/` directory at the project root.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function generateId(): string {
  return crypto.randomBytes(12).toString("hex");
}

/* ───────────── helpers ───────────── */

function getNestedValue(obj: any, dotPath: string): any {
  return dotPath.split(".").reduce((o, key) => o?.[key], obj);
}

/** Convert ISO-date strings back to Date objects for comparison */
function toComparable(val: any): any {
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val);
  }
  return val;
}

function serializeValue(val: any): any {
  if (val instanceof Date) return val.toISOString();
  return val;
}

/* ───────────── query matching ───────────── */

function matchValue(docVal: any, queryVal: any): boolean {
  // Operator object?
  if (
    queryVal !== null &&
    queryVal !== undefined &&
    typeof queryVal === "object" &&
    !(queryVal instanceof Date) &&
    !Array.isArray(queryVal)
  ) {
    const keys = Object.keys(queryVal);
    if (keys.some((k) => k.startsWith("$"))) {
      for (const op of keys) {
        switch (op) {
          case "$in":
            if (!queryVal.$in.includes(docVal)) return false;
            break;
          case "$nin":
            if (queryVal.$nin.includes(docVal)) return false;
            break;
          case "$ne":
            // eslint-disable-next-line eqeqeq
            if (docVal === queryVal.$ne) return false;
            break;
          case "$exists":
            if (queryVal.$exists) {
              if (docVal === undefined) return false;
            } else {
              if (docVal !== undefined) return false;
            }
            break;
          case "$gte": {
            const a = toComparable(docVal);
            const b = toComparable(queryVal.$gte);
            if (a === undefined || a === null || a < b) return false;
            break;
          }
          case "$lte": {
            const a = toComparable(docVal);
            const b = toComparable(queryVal.$lte);
            if (a === undefined || a === null || a > b) return false;
            break;
          }
          case "$gt": {
            const a = toComparable(docVal);
            const b = toComparable(queryVal.$gt);
            if (a === undefined || a === null || a <= b) return false;
            break;
          }
          case "$lt": {
            const a = toComparable(docVal);
            const b = toComparable(queryVal.$lt);
            if (a === undefined || a === null || a >= b) return false;
            break;
          }
        }
      }
      return true;
    }
  }

  // Direct comparison
  if (queryVal instanceof Date) {
    const dv = toComparable(docVal);
    return dv instanceof Date ? dv.getTime() === queryVal.getTime() : false;
  }
  return docVal === queryVal;
}

function matchesQuery(doc: any, query: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  for (const key of Object.keys(query)) {
    if (key === "$and") {
      if (!query.$and.every((sub: any) => matchesQuery(doc, sub))) return false;
      continue;
    }
    if (key === "$or") {
      if (!query.$or.some((sub: any) => matchesQuery(doc, sub))) return false;
      continue;
    }
    if (!matchValue(doc[key], query[key])) return false;
  }
  return true;
}

/* ───────────── sort / select ───────────── */

function sortDocs(docs: any[], sortSpec: Record<string, number>): any[] {
  return [...docs].sort((a, b) => {
    for (const [field, dir] of Object.entries(sortSpec)) {
      const va = toComparable(getNestedValue(a, field));
      const vb = toComparable(getNestedValue(b, field));
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
    }
    return 0;
  });
}

function applySelect(doc: any, fields: string): any {
  const parts = fields.trim().split(/\s+/);
  const isExclude = parts[0].startsWith("-");

  if (isExclude) {
    const excludeFields = parts.map((p) => p.slice(1));
    const result: any = {};
    for (const key of Object.keys(doc)) {
      if (!excludeFields.includes(key)) result[key] = doc[key];
    }
    return result;
  }

  // include-mode — always keep _id
  const result: any = { _id: doc._id };
  for (const field of parts) {
    if (doc[field] !== undefined) result[field] = doc[field];
  }
  return result;
}

/* ───────────── aggregate helpers ───────────── */

function resolveExpr(doc: any, expr: any): any {
  if (typeof expr === "string" && expr.startsWith("$")) {
    return doc[expr.slice(1)];
  }
  if (expr && typeof expr === "object") {
    if (expr.$ifNull) {
      const [fieldExpr, defaultVal] = expr.$ifNull;
      const val = resolveExpr(doc, fieldExpr);
      return val === null || val === undefined ? defaultVal : val;
    }
    if (expr.$month) {
      const d = new Date(resolveExpr(doc, expr.$month));
      return d.getMonth() + 1;
    }
    if (expr.$year) {
      const d = new Date(resolveExpr(doc, expr.$year));
      return d.getFullYear();
    }
  }
  return expr;
}

function processAggregate(docs: any[], pipeline: any[]): any[] {
  let result = [...docs];

  for (const stage of pipeline) {
    /* ── $match ── */
    if (stage.$match) {
      result = result.filter((d) => matchesQuery(d, stage.$match));
    }

    /* ── $group ── */
    if (stage.$group) {
      const { _id: groupId, ...accumulators } = stage.$group;
      const groups = new Map<string, any>();

      for (const doc of result) {
        let keyObj: any;
        if (groupId === null) {
          keyObj = null;
        } else if (typeof groupId === "string" && groupId.startsWith("$")) {
          keyObj = doc[groupId.slice(1)];
        } else if (typeof groupId === "object") {
          keyObj = {} as any;
          for (const [k, v] of Object.entries(groupId)) {
            keyObj[k] = resolveExpr(doc, v);
          }
        } else {
          keyObj = groupId;
        }

        const keyStr = JSON.stringify(keyObj);
        if (!groups.has(keyStr)) {
          const entry: any = { _id: keyObj };
          for (const accName of Object.keys(accumulators)) {
            entry[accName] = 0;
          }
          groups.set(keyStr, entry);
        }

        const group = groups.get(keyStr)!;
        for (const [accName, accExpr] of Object.entries(accumulators)) {
          const expr = accExpr as any;
          if (expr.$sum !== undefined) {
            if (expr.$sum === 1) {
              group[accName] += 1;
            } else if (typeof expr.$sum === "string" && expr.$sum.startsWith("$")) {
              group[accName] += doc[expr.$sum.slice(1)] || 0;
            }
          }
        }
      }
      result = Array.from(groups.values());
    }

    /* ── $sort ── */
    if (stage.$sort) {
      result = sortDocs(result, stage.$sort);
    }

    /* ── $bucket ── */
    if (stage.$bucket) {
      const { groupBy, boundaries, default: defaultBucket, output } = stage.$bucket;
      const buckets = new Map<string, any>();

      for (let i = 0; i < boundaries.length - 1; i++) {
        const entry: any = { _id: boundaries[i] };
        if (output) {
          for (const key of Object.keys(output)) entry[key] = 0;
        }
        buckets.set(String(boundaries[i]), entry);
      }
      if (defaultBucket !== undefined) {
        const entry: any = { _id: defaultBucket };
        if (output) {
          for (const key of Object.keys(output)) entry[key] = 0;
        }
        buckets.set("__default__", entry);
      }

      for (const doc of result) {
        const val = resolveExpr(doc, groupBy);
        let placed = false;
        for (let i = 0; i < boundaries.length - 1; i++) {
          if (val >= boundaries[i] && val < boundaries[i + 1]) {
            const b = buckets.get(String(boundaries[i]))!;
            if (output) {
              for (const [key, expr] of Object.entries(output)) {
                if ((expr as any).$sum === 1) b[key] += 1;
              }
            }
            placed = true;
            break;
          }
        }
        if (!placed && defaultBucket !== undefined) {
          const b = buckets.get("__default__")!;
          if (output) {
            for (const [key, expr] of Object.entries(output)) {
              if ((expr as any).$sum === 1) b[key] += 1;
            }
          }
        }
      }

      result = Array.from(buckets.values()).filter((b) => {
        if (output) return Object.keys(output).some((k) => b[k] > 0);
        return true;
      });
    }
  }

  return result;
}

/* ━━━━━━━━━━━━━  QueryBuilder (chainable + thenable)  ━━━━━━━━━━━━━ */

class QueryBuilder {
  private _selectStr: string | null = null;
  private _sortSpec: Record<string, number> | null = null;

  constructor(
    private _collection: JsonCollection,
    private _query: any,
    private _isMany: boolean,
  ) {}

  select(fields: string): this {
    this._selectStr = fields;
    return this;
  }

  sort(spec: Record<string, number>): this {
    this._sortSpec = spec;
    return this;
  }

  /* makes this object `await`-able */
  then(
    resolve?: ((value: any) => any) | null,
    reject?: ((reason: any) => any) | null,
  ) {
    try {
      let docs = this._collection._readAll();
      docs = docs.filter((d: any) => matchesQuery(d, this._query || {}));

      if (this._sortSpec) docs = sortDocs(docs, this._sortSpec);

      if (this._isMany) {
        if (this._selectStr)
          docs = docs.map((d: any) => applySelect(d, this._selectStr!));
        const wrapped = docs.map((d: any) => this._collection._wrapDoc(d));
        return Promise.resolve(wrapped).then(resolve, reject);
      }

      const doc = docs[0] || null;
      if (!doc) return Promise.resolve(null).then(resolve, reject);
      const selected = this._selectStr ? applySelect(doc, this._selectStr) : doc;
      return Promise.resolve(this._collection._wrapDoc(selected)).then(resolve, reject);
    } catch (err) {
      return Promise.reject(err).then(resolve, reject);
    }
  }
}

/* ━━━━━━━━━━━━━  JsonCollection  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export class JsonCollection {
  private filePath: string;

  constructor(private collectionName: string) {
    ensureDataDir();
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "[]", "utf-8");
    }
  }

  /* ── internal I/O ── */

  _readAll(): any[] {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  _writeAll(docs: any[]): void {
    ensureDataDir();
    fs.writeFileSync(this.filePath, JSON.stringify(docs, null, 2), "utf-8");
  }

  _wrapDoc(doc: any): any {
    if (!doc) return doc;
    const self = this;
    const wrapped = { ...doc };

    // Add a non-enumerable save() so it behaves like a Mongoose document
    Object.defineProperty(wrapped, "save", {
      enumerable: false,
      configurable: true,
      value: async function (this: any) {
        const docs = self._readAll();
        const idx = docs.findIndex((d: any) => d._id === this._id);
        if (idx !== -1) {
          const data: any = {};
          for (const key of Object.keys(this)) {
            data[key] = serializeValue(this[key]);
          }
          data._id = this._id; // preserve _id
          data.updatedAt = new Date().toISOString();
          docs[idx] = data;
          self._writeAll(docs);
        }
        return this;
      },
    });

    return wrapped;
  }

  /* ── Mongoose-compatible static methods ── */

  find(query?: any): QueryBuilder {
    return new QueryBuilder(this, query || {}, true);
  }

  findOne(query?: any): QueryBuilder {
    return new QueryBuilder(this, query || {}, false);
  }

  async findById(id: string): Promise<any> {
    const docs = this._readAll();
    const doc = docs.find((d: any) => d._id === id);
    return doc ? this._wrapDoc(doc) : null;
  }

  async create(data: any): Promise<any> {
    const docs = this._readAll();
    const now = new Date().toISOString();
    const newDoc: any = {
      _id: generateId(),
      ...data,
      createdAt: serializeValue(data.createdAt) || now,
      updatedAt: serializeValue(data.updatedAt) || now,
    };
    // serialize any remaining Date fields
    for (const key of Object.keys(newDoc)) {
      newDoc[key] = serializeValue(newDoc[key]);
    }
    docs.push(newDoc);
    this._writeAll(docs);
    return this._wrapDoc({ ...newDoc });
  }

  async findOneAndUpdate(
    query: any,
    update: any,
    options?: { upsert?: boolean; new?: boolean },
  ): Promise<any> {
    const docs = this._readAll();
    let idx = docs.findIndex((d: any) => matchesQuery(d, query));

    if (idx === -1 && options?.upsert) {
      const newDoc: any = {
        _id: generateId(),
        ...query,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      idx = docs.length;
      docs.push(newDoc);
    }

    if (idx === -1) return null;

    const { $unset, $set, ...directFields } = update;

    // direct field updates
    for (const [key, value] of Object.entries(directFields)) {
      if (!key.startsWith("$")) {
        docs[idx][key] = serializeValue(value);
      }
    }

    // $set
    if ($set) {
      for (const [key, value] of Object.entries($set)) {
        docs[idx][key] = serializeValue(value);
      }
    }

    // $unset
    if ($unset) {
      for (const key of Object.keys($unset)) {
        delete docs[idx][key];
      }
    }

    docs[idx].updatedAt = new Date().toISOString();
    this._writeAll(docs);

    return options?.new !== false ? this._wrapDoc({ ...docs[idx] }) : null;
  }

  async countDocuments(query?: any): Promise<number> {
    const docs = this._readAll();
    if (!query || Object.keys(query).length === 0) return docs.length;
    return docs.filter((d: any) => matchesQuery(d, query)).length;
  }

  async updateOne(
    query: any,
    update: any,
  ): Promise<{ modifiedCount: number }> {
    const docs = this._readAll();
    const idx = docs.findIndex((d: any) => matchesQuery(d, query));
    if (idx === -1) return { modifiedCount: 0 };

    const { $unset, $set, ...directFields } = update;

    for (const [key, value] of Object.entries(directFields)) {
      if (!key.startsWith("$")) {
        docs[idx][key] = serializeValue(value);
      }
    }
    if ($set) {
      for (const [key, value] of Object.entries($set)) {
        docs[idx][key] = serializeValue(value);
      }
    }
    if ($unset) {
      for (const key of Object.keys($unset)) {
        delete docs[idx][key];
      }
    }

    docs[idx].updatedAt = new Date().toISOString();
    this._writeAll(docs);
    return { modifiedCount: 1 };
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    const docs = this._readAll();
    return processAggregate(docs, pipeline);
  }
}
