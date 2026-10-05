import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

type DemoPlayer = {
  email: string;
  fullName: string;
  nickname: string;
  category: 'graduacao' | 'pos';
};

type DemoMatchPlayer = {
  email: string;
  placement: number;
  victoryPoints: number;
  isWinner: boolean;
  pointsDelta: number;
};

type DemoMatch = {
  submitterEmail: string;
  daysAgo: number;
  notes: string;
  players: DemoMatchPlayer[];
};

type DemoScheduledMatch = {
  title: string;
  creatorEmail: string;
  daysAhead: number;
  minPlayers: number;
  maxPlayers: number;
  playerEmails: string[];
};

const demoPlayers: DemoPlayer[] = [
  { email: 'alice@lsc.unicamp.br', fullName: 'Alice Souza', nickname: 'alice', category: 'graduacao' },
  { email: 'bruno@lsc.unicamp.br', fullName: 'Bruno Lima', nickname: 'brunol', category: 'graduacao' },
  { email: 'carla@lsc.unicamp.br', fullName: 'Carla Mendes', nickname: 'carlam', category: 'pos' },
  { email: 'diego@lsc.unicamp.br', fullName: 'Diego Rocha', nickname: 'diegor', category: 'graduacao' },
  { email: 'elisa@lsc.unicamp.br', fullName: 'Elisa Martins', nickname: 'elisa', category: 'pos' },
  { email: 'felipe@lsc.unicamp.br', fullName: 'Felipe Costa', nickname: 'felipec', category: 'graduacao' },
  { email: 'gabriela@lsc.unicamp.br', fullName: 'Gabriela Nunes', nickname: 'gabi', category: 'pos' },
  { email: 'henrique@lsc.unicamp.br', fullName: 'Henrique Alves', nickname: 'henrique', category: 'graduacao' },
];

const demoMatches: DemoMatch[] = [
  {
    submitterEmail: 'alice@lsc.unicamp.br',
    daysAgo: 21,
    notes: 'Mesa de sexta no LSC',
    players: [
      { email: 'alice@lsc.unicamp.br', placement: 1, victoryPoints: 10, isWinner: true, pointsDelta: 12 },
      { email: 'bruno@lsc.unicamp.br', placement: 2, victoryPoints: 9, isWinner: false, pointsDelta: 7 },
      { email: 'carla@lsc.unicamp.br', placement: 3, victoryPoints: 8, isWinner: false, pointsDelta: 4 },
      { email: 'diego@lsc.unicamp.br', placement: 4, victoryPoints: 7, isWinner: false, pointsDelta: 2 },
    ],
  },
  {
    submitterEmail: 'bruno@lsc.unicamp.br',
    daysAgo: 18,
    notes: 'Partida equilibrada',
    players: [
      { email: 'bruno@lsc.unicamp.br', placement: 1, victoryPoints: 10, isWinner: true, pointsDelta: 12 },
      { email: 'elisa@lsc.unicamp.br', placement: 2, victoryPoints: 9, isWinner: false, pointsDelta: 7 },
      { email: 'felipe@lsc.unicamp.br', placement: 3, victoryPoints: 8, isWinner: false, pointsDelta: 4 },
      { email: 'gabriela@lsc.unicamp.br', placement: 4, victoryPoints: 7, isWinner: false, pointsDelta: 2 },
    ],
  },
  {
    submitterEmail: 'carla@lsc.unicamp.br',
    daysAgo: 14,
    notes: 'Jogo rapido apos aula',
    players: [
      { email: 'henrique@lsc.unicamp.br', placement: 1, victoryPoints: 10, isWinner: true, pointsDelta: 12 },
      { email: 'alice@lsc.unicamp.br', placement: 2, victoryPoints: 9, isWinner: false, pointsDelta: 7 },
      { email: 'diego@lsc.unicamp.br', placement: 3, victoryPoints: 8, isWinner: false, pointsDelta: 4 },
      { email: 'elisa@lsc.unicamp.br', placement: 4, victoryPoints: 7, isWinner: false, pointsDelta: 2 },
    ],
  },
  {
    submitterEmail: 'diego@lsc.unicamp.br',
    daysAgo: 10,
    notes: 'Noite Catan',
    players: [
      { email: 'carla@lsc.unicamp.br', placement: 1, victoryPoints: 10, isWinner: true, pointsDelta: 12 },
      { email: 'felipe@lsc.unicamp.br', placement: 2, victoryPoints: 9, isWinner: false, pointsDelta: 7 },
      { email: 'gabriela@lsc.unicamp.br', placement: 3, victoryPoints: 8, isWinner: false, pointsDelta: 4 },
      { email: 'henrique@lsc.unicamp.br', placement: 4, victoryPoints: 7, isWinner: false, pointsDelta: 2 },
    ],
  },
  {
    submitterEmail: 'elisa@lsc.unicamp.br',
    daysAgo: 6,
    notes: 'Treino para torneio',
    players: [
      { email: 'elisa@lsc.unicamp.br', placement: 1, victoryPoints: 10, isWinner: true, pointsDelta: 12 },
      { email: 'alice@lsc.unicamp.br', placement: 2, victoryPoints: 9, isWinner: false, pointsDelta: 7 },
      { email: 'bruno@lsc.unicamp.br', placement: 3, victoryPoints: 8, isWinner: false, pointsDelta: 4 },
      { email: 'carla@lsc.unicamp.br', placement: 4, victoryPoints: 7, isWinner: false, pointsDelta: 2 },
    ],
  },
  {
    submitterEmail: 'felipe@lsc.unicamp.br',
    daysAgo: 2,
    notes: 'Final de semana no IC',
    players: [
      { email: 'gabriela@lsc.unicamp.br', placement: 1, victoryPoints: 10, isWinner: true, pointsDelta: 12 },
      { email: 'henrique@lsc.unicamp.br', placement: 2, victoryPoints: 9, isWinner: false, pointsDelta: 7 },
      { email: 'diego@lsc.unicamp.br', placement: 3, victoryPoints: 8, isWinner: false, pointsDelta: 4 },
      { email: 'felipe@lsc.unicamp.br', placement: 4, victoryPoints: 7, isWinner: false, pointsDelta: 2 },
    ],
  },
];

const demoScheduledMatches: DemoScheduledMatch[] = [
  {
    title: 'Catan de quarta',
    creatorEmail: 'admin@example.com',
    daysAhead: 2,
    minPlayers: 3,
    maxPlayers: 4,
    playerEmails: ['alice@lsc.unicamp.br', 'bruno@lsc.unicamp.br', 'carla@lsc.unicamp.br'],
  },
  {
    title: 'Mesa pos-lab',
    creatorEmail: 'alice@lsc.unicamp.br',
    daysAhead: 5,
    minPlayers: 3,
    maxPlayers: 4,
    playerEmails: ['alice@lsc.unicamp.br', 'diego@lsc.unicamp.br'],
  },
  {
    title: 'Treino para campeonato',
    creatorEmail: 'bruno@lsc.unicamp.br',
    daysAhead: 8,
    minPlayers: 4,
    maxPlayers: 4,
    playerEmails: ['bruno@lsc.unicamp.br', 'elisa@lsc.unicamp.br', 'felipe@lsc.unicamp.br', 'henrique@lsc.unicamp.br'],
  },
];

function buildDateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function buildDateDaysAhead(daysAhead: number) {
  const date = new Date();
  date.setHours(19, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  return date;
}

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
        profile: {
          create: {
            fullName: process.env.ADMIN_FULL_NAME || 'Administrator',
            nickname: process.env.ADMIN_NICKNAME || 'admin',
            category: 'pos',
            bio: 'System Administrator',
          },
        },
      },
    });

    console.log('Admin user created:', adminEmail);
  } else {
    console.log('Admin user already exists');
  }

  const demoPasswordHash = await bcrypt.hash('player123', 12);
  const demoUserIdsByEmail = new Map<string, bigint>();

  for (const player of demoPlayers) {
    const user = await prisma.user.upsert({
      where: { email: player.email },
      update: {
        isActive: true,
      },
      create: {
        email: player.email,
        passwordHash: demoPasswordHash,
        role: 'player',
        isActive: true,
      },
    });

    demoUserIdsByEmail.set(player.email, user.id);

    await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: player.fullName,
        nickname: player.nickname,
        category: player.category,
      },
      create: {
        userId: user.id,
        fullName: player.fullName,
        nickname: player.nickname,
        category: player.category,
      },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

  for (const match of demoMatches) {
    const submitterId = demoUserIdsByEmail.get(match.submitterEmail);
    if (!submitterId) {
      throw new Error(`Missing seeded user for ${match.submitterEmail}`);
    }

    const matchDate = buildDateDaysAgo(match.daysAgo);
    const existingSubmission = await prisma.matchSubmission.findFirst({
      where: {
        submittedByUserId: submitterId,
        notes: match.notes,
        matchDate,
      },
    });

    const submission =
      existingSubmission ??
      (await prisma.matchSubmission.create({
        data: {
          submittedByUserId: submitterId,
          matchDate,
          notes: match.notes,
          status: 'approved',
          reviewedByUserId: admin.id,
          reviewedAt: new Date(),
        },
      }));

    for (const player of match.players) {
      const userId = demoUserIdsByEmail.get(player.email);
      if (!userId) {
        throw new Error(`Missing seeded user for ${player.email}`);
      }

      await prisma.matchSubmissionPlayer.upsert({
        where: {
          uq_submission_user: {
            submissionId: submission.id,
            userId,
          },
        },
        update: {
          placement: player.placement,
          victoryPoints: player.victoryPoints,
          isWinner: player.isWinner,
        },
        create: {
          submissionId: submission.id,
          userId,
          placement: player.placement,
          victoryPoints: player.victoryPoints,
          isWinner: player.isWinner,
        },
      });

      await prisma.scoreEvent.upsert({
        where: {
          uq_score_event_submission_user: {
            submissionId: submission.id,
            userId,
          },
        },
        update: {
          pointsDelta: player.pointsDelta,
          isWin: player.isWinner,
        },
        create: {
          submissionId: submission.id,
          userId,
          pointsDelta: player.pointsDelta,
          isWin: player.isWinner,
        },
      });
    }
  }

  for (const scheduled of demoScheduledMatches) {
    const creatorEmail = scheduled.creatorEmail === 'admin@example.com' ? adminEmail : scheduled.creatorEmail;
    const creatorId =
      creatorEmail === adminEmail
        ? admin.id
        : demoUserIdsByEmail.get(creatorEmail);

    if (!creatorId) {
      throw new Error(`Missing scheduled match creator ${creatorEmail}`);
    }

    const existingScheduledMatch = await prisma.scheduledMatch.findFirst({
      where: {
        creatorId,
        title: scheduled.title,
        status: 'open',
      },
    });

    const scheduledMatch =
      existingScheduledMatch ??
      (await prisma.scheduledMatch.create({
        data: {
          creatorId,
          title: scheduled.title,
          scheduledDate: buildDateDaysAhead(scheduled.daysAhead),
          minPlayers: scheduled.minPlayers,
          maxPlayers: scheduled.maxPlayers,
          status: 'open',
        },
      }));

    for (const playerEmail of scheduled.playerEmails) {
      const userId = demoUserIdsByEmail.get(playerEmail);
      if (!userId) {
        throw new Error(`Missing scheduled player ${playerEmail}`);
      }

      await prisma.scheduledMatchPlayer.upsert({
        where: {
          matchId_userId: {
            matchId: scheduledMatch.id,
            userId,
          },
        },
        update: {},
        create: {
          matchId: scheduledMatch.id,
          userId,
        },
      });
    }
  }

  // Create bot client if token is set
  const botToken = process.env.BOT_DEFAULT_TOKEN;
  if (botToken) {
    const existingBot = await prisma.botClient.findFirst({
      where: { name: 'Default Bot' },
    });

    if (!existingBot) {
      const tokenHash = crypto.createHash('sha256').update(botToken).digest('hex');

      await prisma.botClient.create({
        data: {
          name: 'Default Bot',
          tokens: {
            create: {
              tokenHash,
              scopes: ['leaderboard:read', 'players:read', 'matches:write', 'matches:read'],
              isActive: true,
            },
          },
        },
      });

      console.log('Default bot client created');
    } else {
      console.log('Bot client already exists');
    }
  }

  console.log('Seeding completed (admin, bot, demo players, matches, and scheduled matches)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
