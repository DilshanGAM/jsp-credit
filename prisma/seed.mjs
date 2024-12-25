import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a sample user
  await prisma.user.create({
    data: {
      email: "sampleuser@example.com",
      name: "Sample User",
      phone: "1234567890",
      password: "$2a$12$RdUwAbGF35Xn8/wEAcG4Q.gADhB0LiLGDUKsaRrRkuCFafavKb0x2", // Hashed password
      address: "123 Example Street, City, Country",
      role: "admin", // You can modify this role as needed
      nic: "NIC123456789",
      status: "active",
    },
  });

  console.log("Sample user created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
