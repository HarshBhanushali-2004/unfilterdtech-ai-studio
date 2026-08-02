"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";

export type CarouselSlide = {
  slideNumber: number;
  headline: string;
  body: string;
  visualSuggestion: string;
};

type CarouselCardProps = {
  slides: CarouselSlide[];
};

function formatSlide(slide: CarouselSlide) {
  return `Slide ${slide.slideNumber}\n\nHeadline:\n${slide.headline}\n\nBody:\n${slide.body}\n\nVisual Suggestion:\n${slide.visualSuggestion}`;
}

export function CarouselCard({
  slides,
}: CarouselCardProps) {
  const copyCarousel = () =>
    copyToClipboard(
      slides.map(formatSlide).join("\n\n------------------------\n\n"),
      "Carousel copied"
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyCarousel}>
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
