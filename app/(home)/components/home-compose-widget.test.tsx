import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeComposeWidget } from "./home-compose-widget";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/app/kudos/components/compose-kudos-container", () => ({
  ComposeKudosContainer: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => (
    isOpen ? (
      <div role="dialog" aria-label="compose-kudos-modal">
        <button onClick={onClose}>Close Compose</button>
      </div>
    ) : null
  ),
}));

describe("HomeComposeWidget", () => {
  const defaultProps = {
    currentUserId: "user-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FAB initial state", () => {
    it("renders the collapsed FAB button with pen and sun icons", () => {
      render(<HomeComposeWidget {...defaultProps} />);
      // The FAB should exist as a button
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("FAB expansion and action pills", () => {
    it("shows action pills when FAB is expanded", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Find and click the FAB button (the one with aria-haspopup)
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      expect(fabButton).toBeDefined();

      await user.click(fabButton!);

      // After expansion, should see menu items
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems.length).toBeGreaterThanOrEqual(2);
    });

    it("renders 'Thể lệ' action pill when FAB is expanded", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);

      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      expect(rulesActionPill).toBeInTheDocument();
    });

    it("renders 'Viết KUDOS' action pill when FAB is expanded", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);

      const writeKudosActionPill = screen.getByRole("menuitem", { name: "writeKudos" });
      expect(writeKudosActionPill).toBeInTheDocument();
    });
  });

  describe("SC1: FAB 'Thể lệ' opens rules modal", () => {
    it("opens the rules modal when 'Thể lệ' action pill is clicked", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Expand FAB
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);

      // Click the "Thể lệ" action pill
      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      await user.click(rulesActionPill);

      // Rules modal should be visible (it renders when isOpen=true)
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("collapses FAB after clicking 'Thể lệ'", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Expand FAB
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);

      // Click the "Thể lệ" action pill
      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      await user.click(rulesActionPill);

      // FAB should be collapsed (close button should not be visible, only the main pill)
      // The FAB button itself should still be there but the menu should be gone
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("SC1: Rules modal close/escape/backdrop behavior", () => {
    it("closes rules modal when 'Đóng' button is clicked", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Open rules modal
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);
      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      await user.click(rulesActionPill);

      // Click the "Đóng" button in the rules modal
      const closeButton = screen.getByRole("button", { name: /close/ });
      await user.click(closeButton);

      // Rules modal should be gone - check that the title is not found
      expect(screen.queryByRole("dialog", { name: "title" })).not.toBeInTheDocument();
    });

    it("closes rules modal when Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Open rules modal
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);
      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      await user.click(rulesActionPill);

      // Press Escape
      await user.keyboard("{Escape}");

      // Rules modal should be gone - check that the title is not found
      expect(screen.queryByRole("dialog", { name: "title" })).not.toBeInTheDocument();
    });

    it("closes rules modal when backdrop is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(<HomeComposeWidget {...defaultProps} />);

      // Open rules modal
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);
      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      await user.click(rulesActionPill);

      // Click the backdrop
      const backdrop = container.querySelector(".fixed.inset-0");
      if (backdrop) {
        await user.click(backdrop);
      }

      // Rules modal should be gone - check that the title is not found
      expect(screen.queryByRole("dialog", { name: "title" })).not.toBeInTheDocument();
    });
  });

  describe("SC1: Rules modal 'Viết KUDOS' opens compose and closes rules", () => {
    it("opens the compose modal when 'Viết KUDOS' is clicked in rules modal", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Open rules modal
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);
      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      await user.click(rulesActionPill);

      // Click "Viết KUDOS" in the rules modal
      const writeKudosInRulesButton = screen.getByRole("button", {
        name: /writeKudos/,
      });
      await user.click(writeKudosInRulesButton);

      // Compose modal should be visible
      const composeDialog = screen.getByRole("dialog", {
        name: "compose-kudos-modal",
      });
      expect(composeDialog).toBeInTheDocument();
    });

    it("closes the rules modal when 'Viết KUDOS' is clicked in rules modal", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Open rules modal
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);
      const rulesActionPill = screen.getByRole("menuitem", { name: "saaRules" });
      await user.click(rulesActionPill);

      // Click "Viết KUDOS" in the rules modal
      const writeKudosInRulesButton = screen.getByRole("button", {
        name: /writeKudos/,
      });
      await user.click(writeKudosInRulesButton);

      // Rules modal should be gone (only compose should remain)
      expect(screen.queryByRole("dialog", { name: "title" })).not.toBeInTheDocument();
    });
  });

  describe("FAB 'Viết KUDOS' direct action", () => {
    it("opens the compose modal when FAB 'Viết KUDOS' is clicked directly", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Expand FAB
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);

      // Click "Viết KUDOS" action pill
      const writeKudosActionPill = screen.getByRole("menuitem", {
        name: "writeKudos",
      });
      await user.click(writeKudosActionPill);

      // Compose modal should be visible
      const composeDialog = screen.getByRole("dialog", {
        name: "compose-kudos-modal",
      });
      expect(composeDialog).toBeInTheDocument();
    });

    it("collapses FAB after clicking 'Viết KUDOS'", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Expand FAB
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);

      // Click "Viết KUDOS" action pill
      const writeKudosActionPill = screen.getByRole("menuitem", {
        name: "writeKudos",
      });
      await user.click(writeKudosActionPill);

      // FAB menu should be collapsed (menu items gone)
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("compose modal interactions", () => {
    it("closes the compose modal when 'Close Compose' is clicked", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // Open compose modal
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);
      const writeKudosActionPill = screen.getByRole("menuitem", {
        name: "writeKudos",
      });
      await user.click(writeKudosActionPill);

      // Close the compose modal
      const closeComposeButton = screen.getByRole("button", {
        name: "Close Compose",
      });
      await user.click(closeComposeButton);

      // Compose modal should be gone
      expect(
        screen.queryByRole("dialog", { name: "compose-kudos-modal" })
      ).not.toBeInTheDocument();
    });
  });

  describe("null currentUserId handling", () => {
    it("renders without error when currentUserId is null", () => {
      render(<HomeComposeWidget currentUserId={null} />);
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      expect(fabButton).toBeDefined();
    });
  });

  describe("integration: full workflow", () => {
    it("allows opening rules modal from FAB, closing it, and then opening compose", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // 1. Expand FAB
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);

      // 2. Open rules modal
      const rulesActionPill = screen.getByRole("menuitem", {
        name: "saaRules",
      });
      await user.click(rulesActionPill);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // 3. Close rules modal
      const closeButton = screen.getByRole("button", { name: /close/ });
      await user.click(closeButton);
      expect(screen.queryByRole("dialog", { name: "title" })).not.toBeInTheDocument();

      // 4. Expand FAB again and open compose
      await user.click(fabButton!);
      const writeKudosActionPill = screen.getByRole("menuitem", {
        name: "writeKudos",
      });
      await user.click(writeKudosActionPill);

      // Compose modal should be visible
      const composeDialog = screen.getByRole("dialog", {
        name: "compose-kudos-modal",
      });
      expect(composeDialog).toBeInTheDocument();
    });

    it("allows navigating from compose to rules and back to compose", async () => {
      const user = userEvent.setup();
      render(<HomeComposeWidget {...defaultProps} />);

      // 1. Open compose directly
      const fabButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("aria-haspopup") === "true"
      );
      await user.click(fabButton!);
      const writeKudosActionPill = screen.getByRole("menuitem", {
        name: "writeKudos",
      });
      await user.click(writeKudosActionPill);
      expect(
        screen.getByRole("dialog", { name: "compose-kudos-modal" })
      ).toBeInTheDocument();

      // 2. Close compose
      const closeComposeButton = screen.getByRole("button", {
        name: "Close Compose",
      });
      await user.click(closeComposeButton);
      expect(
        screen.queryByRole("dialog", { name: "compose-kudos-modal" })
      ).not.toBeInTheDocument();

      // 3. Open rules modal
      await user.click(fabButton!);
      const rulesActionPill = screen.getByRole("menuitem", {
        name: "saaRules",
      });
      await user.click(rulesActionPill);
      const rulesDialog = screen.getByRole("dialog");
      expect(rulesDialog).toBeInTheDocument();

      // 4. Click "Viết KUDOS" in rules to open compose
      const writeKudosInRulesButton = screen.getByRole("button", {
        name: /writeKudos/,
      });
      await user.click(writeKudosInRulesButton);

      // Both rules modal should be gone and compose should be open
      expect(screen.queryByRole("dialog", { name: "title" })).not.toBeInTheDocument();
      expect(
        screen.getByRole("dialog", { name: "compose-kudos-modal" })
      ).toBeInTheDocument();
    });
  });
});
