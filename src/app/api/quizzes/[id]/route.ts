import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

async function loadQuizById(identifier: string) {
  return prisma.quiz.findUnique({
    where: { id: Number(identifier) },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const identifier = (await params).id;
    const quiz = await loadQuizById(identifier);

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("Fetch quiz error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = (await params).id;
    const existingQuiz = await loadQuizById(identifier);

    if (!existingQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (existingQuiz.creatorId) {
      const owner = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!owner || owner.id !== existingQuiz.creatorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { title, category, timeLimit, rules, questions } = body;

    const updatedQuiz = await prisma.$transaction(async (tx) => {
      await tx.option.deleteMany({
        where: {
          question: {
            quizId: existingQuiz.id,
          },
        },
      });

      await tx.question.deleteMany({
        where: { quizId: existingQuiz.id },
      });

      return tx.quiz.update({
        where: { id: existingQuiz.id },
        data: {
          title,
          category,
          timeLimit: timeLimit || 15,
          rules,
          questions: {
            create: questions.map((q: any) => ({
              text: q.text,
              type: q.type || "SINGLE_CHOICE",
              imageUrl: q.imageUrl || null,
              options: {
                create: q.options.map((optText: string, index: number) => ({
                  text: optText,
                  isCorrect: q.correctOptions ? q.correctOptions.includes(index) : index === q.correctOption,
                })),
              },
            })),
          },
        },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ message: "Quiz updated successfully", quiz: updatedQuiz });
  } catch (error) {
    console.error("Update quiz error:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = (await params).id;
    const existingQuiz = await loadQuizById(identifier);

    if (!existingQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const owner = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!owner || owner.id !== existingQuiz.creatorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userQuizSession.deleteMany({ where: { quizId: existingQuiz.id } });
      await tx.quizRun.deleteMany({ where: { quizId: existingQuiz.id } });

      const questionIds = existingQuiz.questions.map((question: any) => question.id);
      if (questionIds.length > 0) {
        await tx.option.deleteMany({
          where: {
            questionId: { in: questionIds },
          },
        });

        await tx.question.deleteMany({
          where: { id: { in: questionIds } },
        });
      }

      await tx.quiz.delete({ where: { id: existingQuiz.id } });
    });

    return NextResponse.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}