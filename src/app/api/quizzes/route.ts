import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quizzes = await prisma.quiz.findMany({
    where: {
      creator: {
        email: session.user.email
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json(quizzes);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, category, timeLimit, rules, questions } = body;

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newQuiz = await prisma.quiz.create({
      data: {
        title,
        code,
        category,
        timeLimit: timeLimit || 15,
        rules,
        creatorId: user.id,
        questions: {
          create: questions.map((q: any) => ({
            text: q.text,
            type: q.type || 'SINGLE_CHOICE',
            imageUrl: q.imageUrl || null,
            options: {
              create: q.options.map((optText: string, index: number) => ({
                text: optText,
                isCorrect: q.correctOptions ? q.correctOptions.includes(index) : index === q.correctOption
              }))
            }
          }))
        }
      }
    });

    return NextResponse.json({ message: "Quiz created successfully", quizCode: newQuiz.code });
  } catch (error) {
    console.error("Error creating quiz:", error);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}