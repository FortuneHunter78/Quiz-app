import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { SignOutButton } from "@/components/ui/SignOutButton";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h1 className="text-5xl font-bold mb-4 text-black dark:text-zinc-50">Quiz App</h1>
      <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-lg">
        Добро пожаловать в Quiz App! Создавайте и участвуйте в увлекательных викторинах, соревнуйтесь с друзьями и делитесь своими результатами. Начните прямо сейчас!
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
        <Link 
          href="/join" 
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition flex items-center justify-center"
        >
          Присоединиться к квизу
        </Link>
        <Link 
          href="/create-quiz" 
          className="px-6 py-3 bg-white dark:bg-black text-blue-600 font-semibold border-2 border-blue-600 rounded-lg shadow-sm hover:bg-blue-50 dark:hover:bg-zinc-800 transition flex items-center justify-center"
        >
          Создать квиз
        </Link>
      </div>

      <div className="mt-16 text-lg text-slate-600">
        {session ? (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-4 bg-slate-50 border p-4 rounded-xl shadow-sm w-full max-w-sm">
              <span className="font-semibold text-slate-800">Привет, {session.user?.name}!</span>
              <span className="w-px h-6 bg-slate-300"></span>
              <SignOutButton />
            </div>
            
            <div className="flex flex-col gap-3 text-center">
              <Link 
                href="/history" 
                className="text-green-600 hover:text-green-800 hover:underline font-medium transition text-lg"
              >
                🏆 Моя история участия →
              </Link>
              <Link 
                href="/dashboard" 
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition text-lg"
              >
                📝 Перейти в панель организатора →
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="hover:underline hover:text-blue-600 transition">Вход</Link>
            <span className="text-slate-300">|</span>
            <Link href="/register" className="hover:underline hover:text-blue-600 transition">Регистрация</Link>
          </div>
        )}
      </div>
    </main>
  );
}