
const mongoose = require('mongoose');

const customizationOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    priceDelta: {
      type: Number,
      default: 0,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const sizeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["small", "medium", "large"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    chaiType: {
      type: String,
      enum: [
        "masala",
        "ginger",
        "elaichi",
        "kesar",
        "kulhad",
        "cutting",
        "other",
      ],
      required: true,
    },

    image: {
      type: String,
      default: "",
    },

    sizes: {
      type: [sizeSchema],
      required: true,
      validate: {
        validator: (sizes) => sizes.length > 0,
        message: "At least one size is required",
      },
    },

    customization: {
      sugar: {
        type: [customizationOptionSchema],
        default: [],
      },

      milk: {
        type: [customizationOptionSchema],
        default: [],
      },

      spiceLevel: {
        type: [customizationOptionSchema],
        default: [],
      },
    },

    preparationTime: {
      type: Number,
      default: 5,
      min: 1,
    },

    stock: {
      type: Number,
      default: 100,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ chaiType: 1, isAvailable: 1 });
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);


