import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewChatItemProps {
  phoneNumber: string;
  onClick: () => void;
}

export default function NewChatItem({ phoneNumber, onClick }: NewChatItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
        'bg-brand/5 hover:bg-brand/10 border border-brand/20',
        'focus:outline-none focus:ring-2 focus:ring-brand/50'
      )}
    >
      <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
        <MessageSquarePlus className="h-6 w-6 text-brand" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-brand">
          নতুন চ্যাট শুরু করুন
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {phoneNumber} নম্বরে মেসেজ পাঠান
        </p>
      </div>
    </button>
  );
}
