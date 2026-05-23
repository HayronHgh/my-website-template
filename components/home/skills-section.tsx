import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { SkillBar } from "@/components/ui/skill-bar";
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
            description="Core tools and systems represented as compact neon progress bars."
            eyebrow="Skills"
            icon={<PixelIcon className="h-5 w-5" name="skills" />}
            title="Tools, systems, and delivery habits."
          />
          <PixelCard accent="green" className="flex flex-col justify-center space-y-5 lg:min-h-[30rem]">
            {skillItems.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </PixelCard>
        </div>
      </Container>
    </section>
  );
}
