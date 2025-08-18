import {
  ProcessedImage,
  UploadRequest,
  ApiResponse,
  User,
  UsageData,
  CreditPackage,
  FilterOptions,
} from "../types";
import { config } from "./config";
import { api as fetcher } from "../api/fetcher";

// Define the backend process record type
interface ProcessRecord {
  id: number;
  sourceImage: string;
  targetImage: string;
  sourceIndex?: number;
  targetIndex?: number;
  resultImage: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  processStartedAt: string | null;
  processEndedAt: string | null;
  outputPrefix: string;
}

// Convert backend process record to frontend ProcessedImage
const mapToProcessedImage = (record: ProcessRecord): ProcessedImage => ({
  id: record.id.toString(),
  sourceImage: `${config.apiUrl}/${record.sourceImage}`,
  targetImage: `${config.apiUrl}/${record.targetImage}`,
  resultImage: record.resultImage
    ? `${config.apiUrl}/${record.resultImage}`
    : undefined,
  sourceIndex: record.sourceIndex,
  targetIndex: record.targetIndex,
  status: record.status,
  processStarted: record.processStartedAt
    ? new Date(record.processStartedAt).toISOString()
    : undefined,
  processEnded: record.processEndedAt
    ? new Date(record.processEndedAt).toISOString()
    : undefined,
  createdAt: new Date(record.createdAt).toISOString(),
  updatedAt: new Date(record.updatedAt).toISOString(),
});

// Get user data from localStorage or return defaults
const getUserData = (): User => {
  const defaultUser: User = {
    id: "user-001",
    name: "John Doe",
    email: "john.doe@example.com",
    // @ts-expect-error ignore
    credits: 150,
    subscription: "premium",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    joinedDate: "2023-01-15T00:00:00Z",
  };

  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : defaultUser;
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
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
      date: date.toISOString().split("T")[0],
      // @ts-expect-error ignore
      count: Math.floor(Math.random() * 50) + 10,
    });
  }

  return data;
};

// Credit packages
const creditPackages: CreditPackage[] = [
  { id: "starter", name: "Starter", credits: 100, price: 9.99 },
  { id: "pro", name: "Pro", credits: 500, price: 39.99 },
  { id: "business", name: "Business", credits: 1000, price: 69.99 },
  { id: "unlimited", name: "Unlimited", credits: 5000, price: 199.99 },
];

export const api = {
  // Upload images and start face swap process
  async uploadOld(data: UploadRequest): Promise<ApiResponse<ProcessedImage>> {
    const formData = new FormData();
    formData.append('source_image', data.sourceImage);
    formData.append('target_image', data.targetImage);
    
    // Add indices and output prefix if provided
    if (data.sourceIndex !== undefined) {
      formData.append('source_index', data.sourceIndex.toString());
    }
    if (data.targetIndex !== undefined) {
      formData.append('target_index', data.targetIndex.toString());
    }
    if (data.outputPrefix) {
      formData.append('output_prefix', data.outputPrefix);
    }
    
    try {
      const response = await fetch(`${config.apiUrl}/api/image-processes`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with the correct boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const processRecord = result.data;
      
      // Send the process to the queue
      try {
        const queueResponse = await fetch(`${config.apiUrl}/api/queue/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: processRecord.id,
            sourceImage: processRecord.sourceImage,
            targetImage: processRecord.targetImage,
            resultImage: processRecord.resultImage,
            sourceIndex: processRecord.sourceIndex,
            targetIndex: processRecord.targetIndex,
            status: processRecord.status,
            outputPrefix: processRecord.outputPrefix || 'result',
            createdAt: processRecord.createdAt,
            updatedAt: processRecord.updatedAt,
            processStartedAt: processRecord.processStartedAt,
            processEndedAt: processRecord.processEndedAt
          })
        });

        if (!queueResponse.ok) {
          console.error('Failed to add process to queue');
        }
      } catch (error) {
        console.error('Error adding process to queue:', error);
      }

      const processedImage = mapToProcessedImage(processRecord, 0);
      
      // Save to localStorage
      saveToLocalStorage(processedImage);
      
      return {
        data: processedImage,
        message: 'Image process created and queued successfully',
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
  async upload(data: UploadRequest): Promise<ApiResponse<ProcessedImage>> {
    const formData = new FormData();
    formData.append("source_image", data.sourceImage);
    formData.append("target_image", data.targetImage);

    // Add indices and output prefix if provided
    if (data.sourceIndex !== undefined) {
      formData.append("source_index", data.sourceIndex.toString());
    }
    if (data.targetIndex !== undefined) {
      formData.append("target_index", data.targetIndex.toString());
    }
    if (data.outputPrefix) {
      formData.append("output_prefix", data.outputPrefix);
    }

    try {
      // First upload the images and create the process
      const result = await fetcher.postRaw(
        `${config.apiUrl}/api/image-processes`,
        formData
      );
      const processRecord = result.data;

      // Then send the process to the queue
      try {
        await fetcher.post(`${config.apiUrl}/api/queue/process`, {
          id: processRecord.id,
          sourceImage: processRecord.sourceImage,
          targetImage: processRecord.targetImage,
          resultImage: processRecord.resultImage,
          sourceIndex: processRecord.sourceIndex,
          targetIndex: processRecord.targetIndex,
          status: processRecord.status,
          outputPrefix: processRecord.outputPrefix || "result",
          createdAt: processRecord.createdAt,
          updatedAt: processRecord.updatedAt,
          processStartedAt: processRecord.processStartedAt,
          processEndedAt: processRecord.processEndedAt,
        },
      );
      } catch (error) {
        console.error("Failed to add process to queue:", error);
      }

      const processedImage = mapToProcessedImage(processRecord);

      // Save to localStorage
      saveToLocalStorage(processedImage);

      return {
        data: processedImage,
        message: "Image process created and queued successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error uploading images:", error);
      return {
        data: {} as ProcessedImage,
        message:
          error instanceof Error ? error.message : "Failed to process images",
        success: false,
      };
    }
  },

  // Get list of processed images with pagination and filtering
  async getProcessedImages(
    filters: FilterOptions
  ): Promise<
    ApiResponse<{ images: ProcessedImage[]; total: number; totalPages: number }>
  > {
    const queryParams = new URLSearchParams();

    if (filters.status) queryParams.append("status", filters.status);
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
    if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);
    queryParams.append("page", filters.page?.toString() || "1");
    queryParams.append("limit", filters.limit?.toString() || "10");

    const responseData = await fetcher.get(
      `${config.apiUrl}/api/image-processes?${queryParams}`
    );

    const { data, pagination } = responseData;

    const images = data.map((item: ProcessRecord) => mapToProcessedImage(item));

    return {
      data: {
        images,
        total: pagination.totalItems,
        totalPages: pagination.totalPages,
      },
      message: "Processed images retrieved successfully",
      success: true,
    };

    // // Map the backend data to our frontend types
    // return {
    //   ...data,
    //   data: {
    //     ...data.data,
    //     images: data.data.images.map((record: ProcessRecord) => mapToProcessedImage(record))
    //   }
    // };
  },

  // Get details of a single processed image
  async getProcessedImage(id: string): Promise<ApiResponse<ProcessedImage>> {
    const data = await fetcher.get(
      `${config.apiUrl}/api/image-processes/${id}`
    );

    const processedImage = mapToProcessedImage(data);

    return {
      data: processedImage,
      message: "Process details retrieved successfully",
      success: true,
    };
  },

  // User management
  async getUser(): Promise<ApiResponse<User>> {
    try {
      return await fetcher.get(`${config.apiUrl}/api/users/me`);
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Return local user data as fallback
      return { success: true, data: getUserData(), message: "failed to fetch user data" };
    }
  },

  async updateUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const currentUser = getUserData();
      const updatedUser = { ...currentUser, ...userData };

      // Save to localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return {
        data: updatedUser,
        message: "User updated successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error updating user:", error);
      return {
        data: getUserData(),
        message:
          error instanceof Error ? error.message : "Failed to update user",
        success: false,
      };
    }
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      if (!currentPassword || !newPassword) {
        throw new Error("Current password and new password are required");
      }

      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters long");
      }

      // In a real app, this would validate the current password and update it on the server
      return {
        data: { success: true },
        message: "Password changed successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error changing password:", error);
      return {
        data: { success: false },
        message:
          error instanceof Error ? error.message : "Failed to change password",
        success: false,
      };
    }
  },

  // Usage data
  async getUsageData(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<UsageData[]>> {
    try {
      return await fetcher.get(
        `${config.apiUrl}/api/usage?startDate=${encodeURIComponent(
          startDate
        )}&endDate=${encodeURIComponent(endDate)}`
      );
    } catch (error) {
      console.error("Error fetching usage data:", error);
      // Fallback to generated data if API fails
      return {
        success: true,
        data: generateUsageData(),
      };
    }
  },

  // Credits
  async getCreditsInfo(): Promise<
    ApiResponse<{ remaining: number; todayUsed: number }>
  > {
    try {
      return await fetcher.get(`${config.apiUrl}/api/credits`);
    } catch (error) {
      console.error("Error fetching credits info:", error);
      // Return mock data if API fails
      return {
        success: true,
        data: {
          remaining: 75,
          todayUsed: 5,
        },
      };
    }
  },

  async getCreditPackages(): Promise<ApiResponse<CreditPackage[]>> {
    try {
      return await fetcher.get(`${config.apiUrl}/api/credits/packages`);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      // Return mock data if API fails
      return {
        success: true,
        data: creditPackages,
      };
    }
  },

  async purchaseCredits(
    packageId: string
  ): Promise<ApiResponse<{ success: boolean; credits: number }>> {
    try {
      return await fetcher.post(`${config.apiUrl}/api/credits/purchase`, {
        packageId,
      });
    } catch (error) {
      console.error("Error purchasing credits:", error);
      // Fallback to mock data if API fails
      const selectedPackage = creditPackages.find(
        (pkg) => pkg.id === packageId
      );

      if (!selectedPackage) {
        return {
          data: { success: false, credits: 0 },
          message: "Invalid package ID",
          success: false,
        };
      }

      return {
        data: {
          success: true,
          credits: selectedPackage.credits,
        },
        message: "Credits purchased successfully (mock data)",
        success: true,
      };
    }
  },
};

// Helper function to save processed image to localStorage
export const saveToLocalStorage = (image: ProcessedImage): void => {
  try {
    const stored = JSON.parse(localStorage.getItem("processedImages") || "[]");
    stored.push(image);
    localStorage.setItem("processedImages", JSON.stringify(stored));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};
