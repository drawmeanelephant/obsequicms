import {
  ApiError,
  ErrorResponseSchema,
  PageIndexSchema,
  SiteSummarySchema,
  SourceBufferSchema,
  SourcePathSchema,
  SourceRevisionSchema,
  type ObsequiousClient,
  type PageIndex,
} from '@obsequious/contracts';

type Schema<T> = { parse(value: unknown): T };

/** Real same-origin HTTP only. Never imports or substitutes demo records. */
export function createConnectedClient(options: {
  fetch?: typeof fetch;
  onIndex?: (index: PageIndex | null) => void;
} = {}): ObsequiousClient {
  let latestIndexRequest = 0;
  const request = async <T>(url: string, schema: Schema<T>): Promise<T> => {
    let response: Response;
    try {
      response = await (options.fetch ?? globalThis.fetch)(url, {
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new ApiError('unavailable', 'The private backend could not be reached. No demo fallback was used.');
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('unavailable', 'The backend returned an unreadable response. No fallback was used.');
    }
    if (!response.ok) {
      const failure = ErrorResponseSchema.safeParse(body);
      if (failure.success) {
        throw new ApiError(failure.data.error.code, failure.data.error.message, failure.data.requestId);
      }
      throw new ApiError('unavailable', `The backend request failed (HTTP ${response.status}).`);
    }
    try {
      return schema.parse(body);
    } catch {
      throw new ApiError('unsupported', 'The backend response does not match the supported application contract.');
    }
  };
  const unsupported = async (): Promise<never> => {
    throw new ApiError('unsupported', 'This action is not connected in read-only M1. No source was saved and no job or readiness check ran.');
  };
  return {
    mode: 'connected',
    getSite: () => request('/api/v1/site', SiteSummarySchema),
    async getPages() {
      const generation = ++latestIndexRequest;
      options.onIndex?.(null);
      const index = await request('/api/v1/pages', PageIndexSchema);
      if (generation === latestIndexRequest) options.onIndex?.(index);
      return index;
    },
    async getSource(input) {
      const path = SourcePathSchema.safeParse(input.path);
      const revision = SourceRevisionSchema.safeParse(input.sourceRevision);
      if (!path.success || !revision.success) {
        throw new ApiError('invalid_request', 'Source reads require a valid snapshot and source path.');
      }
      const query = new URLSearchParams({ path: path.data, sourceRevision: revision.data });
      const source = await request(`/api/v1/source?${query}`, SourceBufferSchema);
      if (source.path !== path.data || source.sourceRevision !== revision.data) {
        throw new ApiError('conflict', 'The backend returned source for a different path or revision.');
      }
      return source;
    },
    getReadiness: unsupported,
    saveSource: unsupported,
    startJob: unsupported,
    getJob: unsupported,
  };
}
