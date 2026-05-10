import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function OrganizerHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const runs = await prisma.quizRun.findMany({
    where: {
      quiz: {
        creator: {
          email: session.user.email,
        },
      },
    },
    include: {
      quiz: {
        select: {
          title: true,
          code: true,
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">История проведения квизов</h1>
            <p className="text-slate-500 mt-1">Организатор: {session.user.name}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard">
              <Button className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-50">Панель квизов</Button>
            </Link>
            <Link href="/">
              <Button className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-50">На главную</Button>
            </Link>
          </div>
        </header>

        {runs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold mb-2">Пока нет завершённых запусков</h2>
            <p className="text-slate-500 mb-6">Запустите хотя бы один квиз, чтобы увидеть историю его проведения.</p>
            <Link href="/dashboard">
              <Button className="bg-blue-600">Перейти к квизам</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                  <th className="p-4 border-b font-semibold">Название квиза</th>
                  <th className="p-4 border-b font-semibold">Код комнаты</th>
                  <th className="p-4 border-b font-semibold">Начало</th>
                  <th className="p-4 border-b font-semibold">Завершение</th>
                  <th className="p-4 border-b font-semibold text-right">Участники</th>
                  <th className="p-4 border-b font-semibold text-right">Лучший результат</th>
                  <th className="p-4 border-b font-semibold">Победитель</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-medium text-slate-800">{run.quiz.title}</td>
                    <td className="p-4 font-mono text-slate-500">{run.quiz.code}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(run.startedAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4 text-slate-500">
                      {run.finishedAt
                        ? new Date(run.finishedAt).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Не завершён"}
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-700">{run.participantCount}</td>
                    <td className="p-4 text-right font-extrabold text-blue-600">{run.topScore}</td>
                    <td className="p-4 text-slate-700">{run.winnerName || "Нет данных"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}