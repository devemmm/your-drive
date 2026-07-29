import { Router } from "express";
import {
  deleteMessage,
  getAllChatThreads,
  getThreadMessages,
  sendMessage,
  updateMessage,
  markMessageAsRead,
  markThreadAsRead,
  getUnreadCount,
} from "../controllers/chat.controller";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validateRequestBody } from "../middlewares/validators";
import {
  sendMessageValidator,
  updateMessageValidator,
} from "../middlewares/validators/chat.request.validator";
import { findThreadOrThrowError } from "../middlewares/getThread";

const router = Router();

router.use(isAuthenticated);

router.route("/").get(getAllChatThreads);

router
  .route("/:threadId/messages")
  .get(findThreadOrThrowError, getThreadMessages);

router
  .route("/:threadId/messages")
  .post(
    sendMessageValidator,
    validateRequestBody,
    findThreadOrThrowError,
    sendMessage
  );

router
  .route("/:threadId/messages/:messageId")
  .put(
    updateMessageValidator,
    validateRequestBody,
    findThreadOrThrowError,
    updateMessage
  );

router
  .route("/:threadId/messages/:messageId")
  .delete(findThreadOrThrowError, deleteMessage);

// Chat read tracking routes
router.post("/messages/:messageId/read", markMessageAsRead);
router.post("/:threadId/read", findThreadOrThrowError, markThreadAsRead);
router.post(
  "/:threadId/messages/read",
  findThreadOrThrowError,
  markThreadAsRead
);
router.get("/unread-count", getUnreadCount);

export default router;
