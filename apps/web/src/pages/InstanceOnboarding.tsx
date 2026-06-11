import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/useTenant';
import { useInstances } from '@/hooks/useInstances';
import { useInstanceQR } from '@/hooks/useInstanceQR';
import { useOnboardingJob } from '@/hooks/useOnboardingJob';
import SubscriptionGate from '@/components/instances/SubscriptionGate';
import QRCodeDisplay from '@/components/instances/QRCodeDisplay';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Smartphone } from 'lucide-react';

type Step = 'details' | 'scanning' | 'success';

const STEPS: { key: Step; label: string }[] = [
  { key: 'details', label: 'Instance Details' },
  { key: 'scanning', label: 'Scan QR Code' },
  { key: 'success', label: 'Connected' },
];

export default function InstanceOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const { createInstance, instances, refetch } = useInstances();
  const { job, isInProgress } = useOnboardingJob();

  const [step, setStep] = useState<Step>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instanceId, setInstanceId] = useState<string | null>(
    searchParams.get('instance_id')
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // QR code state
  const {
    qrCode,
    status: qrStatus,
    countdown,
    error: qrError,
    refreshQR,
  } = useInstanceQR({
    instanceId: instanceId || '',
    enabled: !!instanceId && step === 'scanning',
  });

  // Handle job status changes
  useEffect(() => {
    if (job?.instance_id && !instanceId) {
      setInstanceId(job.instance_id);
    }

    if (job?.status === 'awaiting_scan' && step === 'details') {
      setStep('scanning');
    }

    if (job?.status === 'connected') {
      setStep('success');
    }
  }, [job, instanceId, step]);

  // Check for existing instance that needs QR scanning
  useEffect(() => {
    if (instanceId) {
      const instance = instances.find((i) => i.id === instanceId);
      if (instance?.status === 'active') {
        setStep('success');
      } else if (instance?.status === 'disconnected') {
        setStep('scanning');
      }
    }
  }, [instanceId, instances]);

  // Watch QR status changes
  useEffect(() => {
    if (qrStatus === 'connected') {
      setStep('success');
      refetch();
    }
  }, [qrStatus, refetch]);

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your instance.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create instance (this will trigger the onboarding flow)
      const instance = await createInstance({
        name: name.trim(),
        phone_number: phoneNumber || undefined,
        api_key: 'pending', // Will be set by the backend
      });

      setInstanceId(instance.id);
      setStep('scanning');

      toast({
        title: 'Instance created',
        description: 'Scan the QR code to connect your WhatsApp.',
      });
    } catch (err) {
      console.error('Create instance error:', err);
      toast({
        title: 'Failed to create instance',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshQR = async () => {
    setIsRefreshing(true);
    try {
      await refreshQR();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getProgress = () => {
    switch (step) {
      case 'details':
        return 33;
      case 'scanning':
        return 66;
      case 'success':
        return 100;
      default:
        return 0;
    }
  };

  const getCurrentStepIndex = () => {
    return STEPS.findIndex((s) => s.key === step);
  };

  return (
    <DashboardLayout>
      <SubscriptionGate feature="WhatsApp instances">
        <div className="p-6 max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/instances')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Instances
            </Button>

            <h1 className="text-2xl font-bold text-foreground">Connect WhatsApp</h1>
            <p className="text-muted-foreground">
              Set up your WhatsApp instance to start managing conversations
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <Progress value={getProgress()} className="h-2 mb-4" />
            <div className="flex justify-between">
              {STEPS.map((s, index) => (
                <div
                  key={s.key}
                  className={`flex flex-col items-center ${
                    index <= getCurrentStepIndex() ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < getCurrentStepIndex()
                        ? 'bg-primary text-primary-foreground'
                        : index === getCurrentStepIndex()
                        ? 'border-2 border-primary text-primary'
                        : 'border-2 border-muted text-muted-foreground'
                    }`}
                  >
                    {index < getCurrentStepIndex() ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs mt-1">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {step === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Instance Details
                </CardTitle>
                <CardDescription>
                  Enter the details for your WhatsApp instance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitDetails} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Instance Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Main Support Line"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      A friendly name to identify this instance
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 234 567 8900"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      The phone number associated with this WhatsApp account
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      Continue
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 'scanning' && (
            <>
              {isInProgress && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {job?.step === 'creating_session' && 'Creating session...'}
                    {job?.step === 'initiating_connection' && 'Initiating connection...'}
                    {job?.step === 'qr_ready' && 'QR code ready'}
                    {!job?.step && 'Setting up...'}
                  </span>
                </div>
              )}

              <QRCodeDisplay
                qrCode={qrCode}
                status={qrStatus}
                countdown={countdown}
                error={qrError}
                onRefresh={handleRefreshQR}
                isRefreshing={isRefreshing}
              />
            </>
          )}

          {step === 'success' && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <CardTitle className="text-2xl mb-2 text-success">
                  WhatsApp Connected!
                </CardTitle>
                <CardDescription className="text-center max-w-sm mb-6">
                  Your WhatsApp instance is now connected and ready to receive messages.
                  You can start managing conversations from your inbox.
                </CardDescription>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate('/instances')}>
                    View Instances
                  </Button>
                  <Button onClick={() => navigate('/inbox')}>
                    Go to Inbox
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SubscriptionGate>
    </DashboardLayout>
  );
}
