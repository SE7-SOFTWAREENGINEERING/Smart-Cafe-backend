const fs = require("fs/promises");
const path = require("path");
const models = require("../models");

const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");

const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
};

const runBackup = async (meta = {}) => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const timestamp = getTimestamp();
  const fileName = `backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const data = {};
  for (const model of Object.values(models)) {
    if (model && typeof model.find === "function" && model.modelName) {
      data[model.modelName] = await model.find({}).lean();
    }
  }

  const payload = {
    createdAt: new Date().toISOString(),
    meta,
    data,
  };

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");

  return {
    fileName,
    filePath,
    collections: Object.keys(data),
  };
};

module.exports = {
  runBackup,
};
