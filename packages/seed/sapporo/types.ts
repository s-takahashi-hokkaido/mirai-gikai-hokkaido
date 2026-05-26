import type { Database } from "@mirai-gikai/supabase";

export type BillStatusEnum =
  Database["public"]["Enums"]["bill_status_enum"];

export type ScrapedBill = {
  billNumber: string;
  billType: "bill" | "consultation";
  name: string;
  submittedDate: string | null;
  resolvedDate: string | null;
  result: string;
  pdfUrl: string | null;
};

export type SessionConfig = {
  slug: string;
  name: string;
  billListUrl: string;
};
