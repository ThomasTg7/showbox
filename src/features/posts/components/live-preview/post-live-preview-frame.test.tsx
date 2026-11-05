// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_POST_BODY } from "@/domain/post-body";
import { buildLivePreviewPost, LIVE_PREVIEW_MESSAGE, LIVE_PREVIEW_READY } from "../../live-preview";
import { PostLivePreviewFrame } from "./post-live-preview-frame";

vi.mock("@/components/site/header", () => ({ Header: () => null }));
vi.mock("../post-article", () => ({ PostArticle: ({ post }: { post: { title: string } }) => <h1>{post.title}</h1> }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("live preview handshake", () => {
  it("requests its content again if the parent missed the first ready message, and stops after receiving it", () => {
    vi.useFakeTimers();
    const send = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
    render(<PostLivePreviewFrame shareUrl="https://ofl.example/noticias" />);
    expect(send).toHaveBeenCalledWith({ type: LIVE_PREVIEW_READY }, window.location.origin);
    act(() => vi.advanceTimersByTime(1000));
    expect(send.mock.calls.length).toBeGreaterThan(1);
    const post = buildLivePreviewPost({ title: "Noticia ShowBox", excerpt: "", categoryId: "", categories: [], cover: null, gallery: [], body: EMPTY_POST_BODY, media: {}, publication: { status: "draft", publishAt: null }, now: new Date() });
    act(() => window.dispatchEvent(new MessageEvent("message", { origin: window.location.origin, source: window.parent, data: { type: LIVE_PREVIEW_MESSAGE, post } })));
    expect(screen.getByRole("heading", { name: "Noticia ShowBox" })).toBeVisible();
    const calls = send.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(send).toHaveBeenCalledTimes(calls);
  });
});
