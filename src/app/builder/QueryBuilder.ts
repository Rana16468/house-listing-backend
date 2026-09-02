export type QueryParams = Record<string, unknown>;

export interface BuiltQuery {
  where: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'>;
  skip: number;
  take: number;
  page: number;
  limit: number;
}


export class QueryBuilder {
  private query: QueryParams;
  private where: Record<string, unknown> = {};

  constructor(query: QueryParams = {}) {
    this.query = query;
  }

  search(fields: string[]) {
    const term = this.query.searchTerm as string | undefined;
    if (term && fields.length) {
      this.where.OR = fields.map((f) => ({
        [f]: { contains: term, mode: 'insensitive' },
      }));
    }
    return this;
  }

  filter(allowed: string[]) {
    for (const key of allowed) {
      const value = this.query[key];
      if (value !== undefined && value !== '' && value !== null) {
        this.where[key] = value;
      }
    }
    return this;
  }

  scope(extra: Record<string, unknown>) {
    Object.assign(this.where, extra);
    return this;
  }

  build(defaultSort = 'createdAt'): BuiltQuery {
    const page = Math.max(1, Number(this.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(this.query.limit ?? 10)));
    const sortBy = (this.query.sortBy as string) || defaultSort;
    const sortOrder = (this.query.sortOrder as 'asc' | 'desc') === 'asc' ? 'asc' : 'desc';

    return {
      where: this.where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      page,
      limit,
    };
  }
}

export const meta = (total: number, q: BuiltQuery) => ({
  page: q.page,
  limit: q.limit,
  total,
  totalPage: Math.ceil(total / q.limit),
});
