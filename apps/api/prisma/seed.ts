import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const pw = await argon2.hash("Password123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@nexus.dev" },
    update: {},
    create: {
      username: "admin",
      email: "admin@nexus.dev",
      password: pw,
      displayName: "Admin",
      isAdmin: true,
    },
  });

  const gamer = await prisma.user.upsert({
    where: { email: "gamer@nexus.dev" },
    update: {},
    create: {
      username: "gamer42",
      email: "gamer@nexus.dev",
      password: pw,
      displayName: "xX_Gamer42_Xx",
    },
  });

  const streamer = await prisma.user.upsert({
    where: { email: "streamer@nexus.dev" },
    update: {},
    create: {
      username: "streamer_pro",
      email: "streamer@nexus.dev",
      password: pw,
      displayName: "StreamerPro",
    },
  });

  const cola = await prisma.user.upsert({
    where: { email: "cola@nexus.dev" },
    update: {},
    create: {
      username: "cola",
      email: "cola@nexus.dev",
      password: pw,
      displayName: "Cola",
    },
  });

  const ninja = await prisma.user.upsert({
    where: { email: "ninja@nexus.dev" },
    update: {},
    create: {
      username: "shadow_ninja",
      email: "ninja@nexus.dev",
      password: pw,
      displayName: "ShadowNinja",
    },
  });

  const pixel = await prisma.user.upsert({
    where: { email: "pixel@nexus.dev" },
    update: {},
    create: {
      username: "pixel_queen",
      email: "pixel@nexus.dev",
      password: pw,
      displayName: "PixelQueen",
    },
  });

  console.log(`Users: ${admin.username}, ${gamer.username}, ${streamer.username}, ${cola.username}, ${ninja.username}, ${pixel.username}`);

  // ── Nexus HQ ─────────────────────────────────────────────
  const existingServer = await prisma.server.findUnique({ where: { slug: "nexus-hq-seed01" } });
  let nexusServer = existingServer;

  if (!nexusServer) {
    nexusServer = await prisma.server.create({
      data: {
        name: "Nexus HQ",
        slug: "nexus-hq-seed01",
        description: "The official Nexus community server. Welcome, gamers!",
        visibility: "PUBLIC",
        ownerId: admin.id,
        members: {
          createMany: {
            data: [
              { userId: admin.id, role: "OWNER" },
              { userId: gamer.id, role: "MEMBER", nickname: "GamerGod" },
              { userId: streamer.id, role: "MODERATOR" },
              { userId: cola.id, role: "MEMBER", nickname: "Cola" },
              { userId: ninja.id, role: "MEMBER" },
              { userId: pixel.id, role: "ADMIN" },
            ],
          },
        },
        invites: {
          create: {
            code: "NEXUS001",
            creatorId: admin.id,
            maxUses: 100,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    const channels = await Promise.all([
      prisma.channel.create({ data: { serverId: nexusServer.id, name: "general", type: "TEXT", position: 0 } }),
      prisma.channel.create({ data: { serverId: nexusServer.id, name: "announcements", type: "ANNOUNCEMENT", position: 1 } }),
      prisma.channel.create({ data: { serverId: nexusServer.id, name: "gaming", type: "TEXT", position: 2 } }),
      prisma.channel.create({ data: { serverId: nexusServer.id, name: "memes", type: "TEXT", position: 3 } }),
      prisma.channel.create({ data: { serverId: nexusServer.id, name: "General Voice", type: "VOICE", position: 4 } }),
      prisma.channel.create({ data: { serverId: nexusServer.id, name: "Gaming Voice", type: "VOICE", position: 5 } }),
      prisma.channel.create({ data: { serverId: nexusServer.id, name: "off-topic", type: "TEXT", position: 6 } }),
    ]);

    const general = channels[0]!;
    const gaming = channels[2]!;

    await prisma.message.createMany({
      data: [
        { channelId: general.id, authorId: admin.id, content: "Welcome to Nexus HQ! This is the official community server.", createdAt: new Date(Date.now() - 3600000 * 5) },
        { channelId: general.id, authorId: gamer.id, content: "Yo what's good everyone! Ready to game?", createdAt: new Date(Date.now() - 3600000 * 4) },
        { channelId: general.id, authorId: streamer.id, content: "Hey gamers! Going live in 30 minutes, come watch!", createdAt: new Date(Date.now() - 3600000 * 3) },
        { channelId: general.id, authorId: cola.id, content: "This server is sick! Love the vibe here", createdAt: new Date(Date.now() - 3600000 * 2) },
        { channelId: general.id, authorId: ninja.id, content: "Anyone down for some ranked? Need a full squad", createdAt: new Date(Date.now() - 3600000) },
        { channelId: general.id, authorId: pixel.id, content: "Just finished a new pixel art piece, check it out!", createdAt: new Date(Date.now() - 1800000) },
        { channelId: general.id, authorId: admin.id, content: "Great to see everyone here! Remember to check out #announcements for updates.", createdAt: new Date(Date.now() - 900000) },
        { channelId: gaming.id, authorId: gamer.id, content: "Who wants to run some duos?", createdAt: new Date(Date.now() - 7200000) },
        { channelId: gaming.id, authorId: ninja.id, content: "I'm in! What game?", createdAt: new Date(Date.now() - 7100000) },
        { channelId: gaming.id, authorId: gamer.id, content: "Thinking Valorant or Apex, your call", createdAt: new Date(Date.now() - 7000000) },
        { channelId: gaming.id, authorId: cola.id, content: "Apex!! Let's get that W", createdAt: new Date(Date.now() - 6900000) },
        { channelId: gaming.id, authorId: pixel.id, content: "I'll spectate and draw some gameplay art lol", createdAt: new Date(Date.now() - 6800000) },
      ],
    });

    console.log(`Server: ${nexusServer.name} (invite: NEXUS001) with ${channels.length} channels and 12 messages`);
  }

  // ── Dev Lounge ───────────────────────────────────────────
  const existingDev = await prisma.server.findUnique({ where: { slug: "dev-lounge-seed01" } });
  if (!existingDev) {
    const devServer = await prisma.server.create({
      data: {
        name: "Dev Lounge",
        slug: "dev-lounge-seed01",
        description: "For builders, by builders. Ship fast.",
        visibility: "PRIVATE",
        ownerId: gamer.id,
        members: {
          createMany: {
            data: [
              { userId: gamer.id, role: "OWNER" },
              { userId: admin.id, role: "ADMIN" },
              { userId: ninja.id, role: "MEMBER" },
            ],
          },
        },
      },
    });

    const devChannels = await Promise.all([
      prisma.channel.create({ data: { serverId: devServer.id, name: "general", type: "TEXT", position: 0 } }),
      prisma.channel.create({ data: { serverId: devServer.id, name: "code-review", type: "TEXT", position: 1 } }),
      prisma.channel.create({ data: { serverId: devServer.id, name: "Pair Programming", type: "VOICE", position: 2 } }),
    ]);

    await prisma.message.createMany({
      data: [
        { channelId: devChannels[0]!.id, authorId: gamer.id, content: "Welcome to Dev Lounge! Let's build something cool.", createdAt: new Date(Date.now() - 86400000) },
        { channelId: devChannels[0]!.id, authorId: admin.id, content: "I'm working on a new feature for the chat system", createdAt: new Date(Date.now() - 43200000) },
        { channelId: devChannels[0]!.id, authorId: ninja.id, content: "Nice! Need any help with the backend?", createdAt: new Date(Date.now() - 36000000) },
      ],
    });

    console.log(`Server: ${devServer.name} with ${devChannels.length} channels`);
  }

  // ── Gaming Squad ─────────────────────────────────────────
  const existingGaming = await prisma.server.findUnique({ where: { slug: "gaming-squad-seed01" } });
  if (!existingGaming) {
    const gamingServer = await prisma.server.create({
      data: {
        name: "Gaming Squad",
        slug: "gaming-squad-seed01",
        description: "Competitive gaming community. Tournaments every weekend!",
        visibility: "PUBLIC",
        ownerId: streamer.id,
        members: {
          createMany: {
            data: [
              { userId: streamer.id, role: "OWNER" },
              { userId: gamer.id, role: "ADMIN" },
              { userId: cola.id, role: "MEMBER" },
              { userId: ninja.id, role: "MODERATOR" },
              { userId: pixel.id, role: "MEMBER" },
            ],
          },
        },
        invites: {
          create: {
            code: "GG2024",
            creatorId: streamer.id,
            maxUses: 50,
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    await Promise.all([
      prisma.channel.create({ data: { serverId: gamingServer.id, name: "lobby", type: "TEXT", position: 0 } }),
      prisma.channel.create({ data: { serverId: gamingServer.id, name: "tournaments", type: "ANNOUNCEMENT", position: 1 } }),
      prisma.channel.create({ data: { serverId: gamingServer.id, name: "lfg", type: "TEXT", position: 2 } }),
      prisma.channel.create({ data: { serverId: gamingServer.id, name: "Game Night", type: "VOICE", position: 3 } }),
      prisma.channel.create({ data: { serverId: gamingServer.id, name: "Ranked Queue", type: "VOICE", position: 4 } }),
    ]);

    console.log(`Server: ${gamingServer.name} (invite: GG2024)`);
  }

  console.log("\nTest accounts (all use password: Password123):");
  console.log("  admin@nexus.dev / cola@nexus.dev / gamer@nexus.dev");
  console.log("  streamer@nexus.dev / ninja@nexus.dev / pixel@nexus.dev");
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
