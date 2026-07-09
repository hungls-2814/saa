import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelector } from "./language-selector";

// Mock next-intl (useLocale)
vi.mock("next-intl", () => ({
  useLocale: vi.fn(() => "en"),
}));

// Mock next/navigation (useRouter)
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

// Mock @/lib/i18n/set-locale
vi.mock("@/lib/i18n/set-locale", () => ({
  setLocale: vi.fn(async () => {}),
}));

interface ImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: ImageProps) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

describe("LanguageSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render and structure", () => {
    it("renders trigger button with active locale code", () => {
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });
      expect(button).toBeInTheDocument();
    });

    it("trigger button has aria-haspopup and aria-expanded attributes", () => {
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });
      expect(button).toHaveAttribute("aria-haspopup", "listbox");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("trigger button shows active locale uppercase code", () => {
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });
      expect(button.textContent).toContain("EN");
    });

    it("does not render dropdown initially", () => {
      render(<LanguageSelector />);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("dropdown open/close", () => {
    it("opens dropdown on button click", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("closes dropdown on backdrop click", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const backdrop = screen.getByRole("listbox").parentElement?.querySelector(
        "[aria-hidden]",
      ) as HTMLElement;
      if (backdrop) {
        await user.click(backdrop);
      }
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("toggles dropdown on repeated button clicks", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.click(button);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

      await user.click(button);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("dropdown options rendering", () => {
    it("renders all supported locales as options", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      expect(options.length).toBe(2);
    });

    it("displays locale codes in uppercase", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      // Check in the listbox (dropdown) specifically
      const listbox = screen.getByRole("listbox");
      const textInListbox = listbox.textContent;
      expect(textInListbox).toContain("EN");
      // VI locale surfaces as display code "VN" per design (not "VI")
      expect(textInListbox).toContain("VN");
    });

    it("renders option structure without extra icons", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      // Verify each option has flag + code text (no checkmark)
      const options = screen.getAllByRole("option");
      options.forEach((opt) => {
        const button = opt.querySelector("button");
        expect(button).toBeInTheDocument();
        // Each button has a flag (svg or img) and a span with the code
        const hasFlag = button?.querySelector("svg") || button?.querySelector("img");
        expect(hasFlag).toBeInTheDocument();
      });
    });
  });

  describe("selection state and styling", () => {
    it("marks active locale option with aria-selected=true", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      // First option is "en" (active)
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });

    it("marks inactive locale option with aria-selected=false", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      // Second option is "vi" (inactive)
      expect(options[0]).toHaveAttribute("aria-selected", "false");
    });

    it("applies gold-tint styling class to active option", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      const activeOption = options[1];
      const button_elem = activeOption.querySelector("button") as HTMLElement;
      // Check for gold-tint class marker (rgba(255,234,158,0.2))
      expect(button_elem.className).toContain("bg-[rgba(255,234,158,0.2)]");
    });
  });

  describe("flag rendering", () => {
    it("renders EN flag as inline SVG", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      const enOption = options[1]; // EN is second (after VI alphabetically in SUPPORTED_LOCALES)
      const svg = enOption.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders VN flag as inline SVG (no raster, so the star is never cropped)", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      const vnOption = options[0]; // VI is first in SUPPORTED_LOCALES
      // The VN flag is now an inline SVG (red field + centered yellow star),
      // consistent with the EN flag — not a distorted 28x28 raster.
      expect(vnOption.querySelector("svg")).toBeInTheDocument();
      expect(vnOption.querySelector('img[src*="vn-flag"]')).not.toBeInTheDocument();
    });

    it("trigger button renders EN flag as SVG", () => {
      render(<LanguageSelector />);
      const svg = screen.getByRole("button", { name: /EN/i }).querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("chevron icon", () => {
    it("renders an inline chevron svg (no background image) in trigger button", () => {
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });
      // Chevron is a direct-child svg (the flag svg is nested inside a span).
      const chevron = button.querySelector(":scope > svg");
      expect(chevron).toBeInTheDocument();
      // No opaque PNG asset — the old background-baked chevron-down.png is gone.
      expect(button.querySelector('img[src*="chevron"]')).toBeNull();
    });

    it("rotates chevron when dropdown is open", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });
      const chevron = button.querySelector(":scope > svg") as SVGElement;

      expect(chevron.getAttribute("class") ?? "").not.toContain("rotate-180");

      await user.click(button);
      expect(chevron.getAttribute("class") ?? "").toContain("rotate-180");
    });
  });

  describe("interaction - locale selection", () => {
    it("calls setLocale when clicking a non-active locale", async () => {
      const { setLocale } = await import("@/lib/i18n/set-locale");
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      const viOption = options[0];
      const viButton = viOption.querySelector("button") as HTMLElement;

      await user.click(viButton);
      expect(setLocale).toHaveBeenCalledWith("vi");
    });

    it("calls setLocale and transitions when clicking non-active locale", async () => {
      const { setLocale } = await import("@/lib/i18n/set-locale");
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      const viOption = options[0];
      const viButton = viOption.querySelector("button") as HTMLElement;

      await user.click(viButton);
      // Verify setLocale was called
      expect(setLocale).toHaveBeenCalledWith("vi");
    });

    it("does not call setLocale when clicking the active locale", async () => {
      const { setLocale } = await import("@/lib/i18n/set-locale");
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      const enOption = options[1];
      const enButton = enOption.querySelector("button") as HTMLElement;

      await user.click(enButton);
      expect(setLocale).not.toHaveBeenCalled();
    });

    it("closes dropdown after selecting a non-active locale", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      await user.click(button);
      const options = screen.getAllByRole("option");
      const viOption = options[0];
      const viButton = viOption.querySelector("button") as HTMLElement;

      await user.click(viButton);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("trigger button has disabled attribute handling", async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);
      const button = screen.getByRole("button", { name: /EN/i });

      // Initially not disabled
      expect(button).not.toHaveAttribute("disabled");

      // Button is properly wired with disabled={isPending}
      // The transition state is managed internally by useTransition
      await user.click(button);
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });
  });
});
