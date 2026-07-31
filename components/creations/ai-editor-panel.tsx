"use client";

import { useState } from "react";
import { Bot, Sparkles, Send, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface AIEditorPanelProps {
  content: string;
  creationId: string;
}

export function AIEditorPanel({
  content,
  creationId,
}: AIEditorPanelProps) {
    const [instruction, setInstruction] = useState("");
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    async function rewrite() {
      if (!instruction.trim()) return;

      setLoading(true);

      try {
        const res = await fetch("/api/rewrite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            instruction,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error);
        }

        setResponse(data.data);
        setInstruction("");
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to rewrite content right now."
        );
      } finally {
        setLoading(false);
      }
    }
    async function quickRewrite(prompt: string) {
    setInstruction(prompt);

    setLoading(true);

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          instruction: prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setResponse(data.data);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to rewrite content right now."
      );
    } finally {
      setLoading(false);
    }
  }
  async function acceptRewrite() {
  if (!response.trim()) return;

  try {
    const res = await fetch(
      `/api/creations/${creationId}/caption`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: response,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    window.location.reload();
  } catch (error) {
    console.error(error);
    toast.error(
      error instanceof Error
        ? error.message
        : "Unable to save the rewrite. Please try again."
    );
  }
}
  
  return (
    <div className="sticky top-24 flex h-[calc(100vh-130px)] min-h-[760px] flex-col rounded-2xl border">
      {/* Header */}
      <div className="border-b p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Ask AI to improve, rewrite or refine this content.
        </p>
      </div>

      {/* Suggestions */}
      <div className="border-b p-5">
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              quickRewrite(
                "Rewrite this content so it is much shorter while keeping the main message."
              )
            }
          >
            ✂️ Shorter
          </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                quickRewrite(
                  "Rewrite this content in a funny and entertaining tone."
                )
              }
            >
              😂 Funny
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                quickRewrite(
                  "Rewrite this content with a stronger opening hook that grabs attention."
                )
              }
            >
              🚀 Better Hook
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                quickRewrite(
                  "Rewrite this content in a professional business tone."
                )
              }
            >
              💼 Professional
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                quickRewrite(
                  "Rewrite this content specifically for Instagram with an engaging tone and relevant hashtags."
                )
              }
            >
              📱 Instagram
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                quickRewrite(
                  "Rewrite this content for LinkedIn with a professional tone and a strong call to discussion."
                )
              }
            >
              💼 LinkedIn
            </Button>
        </div>
      </div>

      {/* Messages */}
    <ScrollArea className="flex-1">
    <div className="space-y-6 p-5">
        <div className="flex justify-end gap-3">
            <div className="max-w-[92%] rounded-2xl border px-4 py-3">
                <div className="max-w-[92%] rounded-2xl border px-5 py-4">
                  <div className="rounded-xl bg-muted p-4">
                    <p className="whitespace-pre-wrap text-sm leading-7">
                      {loading
                        ? "Thinking..."
                        : response || "Ask AI to rewrite the content."}
                    </p>
                  </div>
                  {response && (
                    <div className="mt-4 flex justify-end">
                      <Button onClick={acceptRewrite}>
                        ✅ Accept Rewrite
                      </Button>
                    </div>
                  )}
                </div>
            </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
        </div>
        </div>
    </div>
    </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex items-end gap-3">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Example: Make it shorter"
          className="min-h-[60px] max-h-[160px] resize-none"
        />

          <Button
            size="icon"
            onClick={rewrite}
            disabled={loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}