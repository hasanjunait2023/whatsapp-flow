 import { Users, ChevronRight, Loader2 } from 'lucide-react';
 import { useContactGroups } from '@/hooks/useContactGroups';
 import { formatDistanceToNow } from 'date-fns';
 import { bn } from 'date-fns/locale';
 
 interface ContactGroupsSectionProps {
   contactId: string;
   onNavigateToGroup?: (groupId: string) => void;
 }
 
 export default function ContactGroupsSection({
   contactId,
   onNavigateToGroup,
 }: ContactGroupsSectionProps) {
   const { groups, loading } = useContactGroups(contactId);
 
   if (loading) {
     return (
       <div className="p-4">
         <div className="flex items-center gap-2 mb-3">
           <Users className="h-4 w-4 text-muted-foreground" />
           <span className="text-sm font-medium">WhatsApp Groups</span>
         </div>
         <div className="flex items-center justify-center py-4">
           <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
         </div>
       </div>
     );
   }
 
   if (groups.length === 0) {
     return null;
   }
 
   return (
     <div className="p-4 border-t border-border">
       <div className="flex items-center gap-2 mb-3">
         <Users className="h-4 w-4 text-muted-foreground" />
         <span className="text-sm font-medium">WhatsApp Groups ({groups.length})</span>
       </div>
       
       <div className="space-y-2">
         {groups.map((item) => (
           <button
             key={item.id}
             onClick={() => item.group && onNavigateToGroup?.(item.group.id)}
             className="w-full flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
           >
             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
               <Users className="h-4 w-4 text-primary" />
             </div>
             
             <div className="flex-1 min-w-0">
               <p className="font-medium text-sm truncate">
                 {item.group?.name || 'Unknown Group'}
               </p>
               <p className="text-xs text-muted-foreground">
                 যুক্ত হয়েছেন:{' '}
                 {formatDistanceToNow(new Date(item.added_at), {
                   addSuffix: true,
                   locale: bn,
                 })}
               </p>
             </div>
             
             <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
           </button>
         ))}
       </div>
     </div>
   );
 }