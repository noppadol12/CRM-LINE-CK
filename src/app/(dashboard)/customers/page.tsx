import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { Button } from "@/components/ui/button";
import { CustomersSection, CustomersSectionSkeleton } from "./customers-section";

export const metadata: Metadata = { title: "ลูกค้า · CK CRM" };

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <>
      <PageHeader
        title="ลูกค้า"
        description="รายชื่อลูกค้าทั้งหมดจาก LINE OA และที่เพิ่มเอง"
        actions={
          <CustomerFormDialog
            trigger={
              <Button>
                <Plus />
                เพิ่มลูกค้า
              </Button>
            }
          />
        }
      />
      <Suspense fallback={<CustomersSectionSkeleton />}>
        <CustomersSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}
