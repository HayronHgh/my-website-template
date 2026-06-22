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
      <div className="pixel-scene-frame">
        <Image
          alt=""
          className="pixel-scene-image"
          fill
          preload
          quality={75}
          sizes="(max-width: 768px) 100vw, (max-width: 1536px) 90vw, 1500px"
          src={imageSrc}
        />
      </div>
      <div className="pixel-scene-readable" />
    </div>
  );
}
