import type { Metadata } from "next";
import { NeonButton } from "@/components/ui/neon-button";
import { PageHeader } from "@/components/ui/page-header";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getSiteSettings } from "@/lib/site/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact links and collaboration channels for this portfolio template.",
};

const collaborationTopics = [
  "Frontend architecture",
  "Product interface implementation",
  "Markdown / content workflow",
  "Next.js / TypeScript systems",
  "Engineering collaboration",
];

const briefChecklist = ["Problem", "Target users", "Constraints", "Timeline"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContactPage() {
  const { contactLinks, siteProfile } = await getSiteSettings();

  return (
    <Section>
      <Container className="space-y-5">
        <PageHeader
          accent="pink"
          description="Open channels for product ideas, engineering collaboration, and technical notes."
          eyebrow="Contact"
          title="Open channel for product and engineering missions"
        />

        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <PixelCard accent="pink" className="h-full space-y-5 bg-[#0b1220]!">
            <div>
              <p className="font-mono text-xs font-bold uppercase text-[#cf9bb8]">
                terminal://brief
              </p>
              <h2 className="mt-2 font-mono text-xl font-bold text-white">Signal Brief</h2>
            </div>
            <p className="text-base leading-8 text-[#b7c2e0]">
              Send a focused brief with the problem, target users, constraints, and
              preferred timeline. I can help shape the interface, architecture, or
              delivery plan from there.
            </p>
            <div className="grid gap-3">
              <div>
                <p className="font-mono text-xs font-bold uppercase text-[#cf9bb8]">
                  What to include
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {briefChecklist.map((item) => (
                    <span
                      className={ui.tinyTag}
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono text-xs font-bold uppercase text-[#cf9bb8]">
                  Collaboration topics
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {collaborationTopics.map((topic) => (
                    <span
                      className="rounded-[4px] border border-[#26344d] bg-[#101827] px-3 py-2 font-mono text-sm text-[#b7c2e0] shadow-[inset_0_0_0_1px_#172238]"
                      key={topic}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <NeonButton accent="pink" href={`mailto:${siteProfile.email}`} size="lg">
              <PixelIcon className="h-5 w-5" name="mail" />
              Email Me
            </NeonButton>
          </PixelCard>

          <div className="grid auto-rows-fr gap-5 sm:grid-cols-2">
            {contactLinks.map((link) => {
              return (
                <PixelCard
                  accent={link.accent}
                  as="article"
                  className="flex h-full flex-col space-y-4"
                  key={link.label}
                  interactive
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-[#30445f] bg-[#101827] text-[#bfe7eb] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)]">
                    <PixelIcon className="h-6 w-6" name={link.icon} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-mono text-lg font-bold text-white">{link.label}</h2>
                    <p className="mt-2 truncate text-sm text-[#9fb0d8]">{link.value}</p>
                  </div>
                  <a
                    className="mt-auto inline-flex h-9 w-fit items-center rounded-[4px] border border-[#30445f] bg-[#101827] px-3 font-mono text-sm font-bold text-[#b9dfe3] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                    href={link.href}
                    rel={/^https?:\/\//.test(link.href) ? "noreferrer" : undefined}
                    target={/^https?:\/\//.test(link.href) ? "_blank" : undefined}
                  >
                    Open link
                  </a>
                </PixelCard>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
