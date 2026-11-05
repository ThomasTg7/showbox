import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./json-ld";

describe("JsonLd", () => {
  it("renders one ld+json script whose content parses back to the data", () => {
    const data = { "@context": "https://schema.org", "@type": "Organization", name: 'Guerra "Campal"' };
    const html = renderToStaticMarkup(<JsonLd data={data as never} />);
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    const content = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>"));
    expect(JSON.parse(content)).toEqual(data);
  });

  it("never lets the data close the script tag", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ "@type": "Thing", name: "</script><script>alert(1)</script>" } as never} />);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html.match(/<script/g)).toHaveLength(1);
  });
});
