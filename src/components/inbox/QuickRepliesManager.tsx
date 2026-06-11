import { useState } from 'react';
import { useQuickReplies, QuickReply, QuickReplyInput, QuickReplyContentType, MediaItem } from '@/hooks/useQuickReplies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Zap, Search, Image, Video, Music, FileText, Layers } from 'lucide-react';
import { toast } from 'sonner';
import QuickReplyMediaUploader from './QuickReplyMediaUploader';

const getContentTypeIcon = (type: QuickReplyContentType) => {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    case 'mixed':
      return <Layers className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

interface FormData {
  title: string;
  content: string;
  shortcut: string;
  media_items: MediaItem[];
}

export default function QuickRepliesManager() {
  const { quickReplies, loading, createQuickReply, updateQuickReply, deleteQuickReply } = useQuickReplies();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    shortcut: '',
    media_items: [],
  });
  const [saving, setSaving] = useState(false);

  const filteredReplies = quickReplies.filter(
    (qr) =>
      qr.title.toLowerCase().includes(search.toLowerCase()) ||
      qr.content.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ 
      title: '', 
      content: '', 
      shortcut: '',
      media_items: [],
    });
    setEditingReply(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormData({
      title: reply.title,
      content: reply.content,
      shortcut: reply.shortcut || '',
      media_items: reply.media_items || [],
    });
    setDialogOpen(true);
  };

  const handleMediaItemsChange = (items: MediaItem[]) => {
    setFormData((prev) => ({ ...prev, media_items: items }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    // Validate: need either content or media
    const hasText = formData.content.trim().length > 0;
    const hasMedia = formData.media_items.length > 0;

    if (!hasText && !hasMedia) {
      toast.error('Either text content or media is required');
      return;
    }

    // Determine content_type
    let content_type: QuickReplyContentType = 'text';
    if (hasMedia && hasText) {
      content_type = 'mixed';
    } else if (hasMedia) {
      // Determine from media types
      const types = new Set(formData.media_items.map(m => m.type));
      if (types.size === 1) {
        content_type = formData.media_items[0].type;
      } else {
        content_type = 'mixed';
      }
    }

    setSaving(true);
    try {
      const payload: QuickReplyInput = {
        title: formData.title,
        content: formData.content,
        shortcut: formData.shortcut || undefined,
        content_type,
        media_items: formData.media_items,
        // Keep legacy fields for backward compatibility
        media_url: formData.media_items[0]?.url,
        media_filename: formData.media_items[0]?.filename,
      };

      if (editingReply) {
        await updateQuickReply(editingReply.id, payload);
        toast.success('Quick reply updated');
      } else {
        await createQuickReply(payload);
        toast.success('Quick reply created');
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(editingReply ? 'Failed to update' : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteQuickReply(deletingId);
      toast.success('Quick reply deleted');
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getMediaCountLabel = (reply: QuickReply) => {
    const items = reply.media_items || [];
    if (items.length === 0) return null;
    
    const counts = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts: string[] = [];
    if (counts.image) parts.push(`${counts.image} image${counts.image > 1 ? 's' : ''}`);
    if (counts.video) parts.push(`${counts.video} video${counts.video > 1 ? 's' : ''}`);
    if (counts.audio) parts.push(`${counts.audio} audio`);
    
    return parts.join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Replies
            </CardTitle>
            <CardDescription>
              Pre-saved message templates with text, images, audio, or video
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Reply
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>
                  {editingReply ? 'Edit Quick Reply' : 'Create Quick Reply'}
                </DialogTitle>
                <DialogDescription>
                  {editingReply
                    ? 'Update your quick reply template.'
                    : 'Create a message template with text and/or multiple media files.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Welcome Message"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Shortcut */}
                <div className="space-y-2">
                  <Label htmlFor="shortcut">Shortcut (optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
                    <Input
                      id="shortcut"
                      placeholder="e.g., welcome"
                      value={formData.shortcut}
                      onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Type /{formData.shortcut || 'shortcut'} in chat to quickly access this reply
                  </p>
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Text Content (optional if media is added)</Label>
                  <Textarea
                    id="content"
                    placeholder="Type your message template here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Media Uploader */}
                <QuickReplyMediaUploader
                  mediaItems={formData.media_items}
                  onMediaItemsChange={handleMediaItemsChange}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Saving...' : editingReply ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        {quickReplies.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quick replies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {quickReplies.length === 0
                ? 'No quick replies yet. Create your first one!'
                : 'No matching quick replies.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReplies.map((reply) => (
              <div
                key={reply.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                {/* Media preview thumbnails */}
                {reply.media_items && reply.media_items.length > 0 && (
                  <div className="shrink-0 flex -space-x-2">
                    {reply.media_items.slice(0, 3).map((item, idx) => (
                      <div 
                        key={idx} 
                        className="w-10 h-10 rounded-md overflow-hidden bg-muted border-2 border-background flex items-center justify-center"
                      >
                        {item.type === 'image' ? (
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        ) : item.type === 'video' ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Music className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                    {reply.media_items.length > 3 && (
                      <div className="w-10 h-10 rounded-md bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                        +{reply.media_items.length - 3}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getContentTypeIcon(reply.content_type)}
                    <span className="font-medium">{reply.title}</span>
                    {reply.shortcut && (
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        /{reply.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {reply.content || getMediaCountLabel(reply) || '[Empty]'}
                  </p>
                  {reply.content && reply.media_items && reply.media_items.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      + {getMediaCountLabel(reply)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(reply)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeletingId(reply.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quick Reply</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this quick reply? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
