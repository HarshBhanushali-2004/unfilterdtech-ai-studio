"use client";

import { useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { connectPlatform, disconnectPlatform } from "@/lib/connections/actions";
import type { ConnectionListItem } from "@/lib/connections/dto";
import {
  OAUTH_ENABLED_PLATFORMS,
  PLATFORM_DESCRIPTIONS,
  PLATFORM_LABELS,
} from "@/lib/connections/platforms";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

import { ConnectionStatusBadge } from "./connection-status-badge";
import { PLATFORM_ACCENT_CLASSES, PlatformIcon } from "./platform-icon";

function formatLastConnected(lastConnectedAt: string | null): string {
  if (!lastConnectedAt) return "Not connected yet";

  // `formatDate` (DD/MM/YYYY, no `Intl`) rather than
  // `toLocaleDateString(undefined, ...)` — the latter resolves the
  // "unspecified" locale from the runtime it executes in, which is the
  // server's Node locale during SSR and the browser's locale during
  // hydration. Those two aren't guaranteed to match (different OS/ICU
  // defaults, different Accept-Language), so the server-rendered string and
  // the client's first render can come out different-shaped and trip a
  // hydration mismatch. See `lib/format-date.ts`'s doc comment — this is
  // the same reasoning that keeps the rest of the app off `toLocaleDateString`.
  return `Last connected ${formatDate(lastConnectedAt)}`;
}

export function ConnectionCard({ connection }: { connection: ConnectionListItem }) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const label = PLATFORM_LABELS[connection.platform];
  const isConnected = connection.status === "CONNECTED";
  const needsReconnect = connection.status === "EXPIRED";
  // EXPIRED still has real account data on file (see
  // lib/connections/token-refresh.ts) — show it rather than reverting to
  // "no account connected", so the user knows which account to reconnect.
  const hasAccountInfo = isConnected || needsReconnect;
  const isOAuthEnabled = OAUTH_ENABLED_PLATFORMS.includes(connection.platform);

  function handleConnect() {
    if (isOAuthEnabled) {
      // Real OAuth needs a full browser navigation (the vendor's consent
      // screen, then its redirect back) — not a server action call.
      window.location.href = `/api/social/${connection.platform.toLowerCase()}/connect`;
      return;
    }

    startTransition(async () => {
      try {
        await connectPlatform(connection.platform);
        toast.success(`Connected to ${label}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to connect ${label}`);
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        await disconnectPlatform(connection.platform);
        toast.success(`Disconnected from ${label}`);
        setConfirmOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to disconnect ${label}`);
      }
    });
  }

  return (
    <>
      <Card className="ring-foreground/10">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  PLATFORM_ACCENT_CLASSES[connection.platform]
                )}
              >
                <PlatformIcon platform={connection.platform} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">{label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {PLATFORM_DESCRIPTIONS[connection.platform]}
                </p>
              </div>
            </div>

            <ConnectionStatusBadge status={connection.status} className="shrink-0" />
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Avatar size="lg">
              {hasAccountInfo && connection.profileImage && (
                <AvatarImage src={connection.profileImage} alt={connection.accountName ?? label} />
              )}
              <AvatarFallback>
                {hasAccountInfo && connection.accountName ? (
                  connection.accountName.slice(0, 2).toUpperCase()
                ) : (
                  <UserRound className="size-4" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              {hasAccountInfo ? (
                <>
                  <p className="truncate text-sm font-medium">{connection.accountName}</p>
                  {connection.accountUsername && (
                    <p className="truncate text-xs text-muted-foreground">
                      @{connection.accountUsername}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No account connected</p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {formatLastConnected(connection.lastConnectedAt)}
          </p>

          <div className="mt-auto pt-1">
            {isConnected ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setConfirmOpen(true)}
                disabled={isPending}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white hover:brightness-110"
                onClick={handleConnect}
                disabled={isPending}
              >
                {isPending ? "Connecting..." : needsReconnect ? "Reconnect" : "Connect"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the stored {label} connection. Nothing gets deleted from{" "}
              {label} itself, and you can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDisconnect} disabled={isPending}>
              {isPending ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
