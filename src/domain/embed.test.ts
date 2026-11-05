import { describe, expect, it } from "vitest";
import { embedCanonicalUrl, embedFromAttrs, embedSrc, isVerticalEmbed, parseEmbedUrl, youtubeThumbnailUrl } from "./embed";

describe("parseEmbedUrl", () => {
  it("recognizes an Instagram post with tracking parameters", () => {
    expect(parseEmbedUrl("https://www.instagram.com/p/C8abc123/?igsh=xyz")).toEqual({ provider: "instagram", id: "C8abc123" });
  });

  it("recognizes an Instagram reel", () => {
    expect(parseEmbedUrl("https://www.instagram.com/reel/C9xyz/")).toEqual({ provider: "instagram", id: "C9xyz" });
    expect(parseEmbedUrl("https://instagram.com/reels/C9xyz")).toEqual({ provider: "instagram", id: "C9xyz" });
  });

  it("recognizes an Instagram post that carries the account in the path", () => {
    expect(parseEmbedUrl("https://www.instagram.com/showboxpromotions/p/C8abc123/")).toEqual({ provider: "instagram", id: "C8abc123" });
  });

  it("recognizes YouTube short links, shorts, watch and embed urls", () => {
    const expected = { provider: "youtube", id: "dQw4w9WgXcQ" };
    expect(parseEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=10")).toEqual(expected);
    expect(parseEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toEqual(expected);
    expect(parseEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1")).toEqual(expected);
    expect(parseEmbedUrl("https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ")).toEqual(expected);
    expect(parseEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toEqual(expected);
  });

  it("recognizes a TikTok video", () => {
    expect(parseEmbedUrl("https://www.tiktok.com/@gc/video/7412345678901234567")).toEqual({ provider: "tiktok", id: "7412345678901234567" });
    expect(parseEmbedUrl("https://www.tiktok.com/@gc/video/7412345678901234567?is_from_webapp=1")).toEqual({
      provider: "tiktok",
      id: "7412345678901234567",
    });
  });

  it("recognizes Facebook posts, videos, reels, watch links and share links", () => {
    expect(parseEmbedUrl("https://www.facebook.com/GuerraCampalMMA/posts/pfbid02AbC123xyz?ref=share")).toEqual({ provider: "facebook", id: "GuerraCampalMMA/posts/pfbid02AbC123xyz" });
    expect(parseEmbedUrl("https://m.facebook.com/guerra.campal/videos/1234567890123/")).toEqual({ provider: "facebook", id: "guerra.campal/videos/1234567890123" });
    expect(parseEmbedUrl("https://www.facebook.com/guerra.campal/videos/la-pelea-estelar/1234567890123/")).toEqual({ provider: "facebook", id: "guerra.campal/videos/1234567890123" });
    expect(parseEmbedUrl("https://www.facebook.com/watch/?v=1234567890123&mibextid=x")).toEqual({ provider: "facebook", id: "watch/1234567890123" });
    expect(parseEmbedUrl("https://web.facebook.com/reel/1234567890123")).toEqual({ provider: "facebook", id: "reel/1234567890123" });
    expect(parseEmbedUrl("https://www.facebook.com/share/p/1AbCdEfGh/")).toEqual({ provider: "facebook", id: "share/p/1AbCdEfGh" });
    expect(parseEmbedUrl("https://www.facebook.com/share/v/1AbCdEfGh/")).toEqual({ provider: "facebook", id: "share/v/1AbCdEfGh" });
  });

  it("rejects Facebook pages, groups and anything that is not one post or video", () => {
    expect(parseEmbedUrl("https://www.facebook.com/GuerraCampalMMA")).toBeNull();
    expect(parseEmbedUrl("https://www.facebook.com/groups/123/posts/456")).toBeNull();
    expect(parseEmbedUrl("https://www.facebook.com/watch/?v=abc")).toBeNull();
    expect(parseEmbedUrl("https://www.facebook.com/plugins/posts/123")).toBeNull();
    expect(parseEmbedUrl("https://facebook.com.evil.cl/x/posts/123")).toBeNull();
  });

  it("tolerates surrounding whitespace and a missing scheme", () => {
    expect(parseEmbedUrl("  youtu.be/dQw4w9WgXcQ \n")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
  });

  it("rejects other sites and malformed links", () => {
    expect(parseEmbedUrl("https://example.com")).toBeNull();
    expect(parseEmbedUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseEmbedUrl("https://www.youtube.com/watch")).toBeNull();
    expect(parseEmbedUrl("https://www.youtube.com/watch?v=corto")).toBeNull();
    expect(parseEmbedUrl("https://www.instagram.com/showboxpromotions/")).toBeNull();
    expect(parseEmbedUrl("https://www.tiktok.com/@gc")).toBeNull();
    expect(parseEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(parseEmbedUrl("")).toBeNull();
    expect(parseEmbedUrl("no es un link")).toBeNull();
  });

  it("does not accept look-alike hosts", () => {
    expect(parseEmbedUrl("https://youtube.com.evil.cl/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseEmbedUrl("https://notyoutu.be/dQw4w9WgXcQ")).toBeNull();
    expect(parseEmbedUrl("https://user@www.instagram.com/p/C8abc123/")).toBeNull();
  });
});

describe("embedSrc", () => {
  it("uses the no-cookie domain for YouTube", () => {
    expect(embedSrc({ provider: "youtube", id: "dQw4w9WgXcQ" })).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("builds the Instagram and TikTok embed urls", () => {
    expect(embedSrc({ provider: "instagram", id: "C8abc123" })).toBe("https://www.instagram.com/p/C8abc123/embed");
    expect(embedSrc({ provider: "tiktok", id: "7412345678901234567" })).toBe("https://www.tiktok.com/embed/v2/7412345678901234567");
  });

  it("uses the Facebook video plugin for videos and reels and the post plugin for posts", () => {
    expect(embedSrc({ provider: "facebook", id: "watch/1234567890123" })).toBe(
      "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890123&show_text=false",
    );
    expect(embedSrc({ provider: "facebook", id: "reel/1234567890123" })).toContain("/plugins/video.php?");
    expect(embedSrc({ provider: "facebook", id: "share/v/1AbCdEfGh" })).toContain("/plugins/video.php?");
    expect(embedSrc({ provider: "facebook", id: "GuerraCampalMMA/posts/pfbid02AbC" })).toBe(
      "https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FGuerraCampalMMA%2Fposts%2Fpfbid02AbC&show_text=true",
    );
  });

  it("starts the YouTube video on its own when asked (after the visitor taps play)", () => {
    expect(embedSrc({ provider: "youtube", id: "dQw4w9WgXcQ" }, { autoplay: true })).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1");
  });
});

describe("embedCanonicalUrl", () => {
  it("gives the public link of each network", () => {
    expect(embedCanonicalUrl({ provider: "youtube", id: "dQw4w9WgXcQ" })).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(embedCanonicalUrl({ provider: "instagram", id: "C8abc123" })).toBe("https://www.instagram.com/p/C8abc123/");
    expect(embedCanonicalUrl({ provider: "tiktok", id: "7412345678901234567" })).toBe("https://www.tiktok.com/@/video/7412345678901234567");
    expect(embedCanonicalUrl({ provider: "facebook", id: "watch/1234567890123" })).toBe("https://www.facebook.com/watch/?v=1234567890123");
    expect(embedCanonicalUrl({ provider: "facebook", id: "GuerraCampalMMA/posts/pfbid02AbC" })).toBe("https://www.facebook.com/GuerraCampalMMA/posts/pfbid02AbC");
  });
});

describe("youtubeThumbnailUrl", () => {
  it("points to the video still on YouTube's image host (no cookies)", () => {
    expect(youtubeThumbnailUrl("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});

describe("isVerticalEmbed", () => {
  it("is true for Instagram, TikTok and Facebook posts, false for YouTube and Facebook videos", () => {
    expect(isVerticalEmbed({ provider: "instagram", id: "C8abc123" })).toBe(true);
    expect(isVerticalEmbed({ provider: "tiktok", id: "7412345678901234567" })).toBe(true);
    expect(isVerticalEmbed({ provider: "facebook", id: "GuerraCampalMMA/posts/pfbid02AbC" })).toBe(true);
    expect(isVerticalEmbed({ provider: "facebook", id: "watch/1234567890123" })).toBe(false);
    expect(isVerticalEmbed({ provider: "youtube", id: "dQw4w9WgXcQ" })).toBe(false);
  });
});

describe("embedFromAttrs", () => {
  it("accepts the attributes of a stored embed node and nothing that is not exactly a network and an id", () => {
    expect(embedFromAttrs({ provider: "youtube", id: "dQw4w9WgXcQ" })).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(embedFromAttrs({ provider: "tiktok", id: "7412345678901234567", extra: "ignorado" })).toEqual({ provider: "tiktok", id: "7412345678901234567" });
    expect(embedFromAttrs({ provider: "facebook", id: "watch/1234567890123" })).toEqual({ provider: "facebook", id: "watch/1234567890123" });
    expect(embedFromAttrs({ provider: "facebook", id: "123" })).toBeNull();
    expect(embedFromAttrs({ provider: "facebook", id: "x/posts/1/../../evil" })).toBeNull();
    expect(embedFromAttrs({ provider: "vimeo", id: "123" })).toBeNull();
    expect(embedFromAttrs({ provider: "youtube", id: "dQw4w9WgXcQ/../x" })).toBeNull();
    expect(embedFromAttrs({ provider: "youtube" })).toBeNull();
    expect(embedFromAttrs(null)).toBeNull();
    expect(embedFromAttrs("youtube")).toBeNull();
  });
});
