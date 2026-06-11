 import { useState, useEffect, useRef, useCallback } from 'react';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 import { Users, Send, Loader2, ArrowLeft, Info, Image, Paperclip } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { format } from 'date-fns';
 import { bn } from 'date-fns/locale';
 import { useGroupMessages, GroupMessage } from '@/hooks/useGroupMessages';
 import { toast } from 'sonner';
 import { useState as useEmojiState } from 'react';
 import { Smile } from 'lucide-react';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import data from '@emoji-mart/data';
 import Picker from '@emoji-mart/react';
 import { useTheme } from 'next-themes';
 
 interface GroupChatViewProps {
   groupId: string;
   onBack?: () => void;
   onShowInfo?: () => void;
   instancePhoneNumber?: string;
 }
 
 export default function GroupChatView({
   groupId,
   onBack,
   onShowInfo,
   instancePhoneNumber,
 }: GroupChatViewProps) {
   const { group, messages, loading, sending, sendMessage } = useGroupMessages(groupId);
   const { theme } = useTheme();
   const [emojiOpen, setEmojiOpen] = useEmojiState(false);
   const [messageText, setMessageText] = useState('');
   const scrollRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLTextAreaElement>(null);
 
   // Auto-scroll to bottom on new messages
   useEffect(() => {
     if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
   }, [messages]);
 
   const handleSend = useCallback(async () => {
     if (!messageText.trim() || sending) return;
 
     const text = messageText.trim();
     setMessageText('');
 
     try {
       // Extract mentions from @number patterns
       const mentionRegex = /@(\d+)/g;
       const mentionMatches = text.match(mentionRegex);
       const mentions = mentionMatches?.map((m) => `${m.slice(1)}@s.whatsapp.net`);
 
       await sendMessage(text, { mentions });
     } catch (error: any) {
       toast.error('মেসেজ পাঠানো যায়নি', {
         description: error?.message || 'অনুগ্রহ করে আবার চেষ্টা করুন',
       });
       setMessageText(text); // Restore message on error
     }
   }, [messageText, sending, sendMessage]);
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
   };
 
   const handleEmojiSelect = (emoji: string) => {
     setMessageText((prev) => prev + emoji);
     inputRef.current?.focus();
   };
 
   const getSenderName = (message: GroupMessage) => {
     if (message.direction === 'outbound') {
       return 'You';
     }
     return message.sender_phone || 'Unknown';
   };
 
   const isOwnMessage = (message: GroupMessage) => {
     return message.direction === 'outbound';
   };
 
   if (loading || !group) {
     return (
       <div className="flex items-center justify-center h-full">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
     <div className="flex flex-col h-full bg-background">
       {/* Header */}
       <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
         {onBack && (
           <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
             <ArrowLeft className="h-5 w-5" />
           </Button>
         )}
         
         <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
           <Users className="h-5 w-5 text-primary" />
         </div>
         
         <div className="flex-1 min-w-0">
           <h3 className="font-semibold truncate">{group.name}</h3>
           <p className="text-sm text-muted-foreground">
             {group.participant_count} সদস্য
           </p>
         </div>
         
         {onShowInfo && (
           <Button variant="ghost" size="icon" onClick={onShowInfo}>
             <Info className="h-5 w-5" />
           </Button>
         )}
       </div>
 
       {/* Messages */}
       <ScrollArea ref={scrollRef} className="flex-1 p-4">
         <div className="space-y-4">
           {messages.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
               <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
               <p className="text-muted-foreground">এই গ্রুপে এখনো কোনো মেসেজ নেই</p>
               <p className="text-sm text-muted-foreground mt-1">
                 প্রথম মেসেজ পাঠান!
               </p>
             </div>
           ) : (
             messages.map((message) => (
               <div
                 key={message.id}
                 className={cn(
                   'flex',
                   isOwnMessage(message) ? 'justify-end' : 'justify-start'
                 )}
               >
                 <div
                   className={cn(
                     'max-w-[75%] rounded-2xl px-4 py-2',
                     isOwnMessage(message)
                       ? 'bg-primary text-primary-foreground rounded-br-md'
                       : 'bg-muted rounded-bl-md'
                   )}
                 >
                   {!isOwnMessage(message) && (
                     <p className="text-xs font-medium text-primary mb-1">
                       {getSenderName(message)}
                     </p>
                   )}
                   
                   {message.media_url && (
                     <div className="mb-2">
                       {message.content_type === 'image' && (
                         <img
                           src={message.media_url}
                           alt=""
                           className="rounded-lg max-w-full"
                         />
                       )}
                       {message.content_type === 'video' && (
                         <video
                           src={message.media_url}
                           controls
                           className="rounded-lg max-w-full"
                         />
                       )}
                       {message.content_type === 'audio' || message.content_type === 'voice' ? (
                         <audio src={message.media_url} controls className="w-full" />
                       ) : null}
                     </div>
                   )}
                   
                   {message.content && (
                     <p className="whitespace-pre-wrap break-words">
                       {message.content}
                     </p>
                   )}
                   
                   <p
                     className={cn(
                       'text-xs mt-1',
                       isOwnMessage(message)
                         ? 'text-primary-foreground/70'
                         : 'text-muted-foreground'
                     )}
                   >
                     {message.sent_at
                       ? format(new Date(message.sent_at), 'p', { locale: bn })
                       : format(new Date(message.created_at), 'p', { locale: bn })}
                   </p>
                 </div>
               </div>
             ))
           )}
         </div>
       </ScrollArea>
 
       {/* Input */}
       <div className="p-4 border-t border-border bg-card">
         <div className="flex items-end gap-2">
           <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
             <PopoverTrigger asChild>
               <Button variant="ghost" size="icon" className="shrink-0">
                 <Smile className="h-5 w-5" />
               </Button>
             </PopoverTrigger>
             <PopoverContent side="top" align="start" className="p-0 w-auto border-0">
               <Picker
                 data={data}
                 onEmojiSelect={(emoji: any) => {
                   handleEmojiSelect(emoji.native);
                   setEmojiOpen(false);
                 }}
                 theme={theme === 'dark' ? 'dark' : 'light'}
                 previewPosition="none"
               />
             </PopoverContent>
           </Popover>
           
           <Button variant="ghost" size="icon" className="shrink-0">
             <Image className="h-5 w-5" />
           </Button>
           
           <Button variant="ghost" size="icon" className="shrink-0">
             <Paperclip className="h-5 w-5" />
           </Button>
           
           <Textarea
             ref={inputRef}
             value={messageText}
             onChange={(e) => setMessageText(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder="আপনার মেসেজ লিখুন..."
             className="min-h-[44px] max-h-[120px] resize-none"
             rows={1}
           />
           
           <Button
             onClick={handleSend}
             disabled={!messageText.trim() || sending}
             size="icon"
             className="shrink-0"
           >
             {sending ? (
               <Loader2 className="h-5 w-5 animate-spin" />
             ) : (
               <Send className="h-5 w-5" />
             )}
           </Button>
         </div>
       </div>
     </div>
   );
 }