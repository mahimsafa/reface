import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Camera, Save, Loader } from 'lucide-react';
import { api } from '../lib/api';

const profileSchema = z.object({
  // avatar: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Invalid email address'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length === 0 || val.trim().length >= 10, {
      message: 'Phone number must be at least 10 characters',
    }),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const Profile: React.FC = () => {
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: api.getUser,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      // avatar: userData?.avatar,
      // @ts-expect-error ignore
      name: userData?.name,
      // @ts-expect-error ignore
      email: userData?.email,
      // @ts-expect-error ignore
      phone: userData?.phone,
    },
  });

  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    formState: { errors: pwdErrors },
    reset: resetPwd,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: api.updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      resetPwd();
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    const updateData: { name: string; phone?: string; avatar?: string } = {
      name: data.name,
    };
    if (data.phone && data.phone.trim().length > 0) {
      updateData.phone = data.phone.trim();
    }
    if (avatarPreview) {
      updateData.avatar = avatarPreview;
    }
    updateMutation.mutate(updateData);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const user = userData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Profile Settings</h1>
          <p className="text-lg text-gray-600">Manage your account information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-lg p-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                {/* @ts-expect-error ignore */}
                {avatarPreview || userData?.avatar ? (
                  <img
                    // @ts-expect-error ignore
                    src={avatarPreview || userData?.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <label
                htmlFor="avatar"
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <Camera className="w-8 h-8 text-white" />
              </label>
              <input
                type="file"
                id="avatar"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Click to change avatar</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed focus:ring-0 focus:border-gray-300"
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your phone number (optional)"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Success Message */}
          {updateMutation.isSuccess && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 text-center">Profile updated successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {updateMutation.error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-center">Failed to update profile. Please try again.</p>
            </div>
          )}

        </form>

        {/* Change Password Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Change Password</h2>
          <form onSubmit={handleSubmitPwd(onPasswordSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                {...registerPwd('currentPassword')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter current password"
              />
              {pwdErrors.currentPassword && (
                <p className="text-red-500 text-sm mt-1">{pwdErrors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                {...registerPwd('newPassword')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter new password"
              />
              {pwdErrors.newPassword && (
                <p className="text-red-500 text-sm mt-1">{pwdErrors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                {...registerPwd('confirmPassword')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Re-enter new password"
              />
              {pwdErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{pwdErrors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Update Password
                  </>
                )}
              </button>
            </div>

            {changePasswordMutation.isSuccess && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-green-700 text-center">Password updated successfully!</p>
              </div>
            )}

            {changePasswordMutation.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-center">Failed to update password. Please try again.</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;