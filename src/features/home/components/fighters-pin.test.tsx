// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FighterCardDTO } from "@/features/fighters/dto";
import { stubBrowserApis } from "@/test/browser-stubs";
import { FIGHTERS_SECTION_ID, FightersPin } from "./fighters-pin";

beforeAll(stubBrowserApis);

afterEach(cleanup);

const fighter: FighterCardDTO = {
  id: "f1",
  slug: "bryan-cevallos",
  firstName: "Bryan",
  lastName: "Cevallos",
  nickname: null,
  gender: "male",
  nationality: "CL",
  careerStatus: "active",
  division: { name: "Ligero", slug: "peso-superligero", limitKg: 70.3, gender: "male" },
  record: { wins: 12, losses: 2, draws: 0, noContests: 0 },
  bodyMedia: null,
  headshotMedia: null,
};

/** Lo que hace ScrollTrigger con `pin: true`: mete la sección en un `.pin-spacer` nuevo, en su mismo lugar. */
function pinLikeScrollTrigger(section: HTMLElement) {
  const spacer = document.createElement("div");
  spacer.className = "pin-spacer";
  section.parentNode?.insertBefore(spacer, section);
  spacer.appendChild(section);
}

describe("FightersPin", () => {
  it("se desmonta sin romper aunque GSAP haya envuelto la sección fijada (navegar fuera de la home)", () => {
    const { unmount } = render(<FightersPin fighters={[{ fighter, badge: null, backdrop: null }]} />);
    const section = document.getElementById(FIGHTERS_SECTION_ID);
    expect(section).not.toBeNull();

    pinLikeScrollTrigger(section as HTMLElement);

    expect(() => unmount()).not.toThrow();
  });
});
