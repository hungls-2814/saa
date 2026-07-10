import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { IntroGate } from "./intro-gate";

const mockReplace = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

describe("IntroGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("redirects / to /prelaunch when the intro has not been seen this tab", () => {
    mockPathname = "/";
    render(<IntroGate />);
    expect(mockReplace).toHaveBeenCalledWith("/prelaunch");
  });

  it("does NOT redirect when the sessionStorage flag is set (already seen this tab)", () => {
    sessionStorage.setItem("saa_intro_done", "1");
    mockPathname = "/";
    render(<IntroGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("only gates the home route — leaves /prelaunch alone", () => {
    mockPathname = "/prelaunch";
    render(<IntroGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not hijack deep routes", () => {
    mockPathname = "/kudos";
    render(<IntroGate />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does NOT redirect a preview reviewer (previewActive) — the escape hatch is preserved", () => {
    mockPathname = "/";
    render(<IntroGate previewActive />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders nothing", () => {
    mockPathname = "/prelaunch";
    const { container } = render(<IntroGate />);
    expect(container).toBeEmptyDOMElement();
  });
});
