import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { SkillCard } from "@/components/ui/skill-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Container } from "@/components/ui/container";
import { skillItems } from "@/data/site";

export function SkillsSection() {
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <SectionTitle
            accent="green"
            description="Core tools and systems represented with delivery signals, not subjective percentages."
            eyebrow="Skills"
            icon={<PixelIcon className="h-5 w-5" name="skills" />}
            title="Tools, systems, and delivery habits."
          />
          <PixelCard accent="green" className="flex flex-col justify-center space-y-5 lg:min-h-[30rem]">
            {skillItems.map((skill) => (
              <SkillCard key={skill.name} skill={skill} />
            ))}
          </PixelCard>
        </div>
      </Container>
    </section>
  );
}
