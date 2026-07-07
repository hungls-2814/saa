import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("renders an <img> with the given avatarUrl when non-empty", () => {
    const { container } = render(
      <Avatar name="Huỳnh Dương Xuân" avatarUrl="https://i.pravatar.cc/150?u=xuan" />,
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://i.pravatar.cc/150?u=xuan");
  });

  it("renders the initials fallback when avatarUrl is empty", () => {
    const { container } = render(<Avatar name="Huỳnh Dương Xuân" avatarUrl="" />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("HX")).toBeInTheDocument();
  });

  it("falls back to initials when the image fails to load", () => {
    const { container } = render(
      <Avatar name="Huỳnh Dương Xuân" avatarUrl="https://i.pravatar.cc/150?u=broken" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("HX")).toBeInTheDocument();
  });

  it("uses a decorative empty alt so the nearby name text is the accessible label", () => {
    const { container } = render(
      <Avatar name="Huỳnh Dương Xuân" avatarUrl="https://i.pravatar.cc/150?u=xuan" />,
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
