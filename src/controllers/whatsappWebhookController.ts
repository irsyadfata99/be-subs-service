import { Request, Response } from "express";
import logger from "../utils/logger";

/**
 * WhatsApp Webhook Verification
 * GET /api/webhook/whatsapp
 */
export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      logger.info("WhatsApp webhook verified");
      res.status(200).send(challenge);
    } else {
      logger.warn("WhatsApp webhook verification failed");
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

/**
 * WhatsApp Webhook Handler
 * POST /api/webhook/whatsapp
 */
export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Quick response to Meta
    res.sendStatus(200);

    // Process webhook asynchronously
    if (body.object === "whatsapp_business_account") {
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === "messages") {
            const value = change.value;

            if (value.messages) {
              value.messages.forEach((message: any) => {
                handleIncomingMessage(message, value.metadata);
              });
            }

            if (value.statuses) {
              value.statuses.forEach((status: any) => {
                handleMessageStatus(status);
              });
            }
          }
        });
      });
    }
  } catch (error: any) {
    logger.error("WhatsApp webhook error", {
      error: error.message,
      body: req.body,
    });
  }
};

async function handleIncomingMessage(message: any, metadata: any) {
  logger.info("Incoming WhatsApp message", {
    from: message.from,
    type: message.type,
    message_id: message.id,
  });

  if (message.type === "text") {
    const text = message.text.body;
    const from = message.from;
    logger.info(`Message from ${from}: ${text}`);
  }
}

function handleMessageStatus(status: any) {
  logger.info("Message status update", {
    id: status.id,
    status: status.status,
    recipient: status.recipient_id,
  });

  if (status.status === "failed") {
    logger.error("Message delivery failed", {
      id: status.id,
      errors: status.errors,
    });
  }
}
