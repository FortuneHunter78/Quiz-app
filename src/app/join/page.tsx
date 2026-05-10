"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function JoinQuiz() {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    try {
      const res = await fetch(`/api/quizzes/code/${roomId.trim()}`);
      const data = await res.json();

      if (res.ok) {
        router.push(`/quiz/${roomId.trim()}`);
      } else {
        setError(data.error || "Квиз не найден");
      }
    } catch {
      router.push(`/quiz/${roomId.trim()}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
      <div className="w-full max-w-md p-8 border border-slate-200 rounded-xl shadow-lg bg-white">
        <h1 className="text-3xl font-extrabold text-center text-slate-800 mb-6">Присоединиться к игре</h1>
        
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 text-red-600 border border-red-100 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="roomId" className="block text-sm font-semibold text-slate-600 mb-2 text-center uppercase tracking-wide">
              Введите код комнаты
            </label>
            <Input
              id="roomId"
              type="text"
              placeholder="e.g. 123456"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="text-center text-3xl font-mono tracking-[0.2em] font-bold text-blue-600 uppercase h-16 border-2 border-slate-300 focus:border-blue-500 rounded-lg shadow-sm"
              maxLength={6}
              autoComplete="off"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full text-lg h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest" 
            disabled={roomId.trim().length !== 6}
          >
            Войти в класс
          </Button>
        </form>
      </div>
    </div>
  );
}