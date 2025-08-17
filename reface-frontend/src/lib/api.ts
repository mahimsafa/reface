import { ProcessedImage, UploadRequest, ApiResponse, User, UsageData, CreditPackage, FilterOptions } from '../types';

const API_BASE_URL = 'http://localhost:8000';

// Define the backend process record type
interface ProcessRecord {
  id: number;
  source_image_path: string;
  target_image_path: string;
  result_image_path: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  finished_at: string | null;
  output_prefix: string;
}

// Convert backend process record to frontend ProcessedImage
const mapToProcessedImage = (record: ProcessRecord, index: number): ProcessedImage => ({
  id: record.id.toString(),
  sourceImage: `${API_BASE_URL}/${record.source_image_path}`,
  targetImage: `${API_BASE_URL}/${record.target_image_path}`,
  resultImage: record.result_image_path ? `${API_BASE_URL}/${record.result_image_path}` : undefined,
  index,
  status: record.status,
  processStarted: new Date(record.created_at).toISOString(),
  processEnded: record.finished_at ? new Date(record.finished_at).toISOString() : undefined,
  createdAt: new Date(record.created_at).toISOString(),
});

// Get user data from localStorage or return defaults
const getUserData = (): User => {
  const defaultUser: User = {
    id: 'user-001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    credits: 150,
    subscription: 'premium',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    joinedDate: '2023-01-15T00:00:00Z',
  };
  
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : defaultUser;
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return defaultUser;
  }
};

// Generate sample usage data for the chart
const generateUsageData = (): UsageData[] => {
  const data: UsageData[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 10,
    });
  }
  
  return data;
};

// Credit packages
const creditPackages: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 100, price: 9.99 },
  { id: 'pro', name: 'Pro', credits: 500, price: 39.99 },
  { id: 'business', name: 'Business', credits: 1000, price: 69.99 },
  { id: 'unlimited', name: 'Unlimited', credits: 5000, price: 199.99 },
];

export const api = {
  // Upload images and start face swap process
  async upload(data: UploadRequest): Promise<ApiResponse<ProcessedImage>> {
    const formData = new FormData();
    formData.append('source_image', data.sourceImage);
    formData.append('target_image', data.targetImage);
    
    // Create a JSON string for the form data
    const formDataJson = JSON.stringify({
      target_index: data.index || 0,
      source_index: 0,  // Default to 0 for now
      output_prefix: `result_${Date.now()}`
    });
    formData.append('form_data', formDataJson);
    try {
      const response = await fetch(`${API_BASE_URL}/swap-faces`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const processedImage = mapToProcessedImage(result, 0);
      
      // Save to localStorage
      saveToLocalStorage(processedImage);
      
      return {
        data: processedImage,
        message: 'Face swap completed successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error uploading images:', error);
      return {
        data: {} as ProcessedImage,
        message: error instanceof Error ? error.message : 'Failed to process images',
        success: false,
      };
    }
  },

  // Get list of processed images with pagination and filtering
  async getProcessedImages(
    filters: FilterOptions
  ): Promise<ApiResponse<{ images: ProcessedImage[]; total: number; totalPages: number }>> {
    try {
      const { page = 1, limit = 10, status } = filters;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });

      const response = await fetch(`${API_BASE_URL}/processes?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const { items, total } = data;
      const images = items.map((item: ProcessRecord, index: number) => 
        mapToProcessedImage(item, index)
      );
      
      return {
        data: {
          images,
          total,
          totalPages: Math.ceil(total / limit),
        },
        message: 'Processed images retrieved successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error fetching processed images:', error);
      return {
        data: { images: [], total: 0, totalPages: 0 },
        message: error instanceof Error ? error.message : 'Failed to fetch processed images',
        success: false,
      };
    }
  },

  // Get details of a single processed image
  async getProcessedImage(id: string): Promise<ApiResponse<ProcessedImage>> {
    try {
      const response = await fetch(`${API_BASE_URL}/processes/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processedImage = mapToProcessedImage(data, 0);
      
      return {
        data: processedImage,
        message: 'Process details retrieved successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error fetching process details:', error);
      return {
        data: {} as ProcessedImage,
        message: error instanceof Error ? error.message : 'Failed to fetch process details',
        success: false,
      };
    }
  },

  // User management
  async getUser(): Promise<ApiResponse<User>> {
    try {
      const user = getUserData();
      return {
        data: user,
        message: 'User fetched successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        data: getUserData(),
        message: error instanceof Error ? error.message : 'Failed to fetch user',
        success: false,
      };
    }
  },

  async updateUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const currentUser = getUserData();
      const updatedUser = { ...currentUser, ...userData };
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return {
        data: updatedUser,
        message: 'User updated successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        data: getUserData(),
        message: error instanceof Error ? error.message : 'Failed to update user',
        success: false,
      };
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }
      
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }
      
      // In a real app, this would validate the current password and update it on the server
      return {
        data: { success: true },
        message: 'Password changed successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        data: { success: false },
        message: error instanceof Error ? error.message : 'Failed to change password',
        success: false,
      };
    }
  },

  // Usage data
  async getUsageData(startDate: string, endDate: string): Promise<ApiResponse<UsageData[]>> {
    try {
      // In a real app, this would fetch from the server with date range
      const allUsageData = generateUsageData();
      const filteredData = allUsageData.filter(item => 
        item.date >= startDate && item.date <= endDate
      );
      
      return {
        data: filteredData,
        message: 'Usage data retrieved successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error fetching usage data:', error);
      return {
        data: [],
        message: error instanceof Error ? error.message : 'Failed to fetch usage data',
        success: false,
      };
    }
  },

  // Credits
  async getCreditsInfo(): Promise<ApiResponse<{ remaining: number; todayUsed: number }>> {
    try {
      // In a real app, this would fetch from the server
      const storedCredits = localStorage.getItem('creditsInfo');
      const defaultCredits = { remaining: 150, todayUsed: 0 };
      
      return {
        data: storedCredits ? JSON.parse(storedCredits) : defaultCredits,
        message: 'Credits info retrieved successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error fetching credits info:', error);
      return {
        data: { remaining: 0, todayUsed: 0 },
        message: error instanceof Error ? error.message : 'Failed to fetch credits info',
        success: false,
      };
    }
  },

  async getCreditPackages(): Promise<ApiResponse<CreditPackage[]>> {
    try {
      // In a real app, this would fetch from the server
      return {
        data: creditPackages,
        message: 'Credit packages retrieved successfully',
        success: true,
      };
    } catch (error) {
      console.error('Error fetching credit packages:', error);
      return {
        data: [],
        message: error instanceof Error ? error.message : 'Failed to fetch credit packages',
        success: false,
      };
    }
  },

  async purchaseCredits(packageId: string): Promise<ApiResponse<{ success: boolean; credits: number }>> {
    try {
      // In a real app, this would process a payment and update the user's credits
      const selectedPackage = creditPackages.find(pkg => pkg.id === packageId);
      
      if (!selectedPackage) {
        throw new Error('Invalid package selected');
      }
      
      // Update credits in localStorage
      const currentCredits = (await this.getCreditsInfo()).data.remaining || 0;
      const updatedInfo = {
        remaining: currentCredits + selectedPackage.credits,
        todayUsed: 0,
      };
      
      localStorage.setItem('creditsInfo', JSON.stringify(updatedInfo));
      
      return {
        data: { success: true, credits: selectedPackage.credits },
        message: `Successfully purchased ${selectedPackage.credits} credits`,
        success: true,
      };
    } catch (error) {
      console.error('Error purchasing credits:', error);
      return {
        data: { success: false, credits: 0 },
        message: error instanceof Error ? error.message : 'Failed to purchase credits',
        success: false,
      };
    }
  },
};

// Helper function to save processed image to localStorage
export const saveToLocalStorage = (image: ProcessedImage): void => {
  try {
    const stored = JSON.parse(localStorage.getItem('processedImages') || '[]');
    stored.push(image);
    localStorage.setItem('processedImages', JSON.stringify(stored));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};
