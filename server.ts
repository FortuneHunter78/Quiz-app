import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

import { PrismaClient } from '@prisma/client';

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const prisma = new PrismaClient();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      if (!req.url) return;
      
      if (req.url.startsWith("/api/socket_io")) return;

      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(httpServer, {
    path: "/api/socket_io",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const roomPlayers = new Map<string, { id: string, username: string, score: number, userId?: number }[]>();
  const questionTimers = new Map<string, NodeJS.Timeout>();

  const clearQuestionTimer = (roomId: string) => {
    const timer = questionTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      questionTimers.delete(roomId);
    }
  };

  const emitLeaderboard = (roomId: string, force = false) => {
    const players = roomPlayers.get(roomId) || [];
    const quizState = activeQuizzes.get(roomId);
    if (!quizState || quizState.status !== 'question') return;

    const nonHostPlayers = players.map(p => p.id);
    const allConfirmed = nonHostPlayers.length === 0 || nonHostPlayers.every(id => quizState.confirmed.has(id));
    if (!force && !allConfirmed) {
      return false;
    }

    clearQuestionTimer(roomId);
    quizState.status = 'leaderboard';

    const leaderboard = [...players].sort((a, b) => b.score - a.score);
    const currentQuestion = quizState.questions[quizState.currentIndex];
    const correctAnswers = currentQuestion
      ? currentQuestion.options
          .filter((o: any) => o.isCorrect)
          .map((o: any) => ({ id: Number(o.id), text: o.text }))
      : [];

    io.to(roomId).emit("leaderboard", {
      ruleMode: quizState.rules || 'casual',
      correctAnswers,
      leaderboard: leaderboard.map(p => ({ username: p.username, score: p.score })),
      reason: force ? 'timeout' : 'manual'
    });

    return true;
  };

  const scheduleQuestionTimer = (roomId: string, timeLimitSeconds: number) => {
    clearQuestionTimer(roomId);
    const quizState = activeQuizzes.get(roomId);
    if (!quizState) return;

    questionTimers.set(roomId, setTimeout(() => {
      const latestState = activeQuizzes.get(roomId);
      if (!latestState || latestState.status !== 'question') return;
      emitLeaderboard(roomId, true);
    }, Math.max(1, timeLimitSeconds) * 1000));
  };
  
  const activeQuizzes = new Map<string, {
    id: number,
    runId: number,
    rules: string,
    questions: any[],
    timeLimit?: number,
    currentIndex: number,
    status: 'lobby' | 'question' | 'leaderboard' | 'finished',
    hostId: string,
    confirmed: Set<string>,
    submissions: Map<string, any>
  }>();

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_quiz", async (data, ack) => {
      console.log(`User ${data.username} (${socket.id}) joined quiz ${data.roomId}`);
      try {
        const quizExists = await prisma.quiz.findUnique({
          where: { code: data.roomId },
          select: { id: true },
        });

        if (!quizExists) {
          if (typeof ack === "function") {
            ack({ ok: false, code: "NOT_FOUND", message: "Квиз не найден." });
          } else {
            socket.emit("join_rejected", { code: "NOT_FOUND", message: "Квиз не найден." });
          }
          return;
        }

        socket.join(data.roomId);

        if (!roomPlayers.has(data.roomId)) {
          roomPlayers.set(data.roomId, []);
        }

        const players = roomPlayers.get(data.roomId)!;
        if (!data.isHost) {
          if (!players.find(p => p.id === socket.id)) {
            players.push({ id: socket.id, username: data.username, score: 0, userId: data.userId ? parseInt(data.userId) : undefined });
          }
        }

        io.to(data.roomId).emit("update_players", players.map(p => ({ username: p.username, score: p.score })));

        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        console.error("Join room lookup failed:", error);
        if (typeof ack === "function") {
          ack({ ok: false, code: "ERROR", message: "Не удалось проверить комнату." });
        }
      }
    });

    socket.on("start_quiz", async (data) => {
      console.log(`Quiz ${data.roomId} is starting...`);
      try {
        const wasActive = activeQuizzes.has(data.roomId);
        if (wasActive) {
          roomPlayers.delete(data.roomId);
          roomPlayers.set(data.roomId, []);
        } else {
          const existingPlayers = roomPlayers.get(data.roomId) || [];
          if (existingPlayers.length > 0) {
            existingPlayers.forEach((player) => {
              player.score = 0;
            });
            io.to(data.roomId).emit("update_players", existingPlayers.map(p => ({ username: p.username, score: p.score })));
          }
        }

        const quiz = await prisma.quiz.findUnique({
          where: { code: data.roomId },
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        });

        if (!quiz) {
          socket.emit("error", { message: "Quiz not found" });
          return;
        }

        const quizRun = await prisma.quizRun.create({
          data: {
            quizId: quiz.id
          }
        });

        activeQuizzes.set(data.roomId, {
          id: quiz.id,
          runId: quizRun.id,
          rules: quiz.rules || 'casual',
          questions: quiz.questions,
          timeLimit: quiz.timeLimit || 15,
          currentIndex: 0,
          status: 'question',
          hostId: socket.id,
          confirmed: new Set(),
          submissions: new Map()
        });

        const players = roomPlayers.get(data.roomId) || [];
        io.to(data.roomId).emit("update_players", players.map(p => ({ username: p.username, score: p.score })));

        io.to(data.roomId).emit("quiz_started");
        
        const firstQuestion = quiz.questions[0];
        const state = activeQuizzes.get(data.roomId)!;
        state.confirmed.clear();
        state.submissions.clear();

        io.to(data.roomId).emit("new_question", {
          question: {
            id: firstQuestion.id,
            text: firstQuestion.text,
            type: firstQuestion.type,
            imageUrl: firstQuestion.imageUrl,
            options: firstQuestion.options.map((o: any) => ({ id: o.id, text: o.text }))
          },
          ruleMode: quiz.rules || 'casual',
          timeLimit: quiz.timeLimit || 15,
          totalQuestions: quiz.questions.length,
          currentIndex: 0
        });

        scheduleQuestionTimer(data.roomId, quiz.timeLimit || 15);

      } catch (err) {
        console.error("Error starting quiz:", err);
      }
    });

    socket.on("submit_answer", (data) => {
      const { roomId, questionId, answerIds } = data;
      const quizState = activeQuizzes.get(roomId);
      const players = roomPlayers.get(roomId);

      if (!quizState || !players || !answerIds || !Array.isArray(answerIds)) return;

      const currentQuestion = quizState.questions[quizState.currentIndex];
      const currentQuestionId = Number(currentQuestion.id);
      const submittedQuestionId = Number(questionId);

      if (currentQuestionId !== submittedQuestionId) return;

      const ruleMode = quizState.rules || 'casual';

      const correctOptions = currentQuestion.options.filter((o: any) => o.isCorrect).map((o: any) => Number(o.id));
      const numericAnswerIds = answerIds.map((id: any) => Number(id));
      const isCorrect = correctOptions.length === numericAnswerIds.length && correctOptions.every((id: any) => numericAnswerIds.includes(id));

      quizState.submissions.set(socket.id, { answerIds: numericAnswerIds, isCorrect });
      quizState.confirmed.add(socket.id);

      const player = players.find(p => p.id === socket.id);
      if (player) {
        if (isCorrect) {
          player.score += ruleMode === 'learning' ? 50 : 100;
        } else if (ruleMode === 'strict') {
          player.score = Math.max(0, player.score - 25);
        }
      }

      io.to(roomId).emit("update_players", players.map(p => ({ username: p.username, score: p.score })));
      io.to(roomId).emit("player_confirmed", { socketId: socket.id, username: player?.username });

      const nonHostPlayers = players.map(p => p.id);
      const allConfirmed = nonHostPlayers.length === 0 || nonHostPlayers.every(id => quizState.confirmed.has(id));
      if (allConfirmed) {
        io.to(roomId).emit("all_confirmed");
      }
    });

    socket.on("show_leaderboard", (data) => {
      const { roomId } = data;
      const emitted = emitLeaderboard(roomId, false);
      if (!emitted) {
        socket.emit("not_all_confirmed", { message: "Not all players have confirmed their answers yet." });
      }
    });

    socket.on("next_question", async (data) => {
      const { roomId } = data;
      const quizState = activeQuizzes.get(roomId);
      const players = roomPlayers.get(roomId) || [];
      if (!quizState) return;

      clearQuestionTimer(roomId);

      quizState.currentIndex += 1;
      if (quizState.currentIndex >= quizState.questions.length) {
        quizState.status = 'finished';
        io.to(roomId).emit("quiz_finished");
        
        try {
          console.log("Finished quiz! Players to save:", players);
          console.log("quizState.id =", quizState.id);
          for (const player of players) {
            if (player.userId) {
              console.log("Creating session for userId:", player.userId);
              await prisma.userQuizSession.create({
                data: {
                  userId: player.userId,
                  quizId: quizState.id,
                  quizRunId: quizState.runId,
                  score: player.score
                }
              });
            } else {
              console.log("Skipping player (no userId):", player);
            }
          }

          const topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
          await prisma.quizRun.update({
            where: { id: quizState.runId },
            data: {
              finishedAt: new Date(),
              participantCount: players.length,
              topScore: topPlayer?.score || 0,
              winnerName: topPlayer?.username || null
            }
          });
          console.log(`Saved sessions for quiz ${roomId}`);
          
          roomPlayers.delete(roomId);
          activeQuizzes.delete(roomId);
          clearQuestionTimer(roomId);
        } catch (err) {
          console.error("Error saving sessions:", err);
        }
      } else {
        quizState.status = 'question';
        quizState.confirmed.clear();
        quizState.submissions.clear();
        const nextQ = quizState.questions[quizState.currentIndex];
        io.to(roomId).emit("new_question", {
          question: {
            id: nextQ.id,
            text: nextQ.text,
            type: nextQ.type,
            imageUrl: nextQ.imageUrl,
            options: nextQ.options.map((o: any) => ({ id: o.id, text: o.text }))
          },
          ruleMode: quizState.rules || 'casual',
          timeLimit: quizState.timeLimit || 15,
          totalQuestions: quizState.questions.length,
          currentIndex: quizState.currentIndex
        });

        scheduleQuestionTimer(roomId, quizState.timeLimit || 15);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      roomPlayers.forEach((players, roomId) => {
        const index = players.findIndex(p => p.id === socket.id);
        if (index !== -1) {
          players.splice(index, 1);
          io.to(roomId).emit("update_players", players.map(p => ({ username: p.username, score: p.score })));
        }
      });
    });
  });

  httpServer.once("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
