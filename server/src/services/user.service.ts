import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";

export class UserService {
  public static async getUser(
    where: Prisma.UserWhereInput,
    include?: Prisma.UserInclude
  ) {
    return await prisma.user.findFirst({
      where,
      include,
    });
  }
  public static async getUserByUnique(
    where: Prisma.UserWhereUniqueInput,
    include?: Prisma.UserInclude
  ) {
    return await prisma.user.findUnique({
      where,
      include,
    });
  }

  public static async getAllUsers(
    page: number = 1,
    limit: number = 10,
    where?: Prisma.UserWhereInput,
    select?: Prisma.UserSelect,
    order?: Prisma.UserOrderByWithAggregationInput
  ) {
    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select,
      orderBy: order,
    });
    const total = await prisma.user.count({ where });
    return { users, total };
  }
  public static async findUsers(where: Prisma.UserWhereInput) {
    return await prisma.user.findMany({
      where,
      select: {
        id: true,
      },
    });
  }

  public static async updateUser(
    id: number,
    data: Prisma.UserUpdateInput,
    select?: Prisma.UserSelect
  ) {
    return await prisma.user.update({
      where: { id },
      data,
      select,
    });
  }
}
