import Image from 'next/image';

/**
 * One vial photograph serves the whole catalogue, with the product name drawn
 * over the label as live text rather than baked into 74 separate JPEGs. Same
 * technique the static site used: a single 27 KB asset instead of ~2 MB, and
 * the text stays crisp at any size.
 *
 * Positioning is expressed in container-query units against a wrapper locked
 * to the photo's own aspect ratio, so the label tracks the printed label area
 * exactly as the card resizes.
 */

const LABEL_MAX = 20;

/**
 * Long product names won't fit the printed label. The `code` column already
 * holds the short form for those (BB10, CP10, RETA+TIRZ), which is how a real
 * vial would be marked anyway.
 */
export function vialLabel(name: string, code: string): string {
  return name.length > LABEL_MAX ? code : name;
}

export default function VialImage({ name, code }: { name: string; code: string }) {
  return (
    <div className="vial-wrap">
      <Image
        src="/vial.jpg"
        alt={`${name} vial`}
        width={533}
        height={800}
        className="vial-img"
        sizes="(max-width: 720px) 60vw, 240px"
      />
      <span className="vial-label">{vialLabel(name, code)}</span>
    </div>
  );
}
