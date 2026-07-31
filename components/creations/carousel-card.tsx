"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export type CarouselSlide = {
  slideNumber: number;
  headline: string;
  body: string;
  visualSuggestion: string;
};

type CarouselCardProps = {
  slides: CarouselSlide[];
};

export function CarouselCard({
  slides,
}: CarouselCardProps) {
  const copyCarousel = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(slides, null, 2)
    );

    toast.success("Carousel copied");
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Carousel
        </h2>

        <Button variant="outline" onClick={copyCarousel}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Carousel
        </Button>
      </div>

      <div className="space-y-6">
        {slides.map((slide) => (
          <div
            key={slide.slideNumber}
            className="rounded-xl border bg-muted/30 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Slide {slide.slideNumber}
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  Headline
                </h3>

                <p className="text-lg font-semibold">
                  {slide.headline}
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  Body
                </h3>

                <p className="whitespace-pre-wrap break-words">
                  {slide.body}
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  Visual Suggestion
                </h3>

                <p className="italic text-muted-foreground">
                  {slide.visualSuggestion}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}