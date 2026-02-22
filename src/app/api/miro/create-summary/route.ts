import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type ChatMessageInput = {
  role: "user" | "ai";
  content: string;
  linkedCardTitle: string | null;
};

type QuizResultInput = {
  cardTitle: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

type TextResponseInput = {
  cardTitle: string;
  prompt: string;
  response: string;
};

const CONCEPT_COLORS = [
  "yellow",
  "light_green",
  "cyan",
  "light_pink",
  "light_yellow",
  "orange",
] as const;

const SECTION_WIDTH = 600;

async function postSticky(
  boardId: string,
  headers: Record<string, string>,
  opts: {
    content: string;
    shape?: "square" | "rectangle";
    fillColor?: string;
    textAlign?: string;
    x: number;
    y: number;
    width: number;
  },
) {
  await fetch(`https://api.miro.com/v2/boards/${boardId}/sticky_notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: { content: opts.content, shape: opts.shape ?? "square" },
      style: {
        fillColor: opts.fillColor ?? "yellow",
        textAlign: opts.textAlign ?? "left",
      },
      position: { x: opts.x, y: opts.y, origin: "center" },
      geometry: { width: opts.width },
    }),
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("miro_token")?.value ?? process.env.MIRO_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const {
    topicTitle,
    keyPoints,
    chatMessages = [],
    quizResults = [],
    textResponses = [],
  } = (await request.json()) as {
    topicTitle: string;
    keyPoints: string[];
    chatMessages?: ChatMessageInput[];
    quizResults?: QuizResultInput[];
    textResponses?: TextResponseInput[];
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // 1. Create board
  const boardRes = await fetch("https://api.miro.com/v2/boards", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `Sprout — ${topicTitle}`,
      description: "Auto-generated learning summary by Sprout AI tutor",
    }),
  });

  if (!boardRes.ok) {
    const err = await boardRes.text();
    return NextResponse.json({ error: err }, { status: boardRes.status });
  }

  const board = (await boardRes.json()) as { id: string; viewLink: string };
  const boardId = board.id;

  let currentY = -700;

  // 2. Title sticky
  await postSticky(boardId, headers, {
    content: `<strong>${topicTitle}</strong>`,
    shape: "rectangle",
    fillColor: "yellow",
    textAlign: "center",
    x: 0,
    y: currentY,
    width: SECTION_WIDTH,
  });
  currentY += 200;

  // 3. Key Concepts section
  await postSticky(boardId, headers, {
    content: "<strong>📚 KEY CONCEPTS</strong>",
    shape: "rectangle",
    fillColor: "cyan",
    textAlign: "center",
    x: 0,
    y: currentY,
    width: SECTION_WIDTH,
  });
  currentY += 150;

  const cols = 3;
  const spacingX = 280;
  const spacingY = 260;
  const offsetX = -((cols - 1) * spacingX) / 2;
  const keyRows = Math.ceil(keyPoints.length / cols);

  for (let i = 0; i < keyPoints.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    await postSticky(boardId, headers, {
      content: keyPoints[i],
      shape: "square",
      fillColor: CONCEPT_COLORS[i % CONCEPT_COLORS.length],
      x: offsetX + col * spacingX,
      y: currentY + row * spacingY,
      width: 240,
    });
  }
  currentY += keyRows * spacingY + 120;

  // 4. Chat Q&A section — pair each user message with the next AI reply
  const userMessages = chatMessages.filter((m) => m.role === "user");
  if (userMessages.length > 0) {
    await postSticky(boardId, headers, {
      content: "<strong>💬 YOUR QUESTIONS &amp; AI ANSWERS</strong>",
      shape: "rectangle",
      fillColor: "orange",
      textAlign: "center",
      x: 0,
      y: currentY,
      width: SECTION_WIDTH,
    });
    currentY += 150;

    for (let i = 0; i < chatMessages.length; i++) {
      if (chatMessages[i].role !== "user") continue;
      const msg = chatMessages[i];
      const nextAI = chatMessages.slice(i + 1).find((m) => m.role === "ai");

      const questionLabel = msg.linkedCardTitle
        ? `<strong>${msg.linkedCardTitle}</strong>\n${msg.content}`
        : msg.content;

      // User question (left)
      await postSticky(boardId, headers, {
        content: questionLabel,
        shape: "square",
        fillColor: "light_pink",
        x: -210,
        y: currentY,
        width: 380,
      });

      // AI answer (right)
      if (nextAI?.content) {
        await postSticky(boardId, headers, {
          content: nextAI.content,
          shape: "square",
          fillColor: "light_green",
          x: 210,
          y: currentY,
          width: 380,
        });
      }

      currentY += 310;
    }
    currentY += 80;
  }

  // 5. Quiz Results section
  if (quizResults.length > 0) {
    await postSticky(boardId, headers, {
      content: "<strong>✅ QUIZ RESULTS</strong>",
      shape: "rectangle",
      fillColor: "light_yellow",
      textAlign: "center",
      x: 0,
      y: currentY,
      width: SECTION_WIDTH,
    });
    currentY += 150;

    for (const quiz of quizResults) {
      // Question (left, wide)
      await postSticky(boardId, headers, {
        content: `<strong>${quiz.cardTitle}</strong>\n${quiz.question}`,
        shape: "square",
        fillColor: "yellow",
        x: -110,
        y: currentY,
        width: 500,
      });

      // Result (right, narrow)
      const resultContent = quiz.isCorrect
        ? `<strong>✓ Correct</strong>\n${quiz.selectedAnswer}`
        : `<strong>✗ Incorrect</strong>\nYou: ${quiz.selectedAnswer}\nCorrect: ${quiz.correctAnswer}`;
      await postSticky(boardId, headers, {
        content: resultContent,
        shape: "square",
        fillColor: quiz.isCorrect ? "light_green" : "light_pink",
        x: 265,
        y: currentY,
        width: 270,
      });

      currentY += 320;
    }
    currentY += 80;
  }

  // 6. Written Reflections section
  if (textResponses.length > 0) {
    await postSticky(boardId, headers, {
      content: "<strong>✍️ YOUR WRITTEN REFLECTIONS</strong>",
      shape: "rectangle",
      fillColor: "cyan",
      textAlign: "center",
      x: 0,
      y: currentY,
      width: SECTION_WIDTH,
    });
    currentY += 150;

    for (const text of textResponses) {
      await postSticky(boardId, headers, {
        content: `<strong>${text.cardTitle}</strong>\n\n${text.response}`,
        shape: "rectangle",
        fillColor: "light_yellow",
        x: 0,
        y: currentY,
        width: SECTION_WIDTH,
      });
      currentY += 380;
    }
  }

  const embedUrl = `https://miro.com/app/live-embed/${boardId}/`;
  return NextResponse.json({ boardId, embedUrl, viewLink: board.viewLink });
}
