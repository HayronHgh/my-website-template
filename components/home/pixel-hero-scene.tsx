import Image from "next/image";

type PixelHeroSceneProps = {
  imageSrc: string;
};

export function PixelHeroScene({ imageSrc }: PixelHeroSceneProps) {
  return (
    <div
      aria-label="Pixel desert night scene with tent, campfire, camel, moon, cactus, and mountains"
      className="pixel-scene"
      role="img"
    >
      {/* Blurred backdrop disabled so the hero reads as one crisp pixel scene.
      <Image
        alt=""
        aria-hidden
        className="pixel-scene-backdrop"
        fill
        priority
        quality={80}
        sizes="100vw"
        src="/bg.png"
      />
      */}
      <div className="pixel-scene-frame">
        <Image
          alt=""
          className="pixel-scene-image"
          fill
          priority
          quality={100}
          sizes="92vw"
          src={imageSrc}
        />
      </div>
      <div className="pixel-scene-readable" />
    </div>
  );
}
