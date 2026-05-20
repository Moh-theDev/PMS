import * as React from 'react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center border border-blue-500/10">
                  <UserIcon className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Profile Settings</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content / Form */}
            <div className="p-6">
              {error && (
                <div className="mb-6 flex items-center gap-3 bg-red-950/30 border border-red-900/40 p-4 rounded-xl text-red-400 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!showDeleteConfirm ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Read-only Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <Input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-800 bg-slate-950/50 text-slate-500 cursor-not-allowed text-sm"
                    />
                    <span className="text-[10px] text-slate-500">Email addresses are verified and cannot be changed.</span>
                  </div>

                  {/* Username Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="name">Full Name</label>
                    <Input
                      type="text"
                      id="name"
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-800 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-slate-950/30 text-white"
                      {...register('name')}
                    />
                    {errors.name && (
                      <span className="text-xs font-bold text-red-500 mt-1 pl-1">{errors.name.message}</span>
                    )}
                  </div>

                  {/* Avatar URL Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="avatar">Avatar Image URL</label>
                    <Input
                      type="text"
                      id="avatar"
                      placeholder="https://example.com/avatar.png"
                      className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-800 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-slate-950/30 text-white"
                      {...register('avatar')}
                    />
                    {errors.avatar && (
                      <span className="text-xs font-bold text-red-500 mt-1 pl-1">{errors.avatar.message}</span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-800 pt-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-red-950/10 border border-red-950/30 p-4 rounded-2xl">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-red-400">Danger Zone</span>
                        <span className="text-[11px] text-slate-500">Permanently delete your personal profile data.</span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-red-900/20 hover:bg-red-900/30 text-red-400 text-xs font-bold px-4 py-2 h-9 rounded-xl border border-red-900/30 cursor-pointer"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5 mt-6">
                    <Button
                      type="button"
                      onClick={onClose}
                      className="bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white h-10 px-5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start gap-4 bg-red-950/20 border border-red-900/30 p-5 rounded-2xl">
                    <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-left">
                      <h4 className="text-base font-bold text-red-400">Permanently Delete Account?</h4>
                      <p className="text-xs leading-relaxed text-slate-400">
                        This action cannot be undone. All your tasks, lists, logs, and labels will be deleted permanently.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Type <span className="text-red-400 font-bold select-all lowercase">"delete my account"</span> to confirm
                    </p>
                    <Input
                      type="text"
                      placeholder="delete my account"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-4 py-2.5 h-11 rounded-xl border-slate-800 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm bg-slate-950/30 text-white"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5 mt-6">
                    <Button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white h-10 px-5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Go Back
                    </Button>
                    <Button
                      type="button"
                      disabled={isLoading || deleteConfirmText.toLowerCase() !== 'delete my account'}
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-500 text-white h-10 px-5 rounded-xl text-xs font-bold shadow-lg shadow-red-600/10 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Deleting Account...</span>
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
      )}
    </AnimatePresence>
  );
}
