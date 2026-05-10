"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";

export default function QuizRoom() {
  const { roomId } = useParams() as { roomId: string };
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "true";
  const router = useRouter();
  const { data: session } = useSession();
  
  const { socket, isConnected } = useSocket();
  const [hasJoined, setHasJoined] = useState(false);
  const [players, setPlayers] = useState<{username: string, score: number, userId?: number}[]>([]);
  const [myUsername, setMyUsername] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinWaiting, setJoinWaiting] = useState(false);
  
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedMultipleOptions, setSelectedMultipleOptions] = useState<number[]>([]);
  const [hasSubmittedMultiple, setHasSubmittedMultiple] = useState(false);
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [allConfirmed, setAllConfirmed] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [currentRuleMode, setCurrentRuleMode] = useState<string>("casual");
  const [correctAnswers, setCorrectAnswers] = useState<{ id: number; text: string }[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (socket && isConnected) {
      let username = session?.user?.name || myUsername;
      const userId = (session?.user as any)?.id;

      if (!username) {
        username = `Player_${Math.floor(Math.random() * 1000)}`;
      }
      setMyUsername(username);
      
      if (!hasJoined) {
        socket.emit("join_quiz", { roomId, username, userId, isHost }, (response: any) => {
          if (response?.ok) {
            setHasJoined(true);
            setJoinError("");
            setJoinWaiting(false);
            console.log(`Sent join_quiz event for room: ${roomId}`);
          } else if (response?.code === "NOT_STARTED") {
            setJoinWaiting(true);
            setJoinError("");
          } else if (response?.message) {
            setJoinWaiting(false);
            setJoinError(response.message);
          }
        });
      }
    }
  }, [socket, isConnected, roomId, hasJoined, myUsername, session]);

  useEffect(() => {
    if (!socket || !isConnected || hasJoined || isHost || !joinWaiting) return;

    const retry = setTimeout(() => {
      let username = session?.user?.name || myUsername;
      const userId = (session?.user as any)?.id;

      if (!username) {
        username = `Player_${Math.floor(Math.random() * 1000)}`;
      }

      socket.emit("join_quiz", { roomId, username, userId, isHost }, (response: any) => {
        if (response?.ok) {
          setHasJoined(true);
          setJoinWaiting(false);
          setJoinError("");
        } else if (response?.code !== "NOT_STARTED" && response?.message) {
          setJoinWaiting(false);
          setJoinError(response.message);
        }
      });
    }, 1500);

    return () => clearTimeout(retry);
  }, [socket, isConnected, hasJoined, isHost, joinWaiting, roomId, session, myUsername]);

  useEffect(() => {
    if (socket) {
      socket.on("update_players", (playerList: {username: string, score: number}[]) => {
        setPlayers(playerList);
      });

      socket.on("quiz_started", () => {
        setQuizStarted(true);
      });

      socket.on("join_rejected", (data: any) => {
        if (data?.code === "NOT_STARTED") {
          setJoinWaiting(true);
          setJoinError("");
        } else {
          setJoinWaiting(false);
          setJoinError(data?.message || "Нельзя присоединиться к этой комнате.");
        }
      });

      socket.on("new_question", (data: any) => {
        setCurrentQuestion(data.question);
        setTimeRemaining(data.timeLimit);
        setCurrentRuleMode(data.ruleMode || "casual");
        setCorrectAnswers([]);
        setSelectedOption(null);
        setSelectedMultipleOptions([]);
        setHasSubmittedMultiple(false);
        setMyConfirmed(false);
        setAllConfirmed(false);
        setLeaderboard(null);
      });

      socket.on("player_confirmed", () => {});

      socket.on("all_confirmed", () => {
        setAllConfirmed(true);
      });

      socket.on("not_all_confirmed", () => {
        setAllConfirmed(false);
      });

      socket.on("leaderboard", (data: any) => {
        setLeaderboard(data);
        setCurrentRuleMode(data.ruleMode || currentRuleMode);
        setCorrectAnswers(data.correctAnswers || []);
      });
      
      socket.on("quiz_finished", () => {
        setIsFinished(true);
      });
    }

    return () => {
      if (socket) {
        socket.off("update_players");
        socket.off("quiz_started");
        socket.off("join_rejected");
        socket.off("new_question");
        socket.off("leaderboard");
        socket.off("quiz_finished");
      }
    };
  }, [socket]);

  useEffect(() => {
    if (timeRemaining > 0 && currentQuestion) {
      const timer = setTimeout(() => setTimeRemaining(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, currentQuestion, isHost, leaderboard]);

  const handleStartQuiz = () => {
    if (socket) {
      socket.emit("start_quiz", { roomId });
    }
  };

  if (isFinished && leaderboard) {
    const sortedLeaderboard = [...(leaderboard.leaderboard || [])].sort((a: any, b: any) => b.score - a.score);
    const winner = sortedLeaderboard[0];

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
        <h1 className="text-5xl font-extrabold mb-4 text-green-600 drop-shadow-sm">Квиз завершён!</h1>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-10 text-center border border-slate-200">
          <div className="text-7xl mb-6">🏆</div>
          <h2 className="text-3xl font-bold mb-2 text-slate-800">Победитель: <span className="text-blue-600">{winner?.username || 'Нет'}</span></h2>
          <p className="text-slate-500 mb-8 text-xl font-medium">Набрано очков: {winner?.score || 0}</p>
          {leaderboard.ruleMode && (
            <div className="mb-6 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              Режим: {leaderboard.ruleMode === "strict" ? "строгий" : leaderboard.ruleMode === "learning" ? "обучающий" : "обычный"}
            </div>
          )}
          
          <div className="mb-10 text-left">
            <h3 className="text-xl font-bold mb-4 text-slate-700">Финальная таблица:</h3>
            <ul className="space-y-4">
              {sortedLeaderboard.map((player: any, index: number) => (
                <li key={index} className={`flex justify-between items-center text-lg p-4 rounded-xl ${index === 0 ? 'bg-amber-50 border border-amber-200 shadow-sm' : 'bg-slate-50 border border-slate-100'}`}>
                  <span className="font-semibold text-slate-700 flex items-center gap-3">
                    <span className="text-slate-400 font-bold">{index + 1}.</span> {player.username}
                  </span>
                  <span className="text-blue-600 font-extrabold">{player.score} очков</span>
                </li>
              ))}
            </ul>
          </div>

          <Button 
            className="w-full h-16 text-xl font-bold tracking-wide bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-transform active:scale-95" 
            onClick={() => router.push('/')}
          >
            Вернуться в главное меню
          </Button>
        </div>
      </div>
    );
  }

  if (leaderboard) {
    const leaderboardRows = leaderboard.leaderboard || [];
    const isLearningMode = leaderboard.ruleMode === "learning";
    const isStrictMode = leaderboard.ruleMode === "strict";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100">
        <h1 className="text-4xl font-bold mb-8 text-blue-600">Результаты</h1>
        <div className="bg-white rounded-lg shadow w-full max-w-lg p-6">
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700">
            <div className="font-semibold mb-1">
              Режим: {leaderboard.ruleMode === "strict" ? "Строгий" : leaderboard.ruleMode === "learning" ? "Обучающий" : "Обычный"}
            </div>
            {isStrictMode && <p className="text-sm">Неверный ответ уменьшает счёт на 25 очков.</p>}
            {isLearningMode && <p className="text-sm">За правильный ответ начисляется 50 очков, после вопроса показываются правильные ответы.</p>}
          </div>
          {isLearningMode && correctAnswers.length > 0 && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="font-semibold mb-2">Правильные ответы:</div>
              <ul className="list-disc pl-5 space-y-1">
                {correctAnswers.map((answer) => (
                  <li key={answer.id}>{answer.text}</li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-4">
            {leaderboardRows.map((player: any, index: number) => (
              <li key={index} className="flex justify-between items-center text-xl font-semibold border-b pb-2">
                <span>{index + 1}. {player.username}</span>
                <span className="text-blue-600">{player.score} очков</span>
              </li>
            ))}
          </ul>
          {isHost && (
            <Button className="mt-8 w-full h-12 bg-green-500 hover:bg-green-600" onClick={() => socket?.emit("next_question", { roomId })}>
              Следующий вопрос (или завершить)
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
        <div className="w-full max-w-md p-8 border border-slate-200 rounded-xl shadow-lg bg-white text-center">
          <h1 className="text-3xl font-extrabold text-slate-800 mb-4">Комната недоступна</h1>
          <p className="text-slate-600 mb-6">{joinError}</p>
          <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => router.push("/join") }>
            Вернуться назад
          </Button>
        </div>
      </div>
    );
  }

  if (joinWaiting && !hasJoined && !isHost) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
        <div className="w-full max-w-md p-8 border border-slate-200 rounded-xl shadow-lg bg-white text-center">
          <h1 className="text-3xl font-extrabold text-slate-800 mb-4">Ожидание старта</h1>
          <p className="text-slate-600 mb-6">Комната найдена, но квиз еще не запущен. Как только организатор начнет игру, вы подключитесь автоматически.</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (quizStarted) {
    if (!currentQuestion) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
          <h1 className="text-4xl font-bold mb-4 text-blue-600">Квиз начался!</h1>
          <p className="text-xl">Ожидайте загрузки первого вопроса...</p>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl p-8 items-center flex flex-col">
          <div className="w-full flex justify-between items-center mb-12">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Question</span>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-500">
              <span className="text-xl font-bold text-blue-700">{timeRemaining}s</span>
            </div>
          </div>

          <div className="mb-4 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Режим: {currentRuleMode === "strict" ? "строгий" : currentRuleMode === "learning" ? "обучающий" : "обычный"}
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-slate-800 mb-6">
            {currentQuestion.text}
          </h2>

          {currentQuestion.imageUrl && (
             <div className="w-full flex justify-center mb-8">
               <img src={currentQuestion.imageUrl} alt="Question" className="max-h-64 object-contain rounded-xl shadow-sm border border-slate-200" />
             </div>
          )}

          {currentQuestion.type === "MULTIPLE_CHOICE" && <div className="text-center text-sm font-semibold text-blue-600 uppercase tracking-widest mb-6">Можно выбрать несколько ответов!</div>}

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option: any) => {
              const isSelectedMultiple = selectedMultipleOptions.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => {
                      if (isHost || hasSubmittedMultiple || myConfirmed) return;
                    
                      if (currentQuestion.type === "SINGLE_CHOICE") {
                        setSelectedOption(option.id);
                      } else if (currentQuestion.type === "MULTIPLE_CHOICE") {
                        setSelectedMultipleOptions(prev => 
                          prev.includes(option.id) ? prev.filter(id => id !== option.id) : [...prev, option.id]
                        );
                      }
                    }}
                  disabled={isHost || selectedOption !== null || hasSubmittedMultiple}
                  className={`p-6 text-xl rounded-xl transition-all duration-200 border-2 font-semibold shadow-sm text-left flex items-center justify-between ${
                    (selectedOption === option.id || isSelectedMultiple)
                      ? "bg-blue-500 text-white border-blue-600"
                      : "bg-white text-slate-700 hover:bg-blue-50 border-slate-200"
                  } ${isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {option.text}
                  {currentQuestion.type === "MULTIPLE_CHOICE" && (
                    <div className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold ${isSelectedMultiple ? 'border-white bg-blue-600' : 'border-slate-300'}`}>
                      {isSelectedMultiple && "✓"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!isHost && currentQuestion.type === "MULTIPLE_CHOICE" && !hasSubmittedMultiple && (
            <div className="w-full mt-8">
              <Button 
                onClick={() => {
                  if (selectedMultipleOptions.length > 0) {
                    setHasSubmittedMultiple(true);
                    socket?.emit("submit_answer", { roomId, questionId: currentQuestion.id, answerIds: selectedMultipleOptions });
                    setMyConfirmed(true);
                  }
                }}
                disabled={selectedMultipleOptions.length === 0}
                className="w-full h-14 text-xl font-bold bg-green-500 hover:bg-green-600"
              >
                Подтвердить выбор
              </Button>
            </div>
          )}

          {!isHost && currentQuestion.type === "SINGLE_CHOICE" && !myConfirmed && (
            <div className="w-full mt-8">
              <Button
                onClick={() => {
                  if (selectedOption !== null) {
                    socket?.emit("submit_answer", { roomId, questionId: currentQuestion.id, answerIds: [selectedOption] });
                    setMyConfirmed(true);
                  }
                }}
                disabled={selectedOption === null}
                className="w-full h-14 text-xl font-bold bg-green-500 hover:bg-green-600"
              >
                Подтвердить выбор
              </Button>
            </div>
          )}

          {(!isHost && currentQuestion.type === "MULTIPLE_CHOICE" && hasSubmittedMultiple) && (
              <div className="w-full mt-8 p-4 bg-green-100 text-green-700 text-center rounded-lg font-bold">
                Ответ принят! Ожидайте...
              </div>
          )}

          {isHost && (
            <div className="mt-12 pt-6 border-t w-full flex justify-center">
              <Button
                onClick={() => socket?.emit("show_leaderboard", { roomId })}
                className={`bg-indigo-600 hover:bg-indigo-700 text-lg px-8 h-12 ${!allConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!allConfirmed}
              >
                Показать результаты
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <div className="p-8 border rounded-lg shadow-md bg-white w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-4">Lobby</h1>
        <p className="text-xl mb-4">
          Room Code: <span className="font-mono font-bold text-blue-600 tracking-wider bg-blue-50 px-3 py-1 rounded">{roomId}</span>
        </p>

        {!isConnected && (
          <div className="text-orange-500 mb-4 animate-pulse">Connecting to real-time server...</div>
        )}

        {hasJoined && (
          <p className="text-sm text-gray-500 mb-6">Вы вошли как: <strong>{myUsername}</strong></p>
        )}

        <div className="mt-4 mb-8 text-left border rounded-md p-4 bg-gray-50 h-48 overflow-y-auto w-full">
          <h3 className="font-semibold mb-2 border-b pb-2">Участники ({players.length}):</h3>
          <ul className="space-y-1">
            {players.length === 0 ? (
              <li className="text-gray-400 italic">Ожидание игроков...</li>
            ) : (
              players.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {p.username}
                </li>
              ))
            )}
          </ul>
        </div>

        {isHost ? (
          <Button 
            onClick={handleStartQuiz} 
            className="w-full text-[17px] font-bold h-14 tracking-wide shadow-md transition-transform active:scale-[0.98] bg-green-500 hover:bg-green-600 text-white disabled:bg-slate-300 disabled:opacity-70 disabled:cursor-not-allowed uppercase"
            disabled={players.length === 0}
          >
            {players.length === 0 ? "Ожидание игроков..." : "Начать игру"}
          </Button>
        ) : (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-2">Waiting for the organizer to start the quiz...</p>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
