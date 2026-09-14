"use client";

import { HampoChargeModal } from "@hams-fam/sso-client/payments/react";
import { useEffect, useState } from "react";
import "./hampo-charge-dialog.css";

export function HampoChargeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [returnTo, setReturnTo] = useState("/");

  useEffect(() => {
    if (!open) return;
    setReturnTo(`${window.location.pathname}${window.location.search}`);
    const controller = new AbortController();
    void fetch("/api/auth/hampo", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { hampoBalance?: number };
        if (typeof payload.hampoBalance === "number") setCurrentBalance(payload.hampoBalance);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [open]);

  if (!open) return null;
  return (
    <HampoChargeModal
      currentBalance={currentBalance}
      initialAmount={10}
      payment={{
        createOrderEndpoint: "/api/payments/toss/orders",
        createOrderBody: (hampoAmount) => ({ hampoAmount }),
        successPath: "/payments/toss/success",
        failPath: "/payments/toss/fail",
        loginReturnUrl: returnTo,
      }}
      onCharged={(balance) => {
        setCurrentBalance(balance);
        window.dispatchEvent(
          new CustomEvent("hampo-balance-changed", { detail: { balance } }),
        );
      }}
      onClose={onClose}
    />
  );
}
