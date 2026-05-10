"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  quizId: number;
};

export function QuizCardActions({ quizId }: Props) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm("Удалить квиз? Это действие нельзя отменить.");
    if (!confirmed) return;

    const response = await fetch(`/api/quizzes/${quizId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error || "Не удалось удалить квиз");
      return;
    }

    router.refresh();
  };

  return (
    <div className="flex gap-3">
      <Link href={`/dashboard/edit/${quizId}`} className="flex-1">
        <Button className="w-full bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200">
          Редактировать
        </Button>
      </Link>
      <Button
        type="button"
        onClick={handleDelete}
        className="flex-1 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
      >
        Удалить
      </Button>
    </div>
  );
}