const DiaryEntry = require("../models/DiaryEntry");

// Dodanie wpisu do dziennika
exports.createEntry = async (req, res) => {
  try {
    const entry = await DiaryEntry.create({
      user: req.user.id,
      ...req.body,
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Błąd podczas dodawania wpisu."
    });
  }
};

// Pobranie dziennika zalogowanego użytkownika
exports.getMyDiary = async (req, res) => {
  try {
    const diary = await DiaryEntry.find({
      user: req.user.id
    })
      .populate("movie")
      .sort({ watchedAt: -1 });

    res.json(diary);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Błąd podczas pobierania dziennika."
    });
  }
};
