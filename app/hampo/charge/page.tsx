"use client";

import { HampoChargeDialog } from "../../components/hampo-charge-dialog";

export default function HampoChargePage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#f5f3ff" }}>
      <HampoChargeDialog
        open
        onClose={() => {
          window.close();
          window.location.replace("/");
        }}
      />
    </main>
  );
}
