import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SUPPORT_WHATSAPP, APP_NAME } from '@/config/branding';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// যে পেজগুলোতে সাপোর্ট বাটন দেখাবে না
// '/' = public landing page has its own scoped WhatsApp FAB (avoids two green FABs).
const HIDDEN_ROUTES = ['/', '/inbox', '/fb-inbox', '/internal-chat', '/admin/inbox'];

export function FloatingWhatsAppButton() {
  const location = useLocation();
  
  // চেক করি বর্তমান রাউট hidden list এ আছে কিনা
  const isHiddenRoute = HIDDEN_ROUTES.some(route => location.pathname === route);
  
  // যদি hidden route হয়, তাহলে কিছুই রেন্ডার করি না
  if (isHiddenRoute) {
    return null;
  }

  const message = encodeURIComponent(`Hi, I need help with ${APP_NAME}`);
  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 md:h-16 md:w-16"
          aria-label="WhatsApp Support"
        >
          <MessageCircle className="h-7 w-7 md:h-8 md:w-8" fill="currentColor" />
          {/* Pulse animation */}
          <span className="absolute -z-10 h-full w-full animate-ping rounded-full bg-[#25D366] opacity-30" />
        </a>
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-background border border-border">
        <p>সাপোর্ট WhatsApp</p>
      </TooltipContent>
    </Tooltip>
  );
}
