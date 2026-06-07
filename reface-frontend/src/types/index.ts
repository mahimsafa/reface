export interface ProcessRecord {
  id: number;
  job_type: string;
  status: string;
  source_image: string | null;
  target_image: string | null;
  result_image: string | null;
  result_images: string[];
  restore_enabled: boolean;
  error_message: string | null;
  created_at: string | null;
  finished_at: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
