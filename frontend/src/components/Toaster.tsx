import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastClose,
  ToastTitle,
  ToastDescription,
} from './ui/toast';
import { useToast } from '@/hooks/useToast';

export function Toaster() {
  const { toasts, dismissToast } = useToast();

  return (
    <ToastProvider duration={3000}>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          onOpenChange={(open) => {
            if (!open) dismissToast(t.id);
          }}
        >
          <div className="flex flex-col gap-0.5">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
