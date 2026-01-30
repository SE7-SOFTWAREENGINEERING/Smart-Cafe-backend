const mongoose = require("mongoose");

const SLOT_STATUS = ["Open", "Full", "Cancelled", "FastFilling"];

const slotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Slot date is required"],
    },
    time: {
      type: String,
      required: [true, "Slot time is required"],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Slot capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    booked: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: SLOT_STATUS,
        message: "Invalid slot status",
      },
      default: "Open",
    },
    mealType: {
      type: String,
      enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"],
      default: "LUNCH",
    },
    canteenId: {
      type: String,
      default: "default",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound index for unique slot per date, time, and canteen
slotSchema.index({ date: 1, time: 1, canteenId: 1 }, { unique: true });
slotSchema.index({ date: 1 });
slotSchema.index({ status: 1 });

// Virtual to calculate remaining capacity
slotSchema.virtual("remaining").get(function () {
  return this.capacity - this.booked;
});

slotSchema.virtual("startTime").get(function () {
  if (!this.time) return "";
  const parts = this.time
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[0] || this.time;
});

slotSchema.virtual("endTime").get(function () {
  if (!this.time) return "";
  const parts = this.time
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[1] || "";
});

// Update status based on capacity
slotSchema.methods.updateStatus = function () {
  if (this.status === "Cancelled") return;

  const ratio = this.booked / this.capacity;

  if (ratio >= 1) {
    this.status = "Full";
  } else if (ratio >= 0.8) {
    this.status = "FastFilling";
  } else {
    this.status = "Open";
  }
};

// Pre-save hook to update status
slotSchema.pre("save", function (next) {
  if (this.isModified("booked") || this.isModified("capacity")) {
    this.updateStatus();
  }
  next();
});

const Slot = mongoose.model("Slot", slotSchema);

module.exports = Slot;
module.exports.SLOT_STATUS = SLOT_STATUS;
