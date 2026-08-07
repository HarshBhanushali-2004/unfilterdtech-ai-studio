"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, RefreshCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CreationStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format-date";

const STATUS_LABEL: Record<CreationStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
};

const STATUS_BADGE_CLASS: Record<CreationStatus, string> = {
  DRAFT: "",
  APPROVED: "border-blue-500/30 text-blue-600 dark:text-blue-400",
  SCHEDULED: "border-amber-500/30 text-amber-600 dark:text-amber-400",
  PUBLISHED: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
};

/** `datetime-local`'s value format has no timezone — read/written in the browser's local time, converted to a UTC ISO string only when sent to the API. */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type ReviewActionBarProps = {
  creationId: string;
  status: CreationStatus;
  scheduledAt: string | null;
  deleteRedirectTo: string;
};

/**
 * The Review page's single primary action surface (see CLAUDE.md Section
 * 12) — everything a creator needs to move a creation from draft to
 * published, and nothing else. Sticky to the bottom of the viewport so it
 * never scrolls out of reach while reviewing.
 */
export function ReviewActionBar({
  creationId,
  status,
  scheduledAt,
  deleteRedirectTo,
}: ReviewActionBarProps) {
  const router = useRouter();

  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentScheduledAt, setCurrentScheduledAt] = useState(scheduledAt);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [scheduling, setScheduling] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function updateStatus(
    body: { status: CreationStatus; scheduledAt?: string },
    setLoading: (value: boolean) => void
  ) {
    setLoading(true);

    try {
      const res = await fetch(`/api/creations/${creationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setCurrentStatus(data.status);
      setCurrentScheduledAt(data.scheduledAt);
      router.refresh();

      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update this creation right now."
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function approveAndPublish() {
    const ok = await updateStatus({ status: "PUBLISHED" }, setPublishing);
    if (ok) toast.success("Marked as published");
  }

  async function submitSchedule() {
    const iso = new Date(scheduleValue).toISOString();
    const ok = await updateStatus({ status: "SCHEDULED", scheduledAt: iso }, setScheduling);
    if (ok) {
      toast.success("Scheduled");
      setScheduleOpen(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);

    try {
      const res = await fetch(`/api/creations/${creationId}/regenerate`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("Regenerated — caption, hashtags, and images refreshed");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to regenerate this creation right now."
      );
    } finally {
      setRegenerating(false);
    }
  }

  async function deleteCreation() {
    setDeleting(true);

    try {
      const res = await fetch(`/api/creations/${creationId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("Creation deleted");
      router.push(deleteRedirectTo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete creation");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const busy = publishing || regenerating || deleting;

  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Status:</span>
            <Badge variant="outline" className={STATUS_BADGE_CLASS[currentStatus]}>
              {STATUS_LABEL[currentStatus]}
            </Badge>
            {currentStatus === "SCHEDULED" && currentScheduledAt && (
              <span>for {formatDateTime(currentScheduledAt)}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              disabled={busy}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>

            <Button variant="outline" onClick={regenerate} disabled={busy}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Regenerating..." : "Regenerate"}
            </Button>

            <Button variant="outline" onClick={() => setScheduleOpen(true)} disabled={busy}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule
            </Button>

            <Button
              onClick={approveAndPublish}
              disabled={busy || currentStatus === "PUBLISHED"}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {publishing
                ? "Publishing..."
                : currentStatus === "PUBLISHED"
                  ? "Published"
                  : "Approve & Publish"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule this creation</DialogTitle>
            <DialogDescription>
              Pick when it should go out. No changes to the content are needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Date &amp; time</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduleValue}
              onChange={(event) => setScheduleValue(event.target.value)}
              min={toDatetimeLocalValue(new Date())}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>
              Cancel
            </Button>
            <Button onClick={submitSchedule} disabled={scheduling}>
              <Send className="mr-2 h-4 w-4" />
              {scheduling ? "Scheduling..." : "Confirm Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this creation?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The creation and all of its generated content will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteCreation} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
