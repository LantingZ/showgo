import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
// --- FIX: Corrected the import path ---
// The path should be relative to the current file's directory.
import { authOptions } from "./auth/[...nextauth]"; 
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use getServerSession for server-side authentication
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const userId = session.user.id;

  if (req.method === "GET") {
    const savedEvents = await prisma.savedEvent.findMany({ where: { userId } });
    res.status(200).json(savedEvents.map((e) => e.eventData));
  } else if (req.method === "POST") {
    const { eventData } = req.body;
    const newSavedEvent = await prisma.savedEvent.create({
      data: {
        eventId: eventData.id,
        userId: userId,
        eventData: eventData,
      },
    });
    res.status(201).json(newSavedEvent);
  } else if (req.method === "DELETE") {
    const { eventId } = req.body;
    await prisma.savedEvent.deleteMany({
      where: { eventId, userId },
    });
    res.status(204).end();
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
