import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const recordOrder = internalMutation({
  args: {
    orderId: v.string(),
    receipt: v.string(),
    amount: v.number(),
    currency: v.literal("INR"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("razorpayOrders", {
      ...args,
      status: "created",
      createdAt: Date.now(),
    });
  },
});

export const getOrder = internalQuery({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("razorpayOrders")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
  },
});

export const markPaid = internalMutation({
  args: {
    orderId: v.string(),
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("razorpayOrders")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (!order) throw new Error("Order not found.");
    if (order.status === "paid") {
      return { ok: order.paymentId === args.paymentId };
    }
    const duplicatePayment = await ctx.db
      .query("razorpayOrders")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
      .unique();
    if (duplicatePayment && duplicatePayment._id !== order._id) {
      throw new Error("Payment is already linked to another order.");
    }
    await ctx.db.patch(order._id, {
      status: "paid",
      paymentId: args.paymentId,
      verifiedAt: Date.now(),
    });
    return { ok: true };
  },
});
