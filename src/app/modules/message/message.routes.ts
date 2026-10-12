import express from "express";
import { messageControllers } from "./message.controller";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";


const router = express.Router();

router.post(
  "/generate-url",
  fileUploader.uploadMultiple,
  messageControllers.generateFileUrl
);
router.get("/:roomId", auth(), messageControllers.getMessages);
router.get("/chats/admin", messageControllers.getChats);

export const messageRoute = router;
