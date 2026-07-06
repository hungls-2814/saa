/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveSection } from "./use-active-section";

describe("useActiveSection", () => {
  const slugs = ["top-talent", "top-project", "best-manager"];

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { hash: "" } as any;

    // Mock IntersectionObserver as a proper constructor
    class MockIntersectionObserver {
      callback: any;
      constructor(callback: any) {
        this.callback = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    global.IntersectionObserver = MockIntersectionObserver as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with first slug as active when no hash present", () => {
    const { result } = renderHook(() => useActiveSection(slugs));
    expect(result.current.active).toBe("top-talent");
  });

  it("honors URL hash on mount for deep-link support", () => {
    // Mock getElementById and scrollIntoView
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as any;

    vi.spyOn(document, "getElementById").mockReturnValue(mockElement);
    window.location.hash = "#best-manager";

    const { result } = renderHook(() => useActiveSection(slugs));

    expect(result.current.active).toBe("best-manager");
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("ignores invalid hash that is not in slugs array", () => {
    window.location.hash = "#invalid-slug";

    const { result } = renderHook(() => useActiveSection(slugs));
    expect(result.current.active).toBe("top-talent"); // Falls back to first
  });

  it("scrollTo sets active slug immediately and smooth-scrolls", () => {
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as any;

    vi.spyOn(document, "getElementById").mockReturnValue(mockElement);

    const { result } = renderHook(() => useActiveSection(slugs));

    act(() => {
      result.current.scrollTo("best-manager");
    });

    expect(result.current.active).toBe("best-manager");
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("sets up IntersectionObserver for scroll-spy", () => {
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as any;

    vi.spyOn(document, "getElementById").mockReturnValue(mockElement);
    const intersectionObserverSpy = vi.spyOn(global, "IntersectionObserver" as any);

    renderHook(() => useActiveSection(slugs));

    // IntersectionObserver should be called once (the setup call)
    expect(intersectionObserverSpy).toHaveBeenCalled();
    intersectionObserverSpy.mockRestore();
  });

  it("IntersectionObserver callback updates active when section crosses viewport", () => {
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as any;

    vi.spyOn(document, "getElementById").mockReturnValue(mockElement);

    let observerCallback: any;
    class MockIntersectionObserverWithCallback {
      callback: any;
      constructor(callback: any) {
        this.callback = callback;
        observerCallback = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    global.IntersectionObserver = MockIntersectionObserverWithCallback as any;

    const { result } = renderHook(() => useActiveSection(slugs));

    // Simulate intersection entry
    const mockEntry = {
      isIntersecting: true,
      target: { id: "best-manager" },
      boundingClientRect: { top: 100 },
    } as any;

    act(() => {
      observerCallback([mockEntry]);
    });

    expect(result.current.active).toBe("best-manager");
  });

  it("disconnects observer on unmount", () => {
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as any;

    vi.spyOn(document, "getElementById").mockReturnValue(mockElement);
    const disconnectSpy = vi.fn();

    class MockIntersectionObserverForDisconnect {
      callback: any;
      constructor(callback: any) {
        this.callback = callback;
      }
      observe = vi.fn();
      disconnect = disconnectSpy;
      unobserve = vi.fn();
    }
    global.IntersectionObserver = MockIntersectionObserverForDisconnect as any;

    const { unmount } = renderHook(() => useActiveSection(slugs));
    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("handles empty slugs array gracefully", () => {
    const { result } = renderHook(() => useActiveSection([]));
    expect(result.current.active).toBe("");
  });
});
