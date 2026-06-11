import { useState } from 'react';
import { FBContact } from '@/hooks/useFBContacts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Facebook,
  Calendar,
  Plus,
  Clock,
  ShoppingBag,
  MessageSquare,
  CreditCard,
  Loader2,
  MessageCirclePlus,
  RefreshCw,
  Pencil,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Format PSID as readable name when actual name is unavailable
const formatPsidAsName = (psid: string) => {
  if (psid.length > 8) {
    return `FB-${psid.slice(0, 4)}...${psid.slice(-4)}`;
  }
  return `FB-${psid}`;
};

interface FBContactInfoPanelProps {
  contact: FBContact;
  onViewOrder?: (orderId: string) => void;
}

export default function FBContactInfoPanel({ 
  contact, 
  onViewOrder 
}: FBContactInfoPanelProps) {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [currentName, setCurrentName] = useState(contact.name);
  const queryClient = useQueryClient();

  const displayName = currentName || formatPsidAsName(contact.psid);
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSaveName = async () => {
    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('fb_contacts')
        .update({ name: editedName.trim() || null })
        .eq('id', contact.id);
      
      if (error) throw error;
      
      setCurrentName(editedName.trim() || null);
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ['fb-contacts'] });
      toast.success('Name updated');
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const startEditingName = () => {
    setEditedName(currentName || '');
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleRefreshProfile = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fb-refresh-profile', {
        body: { contact_id: contact.id }
      });

      if (error) throw error;

      if (data.success && data.name) {
        toast.success(`Profile updated: ${data.name}`);
        queryClient.invalidateQueries({ queryKey: ['fb-contacts'] });
      } else {
        toast.info('Profile unavailable - Facebook privacy settings may prevent access. You can edit the name manually in the chat header.');
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      toast.error('Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim()) return;
    
    setIsAddingNote(true);
    // TODO: Implement note adding for FB contacts when customer journey is integrated
    setTimeout(() => {
      setIsAddingNote(false);
      setNoteTitle('');
      setNoteDescription('');
    }, 500);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={contact.profile_pic_url || ''} />
              <AvatarFallback className="bg-blue-500/10 text-blue-600 text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
                  onClick={handleRefreshProfile}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh profile from Facebook</TooltipContent>
            </Tooltip>
          </div>
          
          {/* Editable Name */}
          {isEditingName ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-8 w-36 text-sm text-center"
                placeholder="Enter name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') cancelEditingName();
                }}
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={handleSaveName}
                disabled={isSavingName}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={cancelEditingName}
                disabled={isSavingName}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 justify-center">
              <h3 className="text-base font-semibold text-foreground">{displayName}</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={startEditingName}
                title="Edit name"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Facebook className="h-3.5 w-3.5" />
            {contact.psid}
          </p>
          
          {/* Status Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
            {contact.needs_handoff && (
              <Badge variant="destructive" className="text-xs">Needs Handoff</Badge>
            )}
            {contact.is_blocked && (
              <Badge variant="secondary" className="text-xs">Blocked</Badge>
            )}
            {contact.is_archived && (
              <Badge variant="outline" className="text-xs">Archived</Badge>
            )}
          </div>
        </div>

        {/* Quick Stats - Placeholder */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <ShoppingBag className="h-4 w-4 mx-auto text-primary mb-0.5" />
            <p className="text-base font-semibold">0</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </div>
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <CreditCard className="h-4 w-4 mx-auto text-green-500 mb-0.5" />
            <p className="text-base font-semibold">$0</p>
            <p className="text-[10px] text-muted-foreground">Spent</p>
          </div>
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <MessageSquare className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
            <p className="text-base font-semibold">{contact.unread_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">Messages</p>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Facebook className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-muted-foreground">PSID: </span>
            <span className="text-foreground font-mono text-xs">{contact.psid}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Since </span>
            <span className="text-foreground">
              {format(new Date(contact.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          {contact.last_message_at && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Active </span>
              <span className="text-foreground">
                {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })}
              </span>
            </div>
          )}
          {contact.locale && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Locale: </span>
              <span className="text-foreground">{contact.locale}</span>
            </div>
          )}
        </div>

        {/* View in Business Suite Button */}
        {contact.facebook_pages?.page_id && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const businessSuiteUrl = `https://business.facebook.com/latest/inbox/all?asset_id=${contact.facebook_pages?.page_id}&thread_id=${contact.psid}`;
              window.open(businessSuiteUrl, '_blank');
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View in Business Suite
          </Button>
        )}

        <Separator />

        {/* Add Note */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add Note</h4>
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
            className="h-8 text-sm"
          />
          <Textarea
            value={noteDescription}
            onChange={(e) => setNoteDescription(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            className="resize-none text-sm"
          />
          <Button
            onClick={handleAddNote}
            disabled={!noteTitle.trim() || isAddingNote}
            size="sm"
            className="w-full h-8"
          >
            {isAddingNote ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding...</>
            ) : (
              <><Plus className="h-3.5 w-3.5 mr-1.5" />Add Note</>
            )}
          </Button>
        </div>

        <Separator />

        {/* Journey Placeholder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customer Journey
            </h4>
            <Badge variant="secondary" className="text-[10px] h-5">
              0 events
            </Badge>
          </div>

          <div className="py-6 text-center">
            <MessageCirclePlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No journey events yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create an order to start tracking
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
