import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDemoSession } from './useDemoSession';

const SHOWN_PROMPTS_KEY = 'demo_shown_prompts';
const PROMPT_DELAY = 5000; // 5 seconds delay before showing prompt
const AUTO_DISMISS_DELAY = 15000; // 15 seconds auto-dismiss

export interface DemoPrompt {
  id: string;
  route: string;
  titleBn: string;
  titleEn: string;
  messageBn: string;
  messageEn: string;
  ctaTextBn: string;
  ctaTextEn: string;
}

export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    id: 'inbox',
    route: '/inbox',
    titleBn: '📱 WhatsApp Inbox',
    titleEn: '📱 WhatsApp Inbox',
    messageBn: 'এই Inbox-এ আপনার সব WhatsApp ও FB মেসেজ এক জায়গায়। নিজের Inbox শুরু করুন!',
    messageEn: 'All your WhatsApp & FB messages in one place. Start your own Inbox!',
    ctaTextBn: 'শুরু করুন',
    ctaTextEn: 'Get Started',
  },
  {
    id: 'orders',
    route: '/orders',
    titleBn: '📦 অর্ডার ম্যানেজমেন্ট',
    titleEn: '📦 Order Management',
    messageBn: 'স্বয়ংক্রিয় অর্ডার ট্র্যাকিং আপনার ৩ ঘণ্টা/দিন বাঁচাতে পারে!',
    messageEn: 'Automatic order tracking can save you 3 hours/day!',
    ctaTextBn: 'ট্র্যাক করুন',
    ctaTextEn: 'Start Tracking',
  },
  {
    id: 'automation',
    route: '/automation',
    titleBn: '⚡ অটোমেশন',
    titleEn: '⚡ Automation',
    messageBn: 'এই Workflow আপনার ব্যবসায় ৪০% সময় বাঁচাবে!',
    messageEn: 'This Workflow will save 40% of your business time!',
    ctaTextBn: 'অটোমেট করুন',
    ctaTextEn: 'Automate Now',
  },
  {
    id: 'products',
    route: '/products',
    titleBn: '🛍️ পণ্য ক্যাটালগ',
    titleEn: '🛍️ Product Catalog',
    messageBn: 'আপনার সব পণ্য এখানে সাজানো থাকবে - এক ক্লিকে শেয়ার!',
    messageEn: 'All your products organized here - share with one click!',
    ctaTextBn: 'পণ্য যোগ করুন',
    ctaTextEn: 'Add Products',
  },
  {
    id: 'reports',
    route: '/reports',
    titleBn: '📊 রিপোর্টস',
    titleEn: '📊 Reports',
    messageBn: 'আপনার প্রতিদিনের বিক্রি এক নজরে দেখুন!',
    messageEn: 'See your daily sales at a glance!',
    ctaTextBn: 'রিপোর্ট দেখুন',
    ctaTextEn: 'View Reports',
  },
  {
    id: 'contacts',
    route: '/contacts',
    titleBn: '👥 কাস্টমার লিস্ট',
    titleEn: '👥 Customer List',
    messageBn: 'সব কাস্টমারের তথ্য এক জায়গায় - সহজে ফলো-আপ!',
    messageEn: 'All customer info in one place - easy follow-up!',
    ctaTextBn: 'কাস্টমার যোগ করুন',
    ctaTextEn: 'Add Customers',
  },
  {
    id: 'analytics',
    route: '/analytics',
    titleBn: '📈 অ্যানালিটিক্স',
    titleEn: '📈 Analytics',
    messageBn: 'আপনার টিমের পারফরম্যান্স ও বিক্রি বিশ্লেষণ করুন!',
    messageEn: 'Analyze your team performance and sales!',
    ctaTextBn: 'বিশ্লেষণ করুন',
    ctaTextEn: 'Analyze',
  },
];

export function useDemoPrompts() {
  const { isDemoTenant } = useDemoSession();
  const location = useLocation();
  const [shownPrompts, setShownPrompts] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(SHOWN_PROMPTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [currentPrompt, setCurrentPrompt] = useState<DemoPrompt | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Find prompt for current route
  const getPromptForRoute = useCallback((pathname: string): DemoPrompt | null => {
    return DEMO_PROMPTS.find(p => pathname.startsWith(p.route)) || null;
  }, []);

  // Mark prompt as shown
  const markAsShown = useCallback((promptId: string) => {
    const updated = [...shownPrompts, promptId];
    setShownPrompts(updated);
    localStorage.setItem(SHOWN_PROMPTS_KEY, JSON.stringify(updated));
  }, [shownPrompts]);

  // Dismiss current prompt
  const dismissPrompt = useCallback(() => {
    if (currentPrompt) {
      markAsShown(currentPrompt.id);
    }
    setIsVisible(false);
    setCurrentPrompt(null);
  }, [currentPrompt, markAsShown]);

  // Handle CTA click
  const handleCtaClick = useCallback(() => {
    if (currentPrompt) {
      markAsShown(currentPrompt.id);
    }
    setIsVisible(false);
    setCurrentPrompt(null);
    // Navigate to billing
    window.location.href = '/billing';
  }, [currentPrompt, markAsShown]);

  // Show prompt based on route
  useEffect(() => {
    if (!isDemoTenant) return;

    const prompt = getPromptForRoute(location.pathname);
    
    if (prompt && !shownPrompts.includes(prompt.id)) {
      // Delay before showing
      const showTimer = setTimeout(() => {
        setCurrentPrompt(prompt);
        setIsVisible(true);
      }, PROMPT_DELAY);

      return () => clearTimeout(showTimer);
    }
  }, [location.pathname, isDemoTenant, shownPrompts, getPromptForRoute]);

  // Auto-dismiss after delay
  useEffect(() => {
    if (!isVisible || !currentPrompt) return;

    const dismissTimer = setTimeout(() => {
      dismissPrompt();
    }, AUTO_DISMISS_DELAY);

    return () => clearTimeout(dismissTimer);
  }, [isVisible, currentPrompt, dismissPrompt]);

  // Reset all prompts (for testing)
  const resetPrompts = useCallback(() => {
    setShownPrompts([]);
    localStorage.removeItem(SHOWN_PROMPTS_KEY);
  }, []);

  return {
    currentPrompt,
    isVisible,
    dismissPrompt,
    handleCtaClick,
    resetPrompts,
    shownPromptsCount: shownPrompts.length,
    totalPromptsCount: DEMO_PROMPTS.length,
  };
}
