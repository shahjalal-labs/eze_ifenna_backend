import { Request } from "express";
import { paginationHelper } from "../../../shared/pagination";
import prisma from "../../../shared/prisma";
import { uploadInSpace } from "../../../shared/UploadHelper";

const urlGenerate = async (req: Request) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const processImages = async (files?: Express.Multer.File[]) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, "messages/files"))
    );
  };

  const [fileUrl] = await Promise.all([processImages(files["fileUrl"])]);

  return fileUrl;
};

const getMessages = async (req: Request) => {
  const { roomId } = req.params;
  const { page, limit } = paginationHelper(req.query as any);

  const messages = await prisma.message.findMany({
    where: {
      roomId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const messageCount = await prisma.message.count({
    where: {
      roomId,
    },
  });

  const totalPages = Math.ceil(messageCount / limit);

  return {
    messageCount,
    currentPage: page,
    totalPages,
    messages,
  };
};

const getAllChatsBetweenUsers = async () => {
  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      user1: {
        select: {
          id: true,
          role:true,
          userName: true,
          profileImage: true,
        },
      },
      user2: {
        select: {
          id: true,
          role:true,
          userName: true,
          profileImage: true,
        },
      },
    },
  });

  return rooms;
};

export const messageService = {
  urlGenerate,
  getMessages,
  getAllChatsBetweenUsers
};
