"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Razorpay from "razorpay";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALLOWED_TIPS = new Set([10, 20, 50]);

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured.");
  }
  return { keyId, keySecret };
}

export const createOrder = action({
  args: { amountRupees: v.number() },
  handler: async (ctx, args) => {
    if (
      !Number.isInteger(args.amountRupees) ||
      !ALLOWED_TIPS.has(args.amountRupees)
    ) {
      throw new Error("Invalid tip amount.");
    }
    const { keyId, keySecret } = credentials();
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const amount = args.amountRupees * 100;
    const receipt = `tip_${Date.now()}_${randomBytes(3).toString("hex")}`;
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: { purpose: "optional_coffee_tip" },
    });
    if (!order.id) throw new Error("Razorpay did not return an order ID.");
    await ctx.runMutation(internal.razorpayData.recordOrder, {
      orderId: order.id,
      receipt,
      amount,
      currency: "INR",
    });
    return { orderId: order.id, amount, currency: "INR" as const, keyId };
  },
});

export const verifyPayment = action({
  args: {
    razorpayPaymentId: v.string(),
    razorpayOrderId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; pending: boolean }> => {
    const order: {
      orderId: string;
      amount: number;
      status: "created" | "paid";
      paymentId?: string;
    } | null = await ctx.runQuery(internal.razorpayData.getOrder, {
      orderId: args.razorpayOrderId,
    });
    if (!order) throw new Error("Unknown payment order.");
    if (order.status === "paid") {
      return {
        success: order.paymentId === args.razorpayPaymentId,
        pending: false,
      };
    }

    const { keyId, keySecret } = credentials();
    const expected = createHmac("sha256", keySecret)
      .update(`${order.orderId}|${args.razorpayPaymentId}`)
      .digest("hex");
    const supplied = args.razorpaySignature.toLowerCase();
    const signaturesMatch =
      /^[a-f0-9]{64}$/.test(supplied) &&
      timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(supplied, "hex"),
      );
    if (!signaturesMatch)
      throw new Error("Payment signature verification failed.");

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(args.razorpayPaymentId);
    if (
      payment.order_id !== order.orderId ||
      Number(payment.amount) !== order.amount
    ) {
      throw new Error("Payment details do not match the stored order.");
    }
    if (payment.status !== "captured") {
      return { success: false, pending: payment.status === "authorized" };
    }
    await ctx.runMutation(internal.razorpayData.markPaid, {
      orderId: order.orderId,
      paymentId: args.razorpayPaymentId,
    });
    return { success: true, pending: false };
  },
});
