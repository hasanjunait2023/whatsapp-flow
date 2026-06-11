import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Braces, User, Phone, Package, ShoppingCart, Users, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Variable {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  category: string;
}

const variables: Variable[] = [
  // Contact variables
  { key: '{{contact.name}}', label: 'Contact Name', description: 'Customer name', icon: User, category: 'Contact' },
  { key: '{{contact.phone}}', label: 'Phone Number', description: 'Customer phone', icon: Phone, category: 'Contact' },
  
  // Order variables
  { key: '{{order.id}}', label: 'Order ID', description: 'Order identifier', icon: ShoppingCart, category: 'Order' },
  { key: '{{order.number}}', label: 'Order Number', description: 'Order display number', icon: ShoppingCart, category: 'Order' },
  { key: '{{order.total}}', label: 'Order Total', description: 'Order total amount', icon: ShoppingCart, category: 'Order' },
  { key: '{{order.status}}', label: 'Order Status', description: 'Current order status', icon: Package, category: 'Order' },
  
  // Product variables
  { key: '{{product.name}}', label: 'Product Name', description: 'Product name', icon: Package, category: 'Product' },
  { key: '{{product.price}}', label: 'Product Price', description: 'Product price', icon: Package, category: 'Product' },
  
  // Group variables
  { key: '{{group.name}}', label: 'Group Name', description: 'WhatsApp group name', icon: Users, category: 'Group' },
  { key: '{{group.invite_link}}', label: 'Invite Link', description: 'Group invite URL', icon: Link2, category: 'Group' },
];

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  disabled?: boolean;
}

export default function VariablePicker({ onSelect, disabled }: VariablePickerProps) {
  const [open, setOpen] = useState(false);

  const categories = [...new Set(variables.map((v) => v.category))];

  const handleSelect = (variable: string) => {
    onSelect(variable);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          disabled={disabled}
          className="shrink-0"
        >
          <Braces className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Insert Variable</h4>
          <p className="text-xs text-muted-foreground">
            Click to insert dynamic values
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <div key={category} className="p-2">
              <p className="text-xs font-medium text-muted-foreground uppercase px-2 mb-1">
                {category}
              </p>
              {variables
                .filter((v) => v.category === category)
                .map((variable) => {
                  const Icon = variable.icon;
                  return (
                    <button
                      key={variable.key}
                      onClick={() => handleSelect(variable.key)}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 rounded-md text-left',
                        'hover:bg-muted transition-colors'
                      )}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{variable.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {variable.key}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
