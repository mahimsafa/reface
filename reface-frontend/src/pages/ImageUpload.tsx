import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Upload, Image, ArrowRight } from 'lucide-react';
import { uploadSchema, UploadFormData, processUploadData } from '../lib/validations';
import { api, saveToLocalStorage } from '../lib/api';

const ImageUpload: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const form = useForm<UploadFormData>({
    // @ts-expect-error ignore
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      sourceIndex: 0,
      targetIndex: 0,
    },
  });

  const { register, watch, formState: { errors } } = form;
  const { handleSubmit, reset } = form;

  const uploadMutation = useMutation({
    mutationFn: api.upload,
    onSuccess: (response) => {
      saveToLocalStorage(response.data);
      queryClient.invalidateQueries({ queryKey: ['processedImages'] });
      reset();
      navigate('/processed');
    },
  });

  const onSubmit: SubmitHandler<UploadFormData> = (formData) => {
    try {
      // Process the form data to extract File objects from FileList
      const uploadData = processUploadData(formData);
      uploadMutation.mutate(uploadData);
    } catch (error) {
      console.error('Error processing form data:', error);
    }
  };

  const sourceImage = watch('sourceImage')?.[0];
  const targetImage = watch('targetImage')?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Face Swap Upload</h1>
          <p className="text-lg text-gray-600">Upload your source and target images to begin face swapping</p>
        </div>

        {/* @ts-expect-error ignore */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Source Image Upload */}
              <div className="space-y-4">
                <label className="block text-lg font-semibold text-gray-900">
                  Source Image
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    {...register('sourceImage', { required: 'Source image is required' })}
                    className="hidden"
                    id="sourceImage"
                  />
                  <label
                    htmlFor="sourceImage"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200 group-hover:border-blue-400"
                  >
                    {sourceImage ? (
                      <img
                        src={URL.createObjectURL(sourceImage)}
                        alt="Source preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-center">
                          Click to upload source image
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.sourceImage && (
                  <p className="text-red-500 text-sm">
                    {typeof errors.sourceImage.message === 'string' ? errors.sourceImage.message : 'Invalid source image'}
                  </p>
                )}
              </div>

              {/* Target Image Upload */}
              <div className="space-y-4">
                <label className="block text-lg font-semibold text-gray-900">
                  Target Image
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    {...register('targetImage', { required: 'Target image is required' })}
                    className="hidden"
                    id="targetImage"
                  />
                  <label
                    htmlFor="targetImage"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200 group-hover:border-teal-400"
                  >
                    {targetImage ? (
                      <img
                        src={URL.createObjectURL(targetImage)}
                        alt="Target preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Image className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-center">
                          Click to upload target image
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.targetImage && (
                  <p className="text-red-500 text-sm">
                    {typeof errors.targetImage.message === 'string' ? errors.targetImage.message : 'Invalid target image'}
                  </p>
                )}
              </div>
            </div>

            {/* Index Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Source Face Index
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...register('sourceIndex', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Source face index"
                />
                {errors.sourceIndex && (
                  <p className="text-red-500 text-sm mt-2">{errors.sourceIndex.message}</p>
                )}
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Target Face Index
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...register('targetIndex', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Target face index"
                />
                {errors.targetIndex && (
                  <p className="text-red-500 text-sm mt-2">{errors.targetIndex.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-8">
              <button
                type="submit"
                disabled={uploadMutation.isPending}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Face Swap
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {uploadMutation.error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700">
              Upload failed. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;