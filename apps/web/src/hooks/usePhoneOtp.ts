import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type OtpState = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';
type OtpPhase = 'phone' | 'otp';

export interface UsePhoneOtpReturn {
  state: OtpState;
  phase: OtpPhase;
  phone: string;
  setPhone: (p: string) => void;
  otp: string;
  setOtp: (o: string) => void;
  error: string | null;
  resendCountdown: number;
  canResend: boolean;
  sendOtp: () => Promise<void>;
  verifyOtp: () => Promise<void>;
  reset: () => void;
  verifiedPhone: string | null;
}

export function usePhoneOtp(): UsePhoneOtpReturn {
  const [state, setState] = useState<OtpState>('idle');
  const [phase, setPhase] = useState<OtpPhase>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startCountdown = () => {
    clearTimer();
    setResendCountdown(60);
    timerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearTimer(), []);

  const sendOtp = async () => {
    setState('sending');
    setError(null);
    const { data, error: err } = await supabase.functions.invoke<{ sent: boolean }>(
      'send-phone-otp',
      { body: { phone } },
    );
    if (err || !data?.sent) {
      setState('error');
      setError(err?.message ?? 'Failed to send code. Try again.');
      return;
    }
    setState('sent');
    setPhase('otp');
    startCountdown();
  };

  const verifyOtp = async () => {
    setState('verifying');
    setError(null);
    const { data, error: err } = await supabase.functions.invoke<{ verified: boolean; phone: string }>(
      'verify-phone-otp',
      { body: { phone, otp } },
    );
    if (err || !data?.verified) {
      setState('error');
      setError(err?.message ?? 'Incorrect code.');
      return;
    }
    setState('verified');
    clearTimer();
  };

  const reset = () => {
    clearTimer();
    setState('idle');
    setPhase('phone');
    setError(null);
    setOtp('');
    setResendCountdown(0);
  };

  return {
    state,
    phase,
    phone,
    setPhone,
    otp,
    setOtp,
    error,
    resendCountdown,
    canResend: resendCountdown === 0 && phase === 'otp' && state !== 'sending' && state !== 'verifying',
    sendOtp,
    verifyOtp,
    reset,
    verifiedPhone: state === 'verified' ? phone : null,
  };
}
