import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerDetailView, CustomerDetailSkeleton } from "./customer-detail";

export const metadata: Metadata = { title: "รายละเอียดลูกค้า · CK CRM" };

export default function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <Suspense fallback={<CustomerDetailSkeleton />}>
      <CustomerDetailView params={params} />
    </Suspense>
  );
}
