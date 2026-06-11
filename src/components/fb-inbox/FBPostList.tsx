import { useState, useMemo } from 'react';
import { Search, Filter, Loader2, FileQuestion } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FBPostItem } from './FBPostItem';
import type { FBPost } from '@/hooks/useFBPosts';

interface FBPostListProps {
  posts: FBPost[];
  loading: boolean;
  selectedPostId: string | null;
  onSelectPost: (post: FBPost) => void;
}

type FilterType = 'all' | 'unread' | 'with_comments';

export function FBPostList({ posts, loading, selectedPostId, onSelectPost }: FBPostListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredPosts = useMemo(() => {
    let result = posts;

    // Apply filter
    if (filter === 'unread') {
      result = result.filter(p => p.unread_comment_count > 0);
    } else if (filter === 'with_comments') {
      result = result.filter(p => p.comment_count > 0);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.message?.toLowerCase().includes(query) ||
        p.latest_comment?.commenter_name?.toLowerCase().includes(query) ||
        p.latest_comment?.message?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [posts, filter, searchQuery]);

  const filterLabels: Record<FilterType, string> = {
    all: 'All Posts',
    unread: 'Unread',
    with_comments: 'Has Comments',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-sm">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                {filterLabels[filter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Posts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('unread')}>
                Unread Comments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('with_comments')}>
                Has Comments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-xs text-muted-foreground">
            {filteredPosts.length} posts
          </span>
        </div>
      </div>

      {/* Posts List */}
      <ScrollArea className="flex-1">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4">
            <FileQuestion className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm text-center">
              {searchQuery || filter !== 'all' 
                ? 'No posts match your filters' 
                : 'No posts with comments yet'}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <FBPostItem
              key={post.id}
              post={post}
              isSelected={post.id === selectedPostId}
              onClick={() => onSelectPost(post)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
