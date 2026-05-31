import Link from "next/link";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { cn, formatDate } from "@/lib/utils";
import type { BlogPreviewPost } from "@/data/site";

type BlogCardProps = {
  compact?: boolean;
  post: BlogPreviewPost;
  readLabel?: string;
};

export function BlogCard({ compact, post, readLabel = "Read signal" }: BlogCardProps) {
  return (
    <PixelCard
      accent="purple"
      as="article"
      className={cn("group h-full", compact ? "min-h-[20.2rem] p-3!" : "p-7!")}
      id={post.slug}
      interactive
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 text-sm text-[#9fb0d8]",
            compact && "gap-2 text-xs",
          )}
        >
          <span
            className={cn(
              "inline-flex max-w-full items-center gap-2 rounded-[3px] border border-[#315467] bg-[#111c2f] px-3 py-1.5 font-mono font-bold text-[#b9dfe3]",
              compact && "px-2 py-1 text-[11px]",
            )}
          >
            <PixelIcon className={cn("h-4 w-4", compact && "h-3 w-3")} name="file" />
            <span className="truncate">{post.category}</span>
          </span>
          <time
            className={cn(
              "inline-flex items-center gap-2 font-mono text-sm text-[#8ea0c8]",
              compact && "gap-1.5 text-[11px]",
            )}
            dateTime={post.date}
          >
            <PixelIcon className={cn("h-4 w-4", compact && "h-3 w-3")} name="clock" />
            {formatDate(post.date)}
          </time>
        </div>

        <div className="flex flex-1 flex-col">
          <h3
            className={cn(
              "font-mono font-black tracking-tight text-white",
              compact
                ? "clamp-2 mt-3 text-lg leading-7"
                : "mt-6 text-[clamp(1.75rem,2.1vw,2.125rem)] leading-[1.2]",
            )}
          >
            <Link className="transition group-hover:text-cyan-100" href={post.href}>
              {post.title}
            </Link>
          </h3>
          <p
            className={cn(
              "max-w-[56ch] text-[#c7d2ee]",
              compact ? "clamp-3 mt-2 text-sm leading-6" : "mt-5 text-[18px] leading-8",
            )}
          >
            {post.excerpt}
          </p>

          <Link
            className={cn(
              "inline-flex w-fit items-center rounded-[4px] border border-[#30445f] bg-[#101827] font-mono font-bold text-[#b9dfe3] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50",
              compact ? "mt-auto h-9 px-3 text-xs" : "mt-8 h-11 px-5 text-base",
            )}
            href={post.href}
          >
            {readLabel}
          </Link>
        </div>
      </div>
    </PixelCard>
  );
}
