import { NeonButton } from "@/components/ui/neon-button";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { SectionTitle } from "@/components/ui/section-title";
import { Container } from "@/components/ui/container";
import { contactLinks } from "@/data/site";

export function ContactCtaSection() {
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <PixelCard accent="pink" className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <SectionTitle
            accent="pink"
            description="Compact signal links for code, writing, and direct contact."
            eyebrow="Let's Connect"
            title="Ready for the next quest."
          />
          <div className="flex flex-wrap gap-3">
            {contactLinks.map((link) => (
              <NeonButton
                accent={link.accent}
                aria-label={link.label}
                external={/^https?:\/\//.test(link.href)}
                href={link.href}
                key={link.label}
                variant="secondary"
              >
                <PixelIcon className="h-5 w-5" name={link.icon} />
                <span className="sr-only">{link.label}</span>
              </NeonButton>
            ))}
          </div>
        </PixelCard>
      </Container>
    </section>
  );
}
