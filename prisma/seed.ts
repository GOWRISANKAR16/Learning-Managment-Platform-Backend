import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hashPassword("admin123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@lms.test" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@lms.test",
      passwordHash: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const course = await prisma.course.upsert({
    where: { slug: "java-full-course" },
    update: {},
    create: {
      title: "Java Full Course",
      slug: "java-full-course",
      category: "PROGRAMMING",
      difficulty: "BEGINNER",
      description: "Java Full Course full video course hosted on YouTube.",
      instructor: "Online Instructor",
      thumbnailUrl:
        "https://img.youtube.com/vi/BGTx91t8q50/maxresdefault.jpg",
      totalMinutes: 300,
      sections: {
        create: [
          {
            title: "Main course",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Java Full Course",
                  order: 1,
                  youtubeUrl: "https://www.youtube.com/watch?v=BGTx91t8q50",
                  durationMinutes: 300,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      sections: { include: { lessons: true } },
    },
  });

  console.log({ admin, courseId: course.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

