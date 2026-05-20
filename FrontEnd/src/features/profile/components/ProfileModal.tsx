import * as React from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, AlertTriangle, ShieldAlert, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';

const profileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must not exceed 50 characters'),
  avatar: z.string().url('Please enter a valid image URL').optional().or(z.literal('')),
});

type ProfileInput = z.infer<typeof profileSchema>;

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateUser, deleteUser, isLoading, error, clearError } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      avatar: user?.avatar || '',
    },
  });

  // Reset form values when user changes or modal opens
  React.useEffect(() => {
    if (isOpen && user) {
      reset({
        name: user.name,
        avatar: user.avatar || '',
      });
      clearError();
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  }, [isOpen, user, reset, clearError]);

  const onSubmit = async (data: ProfileInput) => {
    try {
      await updateUser({
        name: data.name,
        avatar: data.avatar || undefined,
      });
      onClose();
    } catch (err) {
      // Errors are handled in the store
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete my account') return;
    try {
      await deleteUser();
      onClose();
    } catch (err) {
      // Handled in store
    }
  };

  // Guard: Avoid rendering when modal is closed
  if (!isOpen) return null;

  // Render modal inside document.body React Portal to solve z-index nesting conflicts permanently
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal content container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl z-10 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                <UserIcon className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Profile Settings</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-6">
            {error && (
              <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm">
                <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {!showDeleteConfirm ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Read-only Email Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <Input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed text-sm focus:ring-0 focus:border-slate-200"
                  />
                  <span className="text-[11px] text-slate-400 pl-1">Verified email address cannot be changed.</span>
                </div>

                {/* Name Input Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="name">Full Name</label>
                  <Input
                    type="text"
                    id="name"
                    placeholder="Jane Doe"
                    className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all text-sm bg-white text-slate-900 placeholder:text-slate-400"
                    {...register('name')}
                  />
                  {errors.name && (
                    <span className="text-xs font-semibold text-red-500 mt-1 pl-1">{errors.name.message}</span>
                  )}
                </div>

                {/* Avatar URL Input Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="avatar">Avatar Image URL</label>
                  <Input
                    type="text"
                    id="avatar"
                    placeholder="https://example.com/avatar.png"
                    className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all text-sm bg-white text-slate-900 placeholder:text-slate-400"
                    {...register('avatar')}
                  />
                  {errors.avatar && (
                    <span className="text-xs font-semibold text-red-500 mt-1 pl-1">{errors.avatar.message}</span>
                  )}
                </div>

                {/* Divider Line */}
                <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-red-50/50 border border-red-100 p-4 rounded-xl">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-sm font-bold text-red-700">Danger Zone</span>
                      <span className="text-[11px] text-slate-500">Permanently delete your profile and task data.</span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-4 py-2 h-9 rounded-xl border border-red-200 hover:border-red-300 transition-all cursor-pointer shadow-sm"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
                  <Button
                    type="button"
                    onClick={onClose}
                    className="bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-900 h-10 px-5 rounded-xl text-xs font-semibold border border-slate-100 transition-all cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl text-xs font-semibold shadow-lg shadow-slate-900/10 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                {/* Warning Alert Container */}
                <div className="flex items-start gap-4 bg-red-50 border border-red-100 p-4 rounded-xl text-left">
                  <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-700">Permanently Delete Account?</h4>
                    <p className="text-xs leading-relaxed text-slate-600">
                      This action cannot be undone. All your lists, active tasks, streaks, and labels will be deleted permanently.
                    </p>
                  </div>
                </div>

                {/* Confirm Text Input */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-slate-600 text-left">
                    Type <span className="text-red-600 font-bold select-all">"delete my account"</span> to confirm deletion
                  </p>
                  <Input
                    type="text"
                    placeholder="delete my account"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-200 focus:border-red-600 focus:ring-4 focus:ring-red-600/5 transition-all text-sm bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* Delete View Footer Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
                  <Button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-900 h-10 px-5 rounded-xl text-xs font-semibold border border-slate-100 transition-all cursor-pointer"
                  >
                    Go Back
                  </Button>
                  <Button
                    type="button"
                    disabled={isLoading || deleteConfirmText.toLowerCase() !== 'delete my account'}
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-500 text-white h-10 px-5 rounded-xl text-xs font-semibold shadow-lg shadow-red-600/10 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Confirm Delete</span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
