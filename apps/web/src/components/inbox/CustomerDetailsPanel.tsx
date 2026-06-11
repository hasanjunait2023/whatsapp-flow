import { useState } from 'react';
import { Contact } from '@/hooks/useContacts';
import { useCustomerJourney } from '@/hooks/useCustomerJourney';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ContactInfoPanel from './ContactInfoPanel';
import QuickOrderPanel from './QuickOrderPanel';
import { 
  X, 
  ShoppingBag, 
  User,
} from 'lucide-react';

interface CustomerDetailsPanelProps {
  contact: Contact;
  onClose: () => void;
  onViewOrder?: (orderId: string) => void;
}

export default function CustomerDetailsPanel({ 
  contact, 
  onClose,
  onViewOrder 
}: CustomerDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('info');
  // Pass contact.tenant_id explicitly for Admin Inbox tenant consistency
  const { events, isLoading, addNote, addEvent } = useCustomerJourney(contact.id, contact.tenant_id);

  const displayName = contact.name || contact.phone_number;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {displayName}
          </h3>
          <p className="text-xs text-muted-foreground">Customer Details</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 mx-4 mt-3 bg-muted/50">
          <TabsTrigger 
            value="info" 
            className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background"
          >
            <User className="h-3.5 w-3.5" />
            Info & Journey
          </TabsTrigger>
          <TabsTrigger 
            value="orders" 
            className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Quick Order
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="flex-1 m-0 mt-2 min-h-0">
          <ContactInfoPanel 
            contact={contact} 
            events={events}
            isLoadingEvents={isLoading}
            addNote={addNote}
            addEvent={addEvent}
            onViewOrder={onViewOrder}
          />
        </TabsContent>

        <TabsContent value="orders" className="flex-1 m-0 mt-2 min-h-0">
          <QuickOrderPanel 
            contact={contact}
            onOrderCreated={onViewOrder}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}