/** PR list item from GET /api/pr-list — fields may vary; uuid for detail navigation; material_request_id for status API. */
export type PrListRow = Record<string, unknown> & {
  uuid?: string;
  request_id?: string | number;
  material_request_id?: string | number;
};

/** PR detail payload from GET /api/pr-details/{uuid}. */
export type PrDetailPayload = Record<string, unknown> & {
  material_request_details?: unknown;
};
