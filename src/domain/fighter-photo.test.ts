import { describe, expect, it } from "vitest";
import { pickFighterPhoto } from "./fighter-photo";

const face = { id: "face" };
const body = { id: "body" };

describe("pickFighterPhoto", () => {
  it("usa la foto que pide el lugar cuando está subida", () => {
    expect(pickFighterPhoto({ headshotMedia: face, bodyMedia: body }, "headshot")).toEqual({ kind: "headshot", media: face });
    expect(pickFighterPhoto({ headshotMedia: face, bodyMedia: body }, "body")).toEqual({ kind: "body", media: body });
  });

  it("sin la foto pedida usa la otra que sí tenga", () => {
    expect(pickFighterPhoto({ headshotMedia: null, bodyMedia: body }, "headshot")).toEqual({ kind: "body", media: body });
    expect(pickFighterPhoto({ headshotMedia: face, bodyMedia: null }, "body")).toEqual({ kind: "headshot", media: face });
  });

  it("sin ninguna foto pide la silueta", () => {
    expect(pickFighterPhoto({ headshotMedia: null, bodyMedia: null }, "headshot")).toEqual({ kind: "silhouette", media: null });
    expect(pickFighterPhoto({ headshotMedia: null, bodyMedia: null }, "body")).toEqual({ kind: "silhouette", media: null });
  });
});
