import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function History() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const userId = (session.user as any)?.id;
  const userRole = (session.user as any)?.role;

  const sessions = await prisma.userQuizSession.findMany({
    where: {
      userId: parseInt(userId),
    },
    include: {
      quiz: {
        select: { title: true, code: true }
      }
    },
    orderBy: {
      joinedAt: 'desc'
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">История Участия</h1>
            <p className="text-slate-500 mt-1">Игрок: {session.user.name}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-50">На главную</Button>
            </Link>
            {userRole === "ORGANIZER" && (
              <Link href="/dashboard">
                <Button className="bg-indigo-600 hover:bg-indigo-700">Мои Квизы</Button>
              </Link>
            )}
            <Link href="/join">
              <Button className="bg-green-600 hover:bg-green-700">Войти в квиз</Button>
            </Link>
          </div>
        </header>

        {sessions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-xl font-semibold mb-2">Вы еще не участвовали в квизах</h2>
            <p className="text-slate-500 mb-6">Присоединитесь к своей первой игре по коду комнаты!</p>
            <Link href="/join">
              <Button className="bg-green-600">Присоединиться</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                  <th className="p-4 border-b font-semibold">Название Квиза</th>
                  <th className="p-4 border-b font-semibold">Код комнаты</th>
                  <th className="p-4 border-b font-semibold">Дата</th>
                  <th className="p-4 border-b font-semibold text-right">Набрано очков</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-medium text-slate-800">{sess.quiz.title}</td>
                    <td className="p-4 font-mono text-slate-500">{sess.quiz.code}</td>
                    <td className="p-4 text-slate-500">{new Date(sess.joinedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-4 text-right font-extrabold text-blue-600">{sess.score}</td>
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