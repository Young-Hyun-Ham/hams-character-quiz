import { TossPaymentSuccessPage as SharedTossPaymentSuccessPage } from "@hams-fam/sso-client/payments/react";

function safeReturnTo(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export default async function TossPaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  return (
    <SharedTossPaymentSuccessPage
      paymentKey={value("paymentKey")}
      orderId={value("orderId")}
      amount={value("amount")}
      loginReturnUrl={safeReturnTo(params.returnTo)}
    />
  );
}
