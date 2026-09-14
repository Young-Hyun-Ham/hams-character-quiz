import { TossPaymentFailPage as SharedTossPaymentFailPage } from "@hams-fam/sso-client/payments/react";

function safeReturnTo(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export default async function TossPaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <SharedTossPaymentFailPage
      message={typeof params.message === "string" ? params.message : "카드 결제가 취소되었거나 실패했습니다."}
      orderId={typeof params.orderId === "string" ? params.orderId : undefined}
      loginReturnUrl={safeReturnTo(params.returnTo)}
    />
  );
}
