import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback, FeedbackEvent } from '@/hooks/useFeedback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Star, MessageSquare, Calendar, Trash2, ExternalLink, User } from 'lucide-react';
import { format } from 'date-fns';

export function FeedbackSettings() {
  const navigate = useNavigate();
  const { feedbackEvents, isLoading, stats, deleteFeedback } = useFeedback();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackEvent | null>(null);

  const handleViewContact = (contactId: string) => {
    navigate(`/inbox?contact=${contactId}`);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteFeedback.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return <FeedbackSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Customer Feedback
          </CardTitle>
          <CardDescription>
            View and manage feedback collected from your customers
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Feedback"
          value={stats.total}
          icon={Star}
          iconColor="text-yellow-500"
          description="All time"
        />
        <StatCard
          title="This Week"
          value={stats.thisWeek}
          icon={Calendar}
          iconColor="text-blue-500"
          description="Since Sunday"
        />
        <StatCard
          title="This Month"
          value={stats.thisMonth}
          icon={MessageSquare}
          iconColor="text-green-500"
          description="Current month"
        />
      </div>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feedback History</CardTitle>
          <CardDescription>
            {feedbackEvents.length} feedback entries collected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackEvents.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {feedbackEvents.map((feedback) => (
                <FeedbackItem
                  key={feedback.id}
                  feedback={feedback}
                  onView={() => handleViewContact(feedback.contact_id)}
                  onDelete={() => setDeleteTarget(feedback)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeedbackItem({
  feedback,
  onView,
  onDelete,
}: {
  feedback: FeedbackEvent;
  onView: () => void;
  onDelete: () => void;
}) {
  const contactName = feedback.contact?.name || feedback.contact?.phone_number || 'Unknown';
  const creatorName = feedback.creator?.full_name || 'System';

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={feedback.creator?.avatar_url || undefined} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{feedback.title}</span>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="truncate">From: {contactName}</span>
          <span>•</span>
          <span>By: {creatorName}</span>
          <span>•</span>
          <span>{format(new Date(feedback.created_at), 'MMM d, yyyy')}</span>
        </div>
        
        {feedback.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {feedback.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onView}
          title="View contact"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Delete feedback"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Star className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">No feedback yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Customer feedback will appear here when you add feedback from the contact info panel in your inbox.
      </p>
    </div>
  );
}

function FeedbackSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
