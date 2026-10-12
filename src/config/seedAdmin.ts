import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import prisma from "../shared/prisma";
import config from ".";

const superAdminData = {
  userName: "Admin",
  email: "admin@gmail.com",
  password: "12345Aa@",
  role: UserRole.ADMIN,
  stripeCustomerId: "dsfsdf",
};

const seedSuperAdmin = async () => {
  try {
    // Check if a super admin already exists
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        role: UserRole.ADMIN,
      },
    });

    // If not, create one
    if (!isSuperAdminExists) {
      superAdminData.password = await bcrypt.hash(
        config.super_admin_password as string,
        Number(config.bcrypt_salt_rounds) || 12
      );

      await prisma.user.create({
        data: superAdminData,
      });
      console.log("🦸 Super Admin created successfully.");
    } else {
      return;
    }
  } catch (error) {
    console.error("Error seeding Super Admin:", error);
  }
};

export default seedSuperAdmin;
