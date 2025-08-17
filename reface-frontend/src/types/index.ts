export interface ProcessedImage {
  id: string;
  sourceImage: string;
  targetImage: string;
  resultImage?: string;
  index: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processStarted: string;
  processEnded?: string;
  createdAt: string;
}

export interface UploadRequest {
  sourceImage: File;
  targetImage: File;
  index: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  createdAt: string;
}

export interface UsageData {
  date: string;
  processedItems: number;
  creditsUsed: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

export interface FilterOptions {
  status?: ProcessedImage['status'];
  sortBy: 'processStarted' | 'processEnded';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}