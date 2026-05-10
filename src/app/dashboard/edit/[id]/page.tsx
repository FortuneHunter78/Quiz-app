"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

interface QuestionData {
  text: string;
  imageUrl: string;
  type: QuestionType;
  options: string[];
  correctOptions: number[];
}

export default function EditQuizPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams() as { id: string };

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [timeLimit, setTimeLimit] = useState(15);
  const [rules, setRules] = useState("casual");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated" || !params.id) return;

    const loadQuiz = async () => {
      try {
        setLoadingQuiz(true);
        const response = await fetch(`/api/quizzes/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          setLoadError(data.error || "Не удалось загрузить квиз");
          return;
        }

        setTitle(data.title || "");
        setCategory(data.category || "");
        setTimeLimit(data.timeLimit || 15);
        setRules(data.rules || "casual");
        setQuestions(
          (data.questions || []).map((question: any) => ({
            text: question.text || "",
            imageUrl: question.imageUrl || "",
            type: question.type || "SINGLE_CHOICE",
            options: (question.options || []).map((option: any) => option.text || ""),
            correctOptions: (question.options || [])
              .map((option: any, index: number) => (option.isCorrect ? index : -1))
              .filter((index: number) => index !== -1),
          })) || []
        );
      } catch (error) {
        setLoadError("Ошибка при загрузке квиза");
      } finally {
        setLoadingQuiz(false);
      }
    };

    loadQuiz();
  }, [status, params.id, router]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "",
        imageUrl: "",
        type: "SINGLE_CHOICE",
        options: ["", "", "", ""],
        correctOptions: [0],
      },
    ]);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionData, value: string) => {
    const newQuestions = [...questions];
    if (field === "text" || field === "imageUrl" || field === "type") {
      newQuestions[index][field] = value as any;
    }

    if (field === "type") {
      newQuestions[index].correctOptions = [0];
    }

    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = text;
    setQuestions(newQuestions);
  };

  const handleCorrectOptionChange = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    const q = newQuestions[qIndex];

    if (q.type === "SINGLE_CHOICE") {
      q.correctOptions = [oIndex];
    } else if (q.correctOptions.includes(oIndex)) {
      q.correctOptions = q.correctOptions.filter((idx) => idx !== oIndex);
      if (q.correctOptions.length === 0) q.correctOptions = [0];
    } else {
      q.correctOptions.push(oIndex);
    }

    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title) {
      alert("Введите название квиза");
      return;
    }

    try {
      const response = await fetch(`/api/quizzes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, timeLimit, rules, questions }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Ошибка при сохранении квиза");
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating quiz:", error);
      alert("Ошибка при соединении с сервером");
    }
  };

  if (status === "loading" || loadingQuiz) {
    return <div className="flex h-screen items-center justify-center">Загрузка...</div>;
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-3">Не удалось открыть квиз</h1>
          <p className="text-slate-600 mb-6">{loadError}</p>
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">Вернуться в панель</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8 pt-6">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Редактировать квиз</h1>
            <p className="text-slate-500 mt-1">Организатор: {session?.user?.name}</p>
          </div>
          <Link href="/dashboard">
            <Button className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-50">Назад</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Название Квиза</label>
              <Input
                type="text"
                placeholder="Например: История Древнего Рима, Frontend для начинающих..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-medium h-14 bg-slate-50 border-slate-300 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Категория</label>
              <Input
                type="text"
                placeholder="Например: IT, История, Развлечения"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 bg-slate-50 border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Время на ответ (сек)</label>
              <Input
                type="number"
                min={5}
                max={120}
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 15)}
                className="h-12 bg-slate-50 border-slate-300"
              />
            </div>
            <div className="md:col-span-2 mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight">Правила проведения (Режим)</label>
              <select
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full h-12 px-3 rounded-md bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="casual">Обычный (Casual)</option>
                <option value="strict">Строгий (Strict) - без пересдач</option>
                <option value="learning">Обучающий (Learning) - с подсказками</option>
              </select>
            </div>
          </div>

          <div className="space-y-8">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="p-6 border-2 border-slate-200 bg-white rounded-2xl relative shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <h3 className="font-extrabold text-xl text-slate-800">Вопрос {qIndex + 1}</h3>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIndex)}
                      className="text-red-500 font-semibold hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded"
                    >
                      Удалить
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-2">Текст вопроса *</label>
                    <Input
                      type="text"
                      placeholder="Введите вопрос..."
                      value={q.text}
                      onChange={(e) => handleQuestionChange(qIndex, "text", e.target.value)}
                      className="text-lg bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Тип ответа</label>
                    <select
                      className="w-full h-12 px-3 text-sm rounded-md border-2 border-slate-300 bg-slate-50 hover:bg-white text-slate-800 font-medium focus:ring-blue-500 focus:border-blue-500"
                      value={q.type}
                      onChange={(e) => handleQuestionChange(qIndex, "type", e.target.value)}
                    >
                      <option value="SINGLE_CHOICE">Одиночный выбор</option>
                      <option value="MULTIPLE_CHOICE">Множественный выбор (несколько правильных)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Ссылка на картинку (опционально)</label>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={q.imageUrl}
                      onChange={(e) => handleQuestionChange(qIndex, "imageUrl", e.target.value)}
                      className="h-12 bg-slate-50"
                    />
                  </div>
                  {q.imageUrl && (
                    <div className="md:col-span-2 flex justify-center bg-slate-100 p-4 border rounded-xl">
                      <img src={q.imageUrl} alt="preview" className="max-h-60 object-contain rounded-md shadow" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-600 border-t pt-4">Варианты ответов <span className="font-normal text-slate-400 ml-2">(отметьте галочкой правильные)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center bg-slate-50 border-2 border-slate-200 rounded-lg p-2 hover:border-blue-300 transition-colors">
                        <input
                          type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                          name={`correct-option-${qIndex}`}
                          checked={q.correctOptions.includes(oIndex)}
                          onChange={() => handleCorrectOptionChange(qIndex, oIndex)}
                          className="mx-3 w-6 h-6 border-slate-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Отметить как правильный"
                        />
                        <Input
                          type="text"
                          placeholder={`Вариант ${oIndex + 1}`}
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                          className="border-none shadow-none focus-visible:ring-0 px-2 h-10 font-medium bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-6 border-t font-semibold">
            <Button type="button" onClick={handleAddQuestion} className="bg-slate-200 hover:bg-slate-300 text-slate-700 h-14 px-6 text-lg">
              + Добавить вопрос
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-14 px-10 text-lg shadow-md text-white font-bold ml-auto">
              Сохранить изменения
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}