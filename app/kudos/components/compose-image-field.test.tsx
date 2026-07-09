import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComposeImageField, type ComposeKudosImage } from "./compose-image-field";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("ComposeImageField", () => {
  const mockOnAddImage = vi.fn();
  const mockOnRemoveImage = vi.fn();
  const errorId = "image-error";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploading state", () => {
    it("renders a spinner with role=status when uploading:true", () => {
      const images: ComposeKudosImage[] = [
        { id: "uploading-1", url: "", uploading: true },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const spinner = screen.getByRole("status");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute("aria-label", "imageUploading");
    });

    it("hides the remove button when uploading:true", () => {
      const images: ComposeKudosImage[] = [
        { id: "uploading-1", url: "", uploading: true },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      // Should have no remove button
      const removeButtons = screen.queryAllByRole("button", {
        name: /imageLabel/,
      });
      expect(removeButtons).toHaveLength(0);
    });

    it("renders multiple uploading spinners without remove buttons", () => {
      const images: ComposeKudosImage[] = [
        { id: "uploading-1", url: "", uploading: true },
        { id: "uploading-2", url: "", uploading: true },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const spinners = screen.getAllByRole("status");
      expect(spinners).toHaveLength(2);
    });
  });

  describe("completed upload state", () => {
    it("renders an img element when url is set and uploading is false", () => {
      const images: ComposeKudosImage[] = [
        { id: "img-1", url: "https://example.com/image.jpg", uploading: false },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const img = document.querySelector('img[src="https://example.com/image.jpg"]') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("renders a remove button when url is set and uploading is false", async () => {
      const user = userEvent.setup();
      const images: ComposeKudosImage[] = [
        { id: "img-1", url: "https://example.com/image.jpg" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const removeButton = screen.getByRole("button", { name: /imageLabel 1/ });
      expect(removeButton).toBeInTheDocument();
      await user.click(removeButton);
      expect(mockOnRemoveImage).toHaveBeenCalledWith("img-1");
    });
  });

  describe("placeholder state", () => {
    it("renders a numbered placeholder when url is empty string and not uploading", () => {
      const images: ComposeKudosImage[] = [
        { id: "placeholder-1", url: "" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("renders numbered placeholders for multiple empty images", () => {
      const images: ComposeKudosImage[] = [
        { id: "placeholder-1", url: "" },
        { id: "placeholder-2", url: "" },
        { id: "placeholder-3", url: "" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows a remove button for empty placeholder", async () => {
      const user = userEvent.setup();
      const images: ComposeKudosImage[] = [
        { id: "placeholder-1", url: "" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const removeButton = screen.getByRole("button", { name: /imageLabel 1/ });
      expect(removeButton).toBeInTheDocument();
      await user.click(removeButton);
      expect(mockOnRemoveImage).toHaveBeenCalledWith("placeholder-1");
    });
  });

  describe("add image button", () => {
    it("renders the add image button when below max images (5)", () => {
      const images: ComposeKudosImage[] = [
        { id: "img-1", url: "https://example.com/image.jpg" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const addButton = screen.getByRole("button", { name: /imageAdd/ });
      expect(addButton).toBeInTheDocument();
    });

    it("hides the add image button when at max images (5)", () => {
      const images: ComposeKudosImage[] = [
        { id: "img-1", url: "https://example.com/1.jpg" },
        { id: "img-2", url: "https://example.com/2.jpg" },
        { id: "img-3", url: "https://example.com/3.jpg" },
        { id: "img-4", url: "https://example.com/4.jpg" },
        { id: "img-5", url: "https://example.com/5.jpg" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const addButton = screen.queryByRole("button", { name: /imageAdd/ });
      expect(addButton).not.toBeInTheDocument();
    });

    it("calls onAddImage when add button is clicked", async () => {
      const user = userEvent.setup();
      const images: ComposeKudosImage[] = [];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const addButton = screen.getByRole("button", { name: /imageAdd/ });
      await user.click(addButton);
      expect(mockOnAddImage).toHaveBeenCalled();
    });
  });

  describe("mixed states", () => {
    it("renders a mix of uploading, completed, and empty images with correct indices", () => {
      const images: ComposeKudosImage[] = [
        { id: "uploading-1", url: "", uploading: true },
        { id: "img-1", url: "https://example.com/1.jpg" },
        { id: "placeholder-1", url: "" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      // First should be spinner
      const spinner = screen.getByRole("status");
      expect(spinner).toBeInTheDocument();
      // Second should be img
      const img = document.querySelector('img[src="https://example.com/1.jpg"]') as HTMLImageElement;
      expect(img).toBeTruthy();
      // Third should be placeholder with "3"
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("handles removing items from mixed states correctly", async () => {
      const user = userEvent.setup();
      const images: ComposeKudosImage[] = [
        { id: "uploading-1", url: "", uploading: true },
        { id: "img-1", url: "https://example.com/1.jpg" },
        { id: "placeholder-1", url: "" },
      ];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      // Remove the completed image (index 1, which is "Image Label 2")
      const removeButton = screen.getByRole("button", { name: /imageLabel 2/ });
      await user.click(removeButton);
      expect(mockOnRemoveImage).toHaveBeenCalledWith("img-1");
    });
  });

  describe("error handling", () => {
    it("renders error message when error prop is provided", () => {
      const images: ComposeKudosImage[] = [];
      const errorMessage = "Too many images";
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
          error={errorMessage}
        />
      );
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("renders empty error alert when no error", () => {
      const images: ComposeKudosImage[] = [];
      render(
        <ComposeImageField
          images={images}
          onAddImage={mockOnAddImage}
          onRemoveImage={mockOnRemoveImage}
          errorId={errorId}
        />
      );
      const errorAlert = screen.getByRole("alert");
      expect(errorAlert).toHaveTextContent("");
    });
  });
});
