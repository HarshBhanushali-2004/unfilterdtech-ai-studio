import { ArrowRight, Bot, ImageIcon, Newspaper, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Newspaper,
    title: "Latest News Research",
    description: "Enter any topic and let AI collect the latest trusted news automatically.",
  },
  {
    icon: Sparkles,
    title: "AI Post Generator",
    description: "Generate premium Instagram posts with captions, hashtags and branding.",
  },
  {
    icon: ImageIcon,
    title: "Carousel & Story",
    description: "Create multi-slide carousels and vertical stories in one click.",
  },
  {
    icon: Video,
    title: "AI Reel Generator",
    description: "Generate scripts, scenes, voiceover and export ready-to-post reels.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex max-w-7xl flex-col px-8 py-20">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300">
          <Bot className="h-4 w-4 text-cyan-400" />
          UnfilterdTech AI Studio
        </div>

        <div className="mt-8 max-w-4xl">
          <h1 className="text-6xl font-extrabold tracking-tight">
            Generate Instagram Posts,
            <br />
            Stories & AI Reels
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
            One platform that researches the latest news, understands any topic,
            creates premium social media content and exports production-ready
            posts, stories, carousels and reels.
          </p>

          <div className="mt-10 flex gap-4">
            <Button size="lg">
              Launch AI Studio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button size="lg" variant="outline">
              View Dashboard
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <feature.icon className="mb-5 h-10 w-10 text-cyan-400" />

              <h2 className="text-xl font-semibold">{feature.title}</h2>

              <p className="mt-3 text-sm leading-7 text-neutral-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 p-10">
          <h2 className="text-3xl font-bold">
            🚀 Coming Next
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              "Topic Research Engine",
              "Brand Kit",
              "AI Image Generator",
              "Carousel Builder",
              "Story Builder",
              "AI Reel Pipeline",
              "Logo Auto Placement",
              "Latest News Fetching",
              "Content History",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-black/30 p-4"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}