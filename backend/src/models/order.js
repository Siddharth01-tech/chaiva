
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    productImage: {
      type: String,
      default: "",
    },

    chaiType: {
      type: String,
      required: true,
    },

    size: {
      type: String,
      enum: ["small", "medium", "large"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    customization: {
      sugar: String,
      milk: String,
      spiceLevel: String,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    houseNumber: { type: String, required: true },
    street: { type: String, required: true },
    area: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },

    note: {
      type: String,
      trim: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },

    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },

    deliveryType: {
      type: String,
      enum: ["delivery"],
      default: "delivery",
      immutable: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["online", "cod"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    notes: {
      type: String,
      maxlength: 300,
      trim: true,
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
