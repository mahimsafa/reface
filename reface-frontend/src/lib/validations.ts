import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Type for the processed data with File
interface ProcessedUploadData {
  sourceImage: File;
  targetImage: File;
  index: number;
}

// File validation function
const validateFile = (file: unknown, fieldName: string) => {
  if (!(file instanceof FileList) || file.length === 0) {
    throw new Error(`${fieldName} is required`);
  }
  
  const fileObj = file[0];
  
  if (fileObj.size > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 5MB');
  }
  
  if (!ACCEPTED_IMAGE_TYPES.includes(fileObj.type)) {
    throw new Error('Only .jpg, .jpeg, .png and .webp formats are supported');
  }
  
  return fileObj;
};

export const uploadSchema = z.object({
  sourceImage: z.any(),
  targetImage: z.any(),
  index: z
    .number()
    .min(0, 'Index must be at least 0')
    .max(10, 'Index must be at most 10'),
});

export type UploadFormData = z.infer<typeof uploadSchema>;

// Helper function to process the form data
export const processUploadData = (data: UploadFormData): ProcessedUploadData => {
  const sourceImage = validateFile(data.sourceImage, 'Source image');
  const targetImage = validateFile(data.targetImage, 'Target image');
  
  return {
    sourceImage,
    targetImage,
    index: data.index,
  };
};