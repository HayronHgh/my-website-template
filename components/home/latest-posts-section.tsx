import { BlogCard } from "@/components/blog/blog-card";
import { NeonButton } from "@/components/ui/neon-button";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { SectionTitle } from "@/components/ui/section-title";
import { Container } from "@/components/ui/container";
import { blogPreviewPosts } from "@/data/site";

export function LatestPostsSection() {
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <SectionTitle
            accent="purple"
            description="Markdown notes and implementation writeups styled as console signals."
            eyebrow="Blog Preview"
            icon={<PixelIcon className="h-5 w-5" name="file" />}
            title="Field notes for maintainable software."
          />
          <NeonButton accent="purple" href="/blog" variant="secondary">
            View blog
          </NeonButton>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {blogPreviewPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </Container>
    </section>
  );
}
