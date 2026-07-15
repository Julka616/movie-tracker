const mongoose = require("mongoose");

const diaryEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },

    watchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    review: {
      type: String,
      default: "",
    },

    platform: {
      type: String,
      default: "",
    },

    rewatch: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DiaryEntry", diaryEntrySchema);
