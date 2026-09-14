import { redirect } from "next/navigation";

export default function AbcCatalogPage() {
  redirect("/catalog?world=abc");
}
