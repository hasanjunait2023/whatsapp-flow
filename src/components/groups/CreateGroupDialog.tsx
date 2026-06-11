 import { useState, useMemo } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Badge } from '@/components/ui/badge';
 import { Search, Users, Loader2, X } from 'lucide-react';
 import { useContacts, Contact } from '@/hooks/useContacts';
 import { useInstances } from '@/hooks/useInstances';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 
 interface CreateGroupDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess?: (group: any) => void;
 }
 
 export default function CreateGroupDialog({
   open,
   onOpenChange,
   onSuccess,
 }: CreateGroupDialogProps) {
   const { contacts, loading: loadingContacts } = useContacts();
   const { instances, loading: loadingInstances } = useInstances();
   const [groupName, setGroupName] = useState('');
   const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
   const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
   const [searchQuery, setSearchQuery] = useState('');
   const [creating, setCreating] = useState(false);
 
   // Filter contacts based on selected instance and search
   const filteredContacts = useMemo(() => {
     let filtered = contacts;
     
     if (selectedInstanceId) {
       filtered = filtered.filter((c) => c.instance_id === selectedInstanceId);
     }
     
     if (searchQuery) {
       const query = searchQuery.toLowerCase();
       filtered = filtered.filter(
         (c) =>
           c.name?.toLowerCase().includes(query) ||
           c.phone_number?.includes(query)
       );
     }
     
     return filtered;
   }, [contacts, selectedInstanceId, searchQuery]);
 
   // Get connected instances only
   const connectedInstances = useMemo(
     () => instances.filter((i) => i.status === 'active'),
     [instances]
   );
 
   const toggleContact = (contactId: string) => {
     setSelectedContacts((prev) => {
       const next = new Set(prev);
       if (next.has(contactId)) {
         next.delete(contactId);
       } else {
         next.add(contactId);
       }
       return next;
     });
   };
 
   const handleCreate = async () => {
     if (!groupName.trim()) {
       toast.error('গ্রুপের নাম দিন');
       return;
     }
     if (!selectedInstanceId) {
       toast.error('একটি ইন্সট্যান্স সিলেক্ট করুন');
       return;
     }
     if (selectedContacts.size === 0) {
       toast.error('অন্তত একজন সদস্য সিলেক্ট করুন');
       return;
     }
 
     setCreating(true);
     try {
       // Get phone numbers for selected contacts
       const phoneNumbers = contacts
         .filter((c) => selectedContacts.has(c.id))
         .map((c) => c.phone_number)
         .filter(Boolean);
 
       const { data, error } = await supabase.functions.invoke('group-create', {
         body: {
           instance_id: selectedInstanceId,
           group_name: groupName.trim(),
           participant_phone_numbers: phoneNumbers,
         },
       });
 
       if (error) throw error;
 
       toast.success('গ্রুপ তৈরি হয়েছে!', {
         description: `${groupName} গ্রুপে ${phoneNumbers.length} জন সদস্য যুক্ত হয়েছে`,
       });
 
       onSuccess?.(data.group);
       handleClose();
     } catch (error: any) {
       console.error('Error creating group:', error);
       toast.error('গ্রুপ তৈরি করা যায়নি', {
         description: error?.message || 'অনুগ্রহ করে আবার চেষ্টা করুন',
       });
     } finally {
       setCreating(false);
     }
   };
 
   const handleClose = () => {
     setGroupName('');
     setSelectedInstanceId('');
     setSelectedContacts(new Set());
     setSearchQuery('');
     onOpenChange(false);
   };
 
   const getContactInitials = (contact: Contact) => {
     if (contact.name) {
       return contact.name
         .split(' ')
         .map((n) => n[0])
         .join('')
         .slice(0, 2)
         .toUpperCase();
     }
     return contact.phone_number?.slice(-2) || '??';
   };
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Users className="h-5 w-5 text-primary" />
             নতুন গ্রুপ তৈরি করুন
           </DialogTitle>
         </DialogHeader>
 
         <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
           {/* Instance Selection */}
           <div className="space-y-2">
             <Label>ইন্সট্যান্স সিলেক্ট করুন</Label>
             <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
               <SelectTrigger>
                 <SelectValue placeholder="ইন্সট্যান্স বাছুন..." />
               </SelectTrigger>
               <SelectContent>
                 {connectedInstances.map((instance) => (
                   <SelectItem key={instance.id} value={instance.id}>
                     {instance.name} ({instance.phone_number || 'No number'})
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           {/* Group Name */}
           <div className="space-y-2">
             <Label htmlFor="group-name">গ্রুপের নাম</Label>
             <Input
               id="group-name"
               value={groupName}
               onChange={(e) => setGroupName(e.target.value)}
               placeholder="VIP Customers, Support Team..."
               maxLength={50}
             />
           </div>
 
           {/* Selected Count */}
           {selectedContacts.size > 0 && (
             <div className="flex items-center gap-2 flex-wrap">
               <Badge variant="secondary">
                 {selectedContacts.size} জন নির্বাচিত
               </Badge>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setSelectedContacts(new Set())}
                 className="h-6 text-xs"
               >
                 <X className="h-3 w-3 mr-1" />
                 সব মুছুন
               </Button>
             </div>
           )}
 
           {/* Contact Search */}
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="কাস্টমার খুঁজুন..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-9"
             />
           </div>
 
           {/* Contact List */}
           <ScrollArea className="flex-1 -mx-6 px-6 min-h-[200px]">
             {loadingContacts ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
               </div>
             ) : filteredContacts.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 {selectedInstanceId
                   ? 'এই ইন্সট্যান্সে কোনো কন্টাক্ট নেই'
                   : 'প্রথমে একটি ইন্সট্যান্স সিলেক্ট করুন'}
               </div>
             ) : (
               <div className="space-y-1">
                 {filteredContacts.map((contact) => (
                   <button
                     key={contact.id}
                     onClick={() => toggleContact(contact.id)}
                     className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                   >
                     <Checkbox
                       checked={selectedContacts.has(contact.id)}
                       onCheckedChange={() => toggleContact(contact.id)}
                     />
                     <Avatar className="h-9 w-9">
                       <AvatarImage src={contact.profile_pic_url || undefined} />
                       <AvatarFallback className="text-xs">
                         {getContactInitials(contact)}
                       </AvatarFallback>
                     </Avatar>
                     <div className="flex-1 text-left min-w-0">
                       <p className="font-medium truncate">
                         {contact.name || contact.phone_number}
                       </p>
                       {contact.name && (
                         <p className="text-sm text-muted-foreground truncate">
                           {contact.phone_number}
                         </p>
                       )}
                     </div>
                   </button>
                 ))}
               </div>
             )}
           </ScrollArea>
 
           {/* Create Button */}
           <Button
             onClick={handleCreate}
             disabled={
               creating ||
               !groupName.trim() ||
               !selectedInstanceId ||
               selectedContacts.size === 0
             }
             className="w-full"
           >
             {creating ? (
               <>
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 তৈরি হচ্ছে...
               </>
             ) : (
               <>
                 <Users className="h-4 w-4 mr-2" />
                 গ্রুপ তৈরি করুন
               </>
             )}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }