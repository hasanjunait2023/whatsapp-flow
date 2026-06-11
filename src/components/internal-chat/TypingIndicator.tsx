import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  users: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].full_name || 'Someone'} is typing`;
    } else if (users.length === 2) {
      return `${users[0].full_name || 'Someone'} and ${users[1].full_name || 'someone'} are typing`;
    } else {
      return `${users.length} people are typing`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex -space-x-1">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.id} className="h-5 w-5 border border-background">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-[8px]">
              {user.full_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span>{getTypingText()}</span>
      <div className="flex gap-0.5">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </div>
    </div>
  );
}
