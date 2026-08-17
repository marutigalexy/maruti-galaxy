import Image from "next/image";

type BrandLogoProps = {
  width?: number;
  height?: number;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({ width = 160, height = 64, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/maruti-galaxy-logo-full.png"
      alt="Maruti Galaxy"
      width={width}
      height={height}
      className="brand-logo"
      priority={priority}
    />
  );
}

export function BrandMark({
  width = 40,
  height = 40,
  priority = false,
  alt = "Maruti Galaxy",
}: BrandLogoProps) {
  return (
    <Image
      src="/maruti-galaxy-logo-mark.png"
      alt={alt}
      width={width}
      height={height}
      className="brand-mark"
      priority={priority}
    />
  );
}
