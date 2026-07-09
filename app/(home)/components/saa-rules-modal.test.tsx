import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaaRulesModal } from "./saa-rules-modal";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("SaaRulesModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onWriteKudos: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("visibility", () => {
    it("returns null when isOpen is false (nothing rendered)", () => {
      const { container } = render(<SaaRulesModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders the dialog when isOpen is true", () => {
      render(<SaaRulesModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("content structure", () => {
    it("renders the title (Rules.title)", () => {
      render(<SaaRulesModal {...defaultProps} />);
      // next-intl is mocked to echo the key; asserts the title key is wired.
      expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    });

    it("renders the four hero badge images with alt text", () => {
      render(<SaaRulesModal {...defaultProps} />);
      expect(screen.getByAltText("New Hero")).toBeInTheDocument();
      expect(screen.getByAltText("Rising Hero")).toBeInTheDocument();
      expect(screen.getByAltText("Super Hero")).toBeInTheDocument();
      expect(screen.getByAltText("Legend Hero")).toBeInTheDocument();
    });

    it("renders the six collectible icon images with alt text", () => {
      render(<SaaRulesModal {...defaultProps} />);
      expect(screen.getByAltText("REVIVAL")).toBeInTheDocument();
      expect(screen.getByAltText("TOUCH OF LIGHT")).toBeInTheDocument();
      expect(screen.getByAltText("STAY GOLD")).toBeInTheDocument();
      expect(screen.getByAltText("FLOW TO HORIZON")).toBeInTheDocument();
      expect(screen.getByAltText("BEYOND THE BOUNDARY")).toBeInTheDocument();
      expect(screen.getByAltText("ROOT FURTHER")).toBeInTheDocument();
    });

    it("renders the collectible icon labels", () => {
      render(<SaaRulesModal {...defaultProps} />);
      expect(screen.getByText("REVIVAL")).toBeInTheDocument();
      expect(screen.getByText("TOUCH OF LIGHT")).toBeInTheDocument();
      expect(screen.getByText("STAY GOLD")).toBeInTheDocument();
      expect(screen.getByText("FLOW TO HORIZON")).toBeInTheDocument();
      expect(screen.getByText("BEYOND THE BOUNDARY")).toBeInTheDocument();
      expect(screen.getByText("ROOT FURTHER")).toBeInTheDocument();
    });

    it("renders both footer buttons (close + writeKudos)", () => {
      render(<SaaRulesModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: /close/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /writeKudos/ })).toBeInTheDocument();
    });

    it("renders the three main sections: hero tiers, icon grid, and national kudos", () => {
      render(<SaaRulesModal {...defaultProps} />);
      // next-intl mocked to echo keys → asserts each section heading key is wired.
      expect(screen.getByText("receiversHeading")).toBeInTheDocument();
      expect(screen.getByText("sendersHeading")).toBeInTheDocument();
      expect(screen.getByText("nationalHeading")).toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("calls onClose when 'Đóng' button is clicked", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<SaaRulesModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole("button", { name: /close/ }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("calls onWriteKudos when 'Viết KUDOS' button is clicked", async () => {
      const onWriteKudos = vi.fn();
      const user = userEvent.setup();
      render(<SaaRulesModal {...defaultProps} onWriteKudos={onWriteKudos} />);

      await user.click(screen.getByRole("button", { name: /writeKudos/ }));
      expect(onWriteKudos).toHaveBeenCalledOnce();
    });

    it("calls onClose when Escape key is pressed", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<SaaRulesModal {...defaultProps} onClose={onClose} />);

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("calls onClose when backdrop (outside the modal) is clicked", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <SaaRulesModal {...defaultProps} onClose={onClose} />
      );

      // Click the backdrop (the outer div with the semi-transparent background)
      const backdrop = container.querySelector(".fixed");
      if (backdrop) {
        await user.click(backdrop);
      }
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not call onClose when clicking inside the modal content", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<SaaRulesModal {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole("dialog");
      await user.click(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("dialog accessibility", () => {
    it("has the correct aria-labelledby pointing to the title", () => {
      render(<SaaRulesModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "saa-rules-title");
    });

    it("has aria-modal set to true", () => {
      render(<SaaRulesModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("edge cases", () => {
    it("can transition from isOpen=false to isOpen=true", () => {
      const { rerender } = render(<SaaRulesModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(<SaaRulesModal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("can transition from isOpen=true to isOpen=false", () => {
      const { rerender } = render(<SaaRulesModal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      rerender(<SaaRulesModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("handles rapid button clicks without errors", async () => {
      const onClose = vi.fn();
      const onWriteKudos = vi.fn();
      const user = userEvent.setup();
      render(
        <SaaRulesModal {...defaultProps} onClose={onClose} onWriteKudos={onWriteKudos} />
      );

      await user.click(screen.getByRole("button", { name: /close/ }));
      await user.click(screen.getByRole("button", { name: /close/ })); // Should not error
      expect(onClose.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
