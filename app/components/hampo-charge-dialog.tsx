"use client";

import { useEffect, useRef } from "react";
import "./hampo-charge-dialog.css";

export function HampoChargeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={dialogRef} className="hampo-charge-dialog" onCancel={onClose}>
      <div className="hampo-dialog-header">
        <span className="brand-mark">
          <b>C</b>
        </span>
        <h1>함포 충전</h1>
      </div>
      <p>
        카드 결제 연동 준비 중입니다...
        <br />
        이용에 불편을 드려 죄송합니다.
      </p>
      <button type="button" onClick={onClose}>
        확인
      </button>
    </dialog>
  );
}
