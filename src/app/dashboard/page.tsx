import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { QuizCardActions } from "@/components/dashboard/QuizCardActions";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const quizzes = await prisma.quiz.findMany({
    where: {
      creator: {
        email: session.user.email,
      },
    },
    include: {
      _count: {
        select: { questions: true, sessions: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Мои Квизы</h1>
            <p className="text-slate-500 mt-1">Организатор: {session.user.name}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-50">На главную</Button>
            </Link>
            <Link href="/dashboard/history">
              <Button className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-50">История квизов</Button>
            </Link>
            <Link href="/create-quiz">
              <Button className="bg-blue-600 hover:bg-blue-700">Создать новый</Button>
            </Link>
          </div>
        </header>

        {quizzes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold mb-2">У вас пока нет квизов</h2>
            <p className="text-slate-500 mb-6">Создайте свой первый квиз, чтобы начать игру с друзьями!</p>
            <Link href="/create-quiz">
              <Button className="bg-blue-600">Создать квиз</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition">
                <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1" title={quiz.title}>{quiz.title}</h3>
                
                <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Код комнаты</span>
                  <span className="font-mono text-xl font-bold text-blue-600 tracking-widest">{quiz.code}</span>
                </div>

                <div className="flex justify-between text-sm text-slate-600 mb-6">
                  <span>Вопросов: {quiz._count.questions}</span>
                  <span>Сессий: {quiz._count.sessions}</span>
                </div>

                <div className="mt-auto">
                  <div className="mb-3">
                    <QuizCardActions quizId={quiz.id} />
                  </div>
                  <Link href={`/quiz/${quiz.code}?host=true`} className="w-full">
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                      Запустить квиз
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}