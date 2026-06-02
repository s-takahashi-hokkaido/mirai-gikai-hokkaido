import type { Database } from "@mirai-gikai/supabase";

export type BillStatusEnum =
  Database["public"]["Enums"]["bill_status_enum"];

export type ScrapedBill = {
  billNumber: string;
  billType: "bill" | "consultation" | "opinion" | "petition" | "appeal" | "report";
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
  gijirokuYear: number;
};

export type SpeakerType = "questioner" | "answerer" | "chairperson";

export type SpeechBlock = {
  speakerType: SpeakerType;
  speakerName: string;
  speakerRole?: string;
  text: string;
};

export type DiscussionGroup = {
  questionerName: string;
  billNumbers: string[];
  speeches: SpeechBlock[];
};

export type MeetingEntry = {
  sessionName: string;
  date: string;
  dayNumber: string;
  fino: string;
};
