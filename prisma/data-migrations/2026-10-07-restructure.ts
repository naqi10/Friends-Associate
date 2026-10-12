import { PrismaClient } from "@prisma/client";
import { applyRestructure } from "../sample-content";

const prisma = new PrismaClient();

applyRestructure(prisma, (m) => console.log("•", m))
  .then(() => console.log("Content migration complete."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
