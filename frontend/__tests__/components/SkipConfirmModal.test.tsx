// ============================================================
// SkipConfirmModal.test.tsx
// Tests that SkipConfirmModal:
//  - renders with default skip i18n text
//  - renders with custom title/message/confirmLabel overrides
//  - calls onConfirm and onCancel callbacks correctly
// ============================================================

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SkipConfirmModal from "@/components/ui/SkipConfirmModal";

// Minimal i18n provider mock
jest.mock("@/i18n/provider", () => ({
  useT: () => (key: string, vars?: Record<string, string>) => {
    const map: Record<string, string> = {
      "skip.title": "Skip Phase?",
      "skip.message": `Skip {phase} phase?`,
      "skip.confirm": "Yes, Skip",
      "skip.cancel": "Cancel",
    };
    let result = map[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        result = result.replace(`{${k}}`, v);
      }
    }
    return result;
  },
}));

// framer-motion: render children immediately
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const defaultProps = {
  open: true,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  phaseName: "Relaxation",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SkipConfirmModal — default (skip) text", () => {
  it("renders the default skip title", () => {
    render(<SkipConfirmModal {...defaultProps} />);
    expect(screen.getByText("Skip Phase?")).toBeTruthy();
  });

  it("renders the default message with phase name interpolated", () => {
    render(<SkipConfirmModal {...defaultProps} />);
    expect(screen.getByText("Skip Relaxation phase?")).toBeTruthy();
  });

  it("renders the default confirm label", () => {
    render(<SkipConfirmModal {...defaultProps} />);
    expect(screen.getByText("Yes, Skip")).toBeTruthy();
  });

  it("renders the cancel button", () => {
    render(<SkipConfirmModal {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeTruthy();
  });
});

describe("SkipConfirmModal — custom props (data confirm)", () => {
  const customProps = {
    ...defaultProps,
    title: "Konfirmasi Data",
    message: "Apakah data sudah tersimpan dengan benar?",
    confirmLabel: "Ya, Lanjutkan",
  };

  it("renders the custom title", () => {
    render(<SkipConfirmModal {...customProps} />);
    expect(screen.getByText("Konfirmasi Data")).toBeTruthy();
  });

  it("renders the custom message", () => {
    render(<SkipConfirmModal {...customProps} />);
    expect(
      screen.getByText("Apakah data sudah tersimpan dengan benar?")
    ).toBeTruthy();
  });

  it("renders the custom confirm button label", () => {
    render(<SkipConfirmModal {...customProps} />);
    expect(screen.getByText("Ya, Lanjutkan")).toBeTruthy();
  });
});

describe("SkipConfirmModal — interactions", () => {
  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = jest.fn();
    render(<SkipConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Yes, Skip"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(<SkipConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not render when open is false", () => {
    render(<SkipConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Skip Phase?")).toBeNull();
  });
});
