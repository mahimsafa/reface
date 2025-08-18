import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, Loader, Hash } from 'lucide-react';
import { api } from '../lib/api';
import { ProcessedImage } from '../types';
import { timeTaken } from '../lib/utils';


const ProcessedImageDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['processedImage', id],
    queryFn: () => api.getProcessedImage(id!),
    enabled: !!id,
  });

  const getStatusIcon = (status: ProcessedImage['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'processing':
        return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: ProcessedImage['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading image details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Image not found</p>
          <Link
            to="/processed"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Link>
        </div>
      </div>
    );
  }

const image = data.data;
  console.log(image);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/processed"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to List
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900">Face Swap Details</h1>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(image.status)}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Face Swap #{image.id}
                </h2>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border mt-2 ${getStatusColor(image.status)}`}>
                  {image.status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Hash className="w-4 h-4" />
                {/* generate a total time taken in the format of 1h 2m 3s from image.processStarted to image.processEnded */}
                <span className="font-mono text-sm">
                  {timeTaken(image.processStarted, image.processEnded) }
                  </span>
              </div>
            </div>
          </div>
        </div>

        {/* Images Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Source Image */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-square bg-gray-100">
              <img
                src={image.sourceImage}
                alt="Source"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Source Image</h3>
              <p className="text-gray-600">The original face to be swapped</p>
            </div>
          </div>

          {/* Target Image */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-square bg-gray-100">
              <img
                src={image.targetImage}
                alt="Target"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Image</h3>
              <p className="text-gray-600">The destination for the face swap</p>
            </div>
          </div>

          {/* Result Image */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {image.resultImage ? (
                <img
                  src={image.resultImage}
                  alt="Result"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    {getStatusIcon(image.status)}
                  </div>
                  <p className="text-gray-500 capitalize">
                    {image.status === 'processing' ? 'Processing...' : image.status}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Result Image</h3>
              <p className="text-gray-600">
                {image.resultImage ? 'Face swap completed' : 'Processing in progress'}
              </p>
            </div>
          </div>
        </div>

        {/* Process Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Process Information</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Process Started</p>
                  <p className="text-gray-900">{formatDate(image.processStarted)}</p>
                </div>
              </div>
              
              {image.processEnded && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Process Completed</p>
                    <p className="text-gray-900">{formatDate(image.processEnded)}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Image ID</p>
                  <p className="text-gray-900 font-mono">{image.id}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">#</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Index</p>
                  <p className="text-gray-900">{image.index}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessedImageDetails;