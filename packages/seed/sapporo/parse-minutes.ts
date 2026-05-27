import type { DiscussionGroup, MeetingEntry, SpeechBlock } from "./types";

const QUESTIONER_LINE_RE = /^◆(.+?)議員/;
const ANSWERER_LINE_RE =
  /^◎((?:副市長|市長|教育長|事務局長|[^\s（]+局長))（(.+?)）/;
const CHAIRPERSON_LINE_RE = /^○(?:議長|副議長)（/;

export function htmlToText(html: string): string {
  return html
    .replace(/<BR\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractBillNumbers(text: string): string[] {
  const matches = [...text.matchAll(/議案第(\d+)号/g)];
  const numbers = matches.map((m) => m[1]);
  return [...new Set(numbers)];
}

export function extractParty(text: string): string | null {
  const match = text.match(
    /(?:自由民主党議員会|民主市民連合|公明党議員会|日本共産党|日本維新の会[^、]*議員会|市民ネットワーク北海道)(?=[をに]代表)/
  );
  return match ? match[0] : null;
}

export function countExchanges(speeches: SpeechBlock[]): number {
  let count = 0;
  let lastWasQuestion = false;
  for (const s of speeches) {
    if (s.speakerType === "questioner") {
      lastWasQuestion = true;
    } else if (s.speakerType === "answerer" && lastWasQuestion) {
      count++;
      lastWasQuestion = false;
    }
  }
  return Math.max(count, 1);
}

export function parseMinutes(text: string): SpeechBlock[] {
  const lines = text.split("\n");
  const blocks: SpeechBlock[] = [];

  let currentBlock: SpeechBlock | null = null;
  let currentLines: string[] = [];

  function flushBlock() {
    if (currentBlock) {
      currentBlock.text = currentLines.join("\n").trim();
      if (currentBlock.text.length > 0) {
        blocks.push(currentBlock);
      }
    }
    currentBlock = null;
    currentLines = [];
  }

  for (const line of lines) {
    const trimmed = line.replace(/^\s+/, "").replace(/\s+$/, "");

    if (CHAIRPERSON_LINE_RE.test(trimmed)) {
      flushBlock();
      currentBlock = {
        speakerType: "chairperson",
        speakerName: "議長",
        text: "",
      };
      currentLines = [trimmed.replace(/^○(?:議長|副議長)（.+?）\s*/, "")];
      continue;
    }

    const questionerMatch = trimmed.match(QUESTIONER_LINE_RE);
    if (questionerMatch) {
      flushBlock();
      const name = questionerMatch[1];
      const rest = trimmed.replace(/^◆.+?議員\s*/, "");
      currentBlock = {
        speakerType: "questioner",
        speakerName: name,
        text: "",
      };
      currentLines = [rest];
      continue;
    }

    const answererMatch = trimmed.match(ANSWERER_LINE_RE);
    if (answererMatch) {
      flushBlock();
      const role = answererMatch[1];
      const name = answererMatch[2];
      const rest = trimmed.replace(/^◎.+?（.+?）\s*/, "");
      currentBlock = {
        speakerType: "answerer",
        speakerName: name,
        speakerRole: role,
        text: "",
      };
      currentLines = [rest];
      continue;
    }

    if (currentBlock) {
      currentLines.push(trimmed);
    }
  }

  flushBlock();
  return blocks;
}

export function groupIntoDiscussions(
  speeches: SpeechBlock[]
): DiscussionGroup[] {
  const groups: DiscussionGroup[] = [];
  let currentGroup: DiscussionGroup | null = null;
  let currentSpeeches: SpeechBlock[] = [];
  let currentQuestioner: string | null = null;

  function flushGroup() {
    if (currentGroup && currentSpeeches.length > 0) {
      const questionText = currentSpeeches
        .filter((s) => s.speakerType === "questioner")
        .map((s) => s.text)
        .join("\n");
      currentGroup.billNumbers = extractBillNumbers(questionText);
      currentGroup.speeches = currentSpeeches;
      groups.push(currentGroup);
    }
    currentGroup = null;
    currentSpeeches = [];
  }

  for (const speech of speeches) {
    if (speech.speakerType === "chairperson") continue;

    if (speech.speakerType === "questioner") {
      if (speech.speakerName !== currentQuestioner) {
        flushGroup();
        currentQuestioner = speech.speakerName;
        currentGroup = {
          questionerName: speech.speakerName,
          billNumbers: [],
          speeches: [],
        };
      }
    }

    if (currentGroup) {
      currentSpeeches.push(speech);
    }
  }

  flushGroup();
  return groups;
}

export function parseMeetingList(html: string): MeetingEntry[] {
  const entries: MeetingEntry[] = [];
  const text = htmlToText(html);

  const linkRe = new RegExp(
    "FINO=(\\d+).*?UNID=(\\w+).*?(\\d{2})月(\\d{2})日-(\\d{2})号",
    "g"
  );
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(html)) !== null) {
    const fino = match[1];
    const month = match[3];
    const day = match[4];
    const dayNumber = match[5];

    entries.push({
      sessionName: "",
      date: `${month}月${day}日`,
      dayNumber,
      fino,
    });
  }

  return entries;
}
